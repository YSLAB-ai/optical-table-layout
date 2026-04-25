import { useEffect, useRef, useState, type DragEvent } from 'react'
import type Konva from 'konva'
import { Layer, Rect, Stage } from 'react-konva'

import ConvertToAssemblyModal from '../modals/ConvertToAssemblyModal'
import DrawComponentModal from '../modals/DrawComponentModal'
import { useStore } from '../store'
import type { Component, Placement } from '../types'
import {
  canConvertHoleStackToAssembly,
  type PlacementSummary,
} from '../utils/assembly'
import { resolveDroppedCatalogComponent } from '../utils/catalogIndex'
import {
  buildDrawnComponent,
  finalizeBeamDraft,
  getBeamDraftKeyAction,
  getDrawDraftMetrics,
  resolveBeamDraftPoint,
  shouldCaptureBeamPointFromTargetName,
} from '../utils/canvasTools'
import { mmToPx, pxToMm, snapToNearestHole } from '../utils/geometry'
import BeamLayer from './BeamLayer'
import HoleGrid from './HoleGrid'
import HoverCard from './HoverCard'
import PlacementLayer from './PlacementLayer'
import TableSurface from './TableSurface'
import { useZoomPan } from './useZoomPan'

const BASE_SCALE = 0.65

export default function TableCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage | null>(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [draftBeamPoints, setDraftBeamPoints] = useState<{ x: number; y: number }[]>(
    [],
  )
  const [beamPreviewPoint, setBeamPreviewPoint] = useState<{
    x: number
    y: number
  } | null>(null)
  const [drawDraft, setDrawDraft] = useState<{
    start: { x: number; y: number }
    end: { x: number; y: number }
  } | null>(null)
  const [pendingDrawPlacement, setPendingDrawPlacement] = useState<{
    x: number
    y: number
    widthMm: number
    heightMm: number
  } | null>(null)
  const [hoveredPlacement, setHoveredPlacement] = useState<{
    summary: PlacementSummary
    x: number
    y: number
  } | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    placementId: string
  } | null>(null)
  const [pendingAssemblyPlacementId, setPendingAssemblyPlacementId] = useState<
    string | null
  >(null)
  const table = useStore((state) => state.table)
  const addPlacement = useStore((state) => state.addPlacement)
  const addComponent = useStore((state) => state.addComponent)
  const addBeamPath = useStore((state) => state.addBeamPath)
  const beamPaths = useStore((state) => state.beamPaths)
  const assemblies = useStore((state) => state.assemblies)
  const components = useStore((state) => state.components)
  const placements = useStore((state) => state.placements)
  const convertHoleStackToAssembly = useStore(
    (state) => state.convertHoleStackToAssembly,
  )
  const setSelected = useStore((state) => state.setSelected)
  const activeTool = useStore((state) => state.activeTool)
  const setActiveTool = useStore((state) => state.setActiveTool)
  const setStagePngExporter = useStore((state) => state.setStagePngExporter)
  const { transform, handleWheel, handleDragEnd } = useZoomPan(1)

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return undefined
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]

      if (!entry) {
        return
      }

      const { width, height } = entry.contentRect
      setSize({ width, height })
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handleToolChange = (event: Event) => {
      const customEvent = event as CustomEvent<'select' | 'draw' | 'beam'>

      if (customEvent.detail !== 'beam') {
        setDraftBeamPoints([])
        setBeamPreviewPoint(null)
      }

      if (customEvent.detail !== 'draw') {
        setDrawDraft(null)
        setPendingDrawPlacement(null)
      }

      if (customEvent.detail !== 'select') {
        setContextMenu(null)
        setPendingAssemblyPlacementId(null)
      }
    }

    window.addEventListener('opticslayout:tool-change', handleToolChange)
    return () =>
      window.removeEventListener('opticslayout:tool-change', handleToolChange)
  }, [])

  useEffect(() => {
    setStagePngExporter(() => stageRef.current?.toDataURL({ pixelRatio: 2 }) ?? null)

    return () => {
      setStagePngExporter(null)
    }
  }, [setStagePngExporter])

  useEffect(() => {
    if (activeTool !== 'beam') {
      return undefined
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const action = getBeamDraftKeyAction(event.key, draftBeamPoints)

      if (!action) {
        return
      }

      event.preventDefault()

      if (action === 'cancel') {
        setDraftBeamPoints([])
        setBeamPreviewPoint(null)
        return
      }

      const beamPath = finalizeBeamDraft(draftBeamPoints, beamPaths.length)

      if (!beamPath) {
        setDraftBeamPoints([])
        setBeamPreviewPoint(null)
        return
      }

      addBeamPath(beamPath)
      setSelected(beamPath.id, 'beam')
      setDraftBeamPoints([])
      setBeamPreviewPoint(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTool, addBeamPath, beamPaths.length, draftBeamPoints, setSelected])

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const componentId = event.dataTransfer.getData('componentId')
    const componentJson = event.dataTransfer.getData('componentJson')
    const assemblyId = event.dataTransfer.getData('assemblyId')
    const assemblyName = event.dataTransfer.getData('assemblyName')
    const container = containerRef.current

    if ((!componentId && !componentJson && !assemblyId) || !container) {
      return
    }

    if (activeTool !== 'select') {
      return
    }

    const rect = container.getBoundingClientRect()
    const screenX = event.clientX - rect.left
    const screenY = event.clientY - rect.top
    const stageX = (screenX - transform.x) / transform.scale
    const stageY = (screenY - transform.y) / transform.scale
    const cursorXMm = pxToMm(stageX, BASE_SCALE)
    const cursorYMm = pxToMm(stageY, BASE_SCALE)
    const snap = snapToNearestHole(cursorXMm, cursorYMm, table, 15)
    const existingComponent = componentId
      ? components.find((candidate) => candidate.id === componentId)
      : null
    const droppedComponent =
      !existingComponent && componentJson
        ? (JSON.parse(componentJson) as Component)
        : null
    const resolvedComponent = droppedComponent
      ? resolveDroppedCatalogComponent(components, droppedComponent)
      : null

    if (!componentId && !componentJson && !assemblyId) {
      return
    }

    if (resolvedComponent?.shouldAddToStore) {
      addComponent(resolvedComponent.component)
    }

    const component = existingComponent ?? resolvedComponent?.component ?? null

    const placement: Placement = {
      id: crypto.randomUUID(),
      type: assemblyId ? 'assembly' : 'component',
      refId: assemblyId || component?.id || componentId,
      x: snap ? snap.x : cursorXMm,
      y: snap ? snap.y : cursorYMm,
      holeCol: snap?.col,
      holeRow: snap?.row,
      rotation: 0,
      label: component?.partNumber ?? assemblyName ?? 'Assembly',
    }

    addPlacement(placement)
    setSelected(placement.id, 'placement')
  }

  const getPointerMm = (
    stage: Konva.Stage,
  ): { x: number; y: number } | null => {
    const pointer = stage.getPointerPosition()

    if (!pointer) {
      return null
    }

    const stageX = (pointer.x - transform.x) / transform.scale
    const stageY = (pointer.y - transform.y) / transform.scale

    return {
      x: pxToMm(stageX, BASE_SCALE),
      y: pxToMm(stageY, BASE_SCALE),
    }
  }

  const handleStageClick = (
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    const stage = event.target.getStage()
    const targetName = event.target.name()

    setContextMenu(null)

    if (
      stage &&
      shouldCaptureBeamPointFromTargetName(activeTool, targetName)
    ) {
      const point = getPointerMm(stage)

      if (!point) {
        return
      }

      setDraftBeamPoints((current) => [
        ...current,
        resolveBeamDraftPoint(current, point, table),
      ])
      return
    }

    if (event.target === event.target.getStage()) {
      setSelected(null, null)
      setHoveredPlacement(null)
    }
  }

  const handleStageDoubleClick = (
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    if (activeTool !== 'beam') {
      return
    }

    event.evt.preventDefault()

    const beamPath = finalizeBeamDraft(draftBeamPoints, beamPaths.length)

    if (!beamPath) {
      setDraftBeamPoints([])
      setBeamPreviewPoint(null)
      return
    }

    addBeamPath(beamPath)
    setSelected(beamPath.id, 'beam')
    setDraftBeamPoints([])
    setBeamPreviewPoint(null)
  }

  const handlePointerDown = (
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    setContextMenu(null)

    if (activeTool !== 'draw') {
      return
    }

    const stage = event.target.getStage()

    if (!stage || event.target !== stage) {
      return
    }

    const point = getPointerMm(stage)

    if (!point) {
      return
    }

    setDrawDraft({
      start: point,
      end: point,
    })
    setSelected(null, null)
  }

  const handlePointerMove = (
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    const stage = event.target.getStage()

    if (!stage) {
      return
    }

    const point = getPointerMm(stage)

    if (!point) {
      return
    }

    if (activeTool === 'beam' && draftBeamPoints.length > 0) {
      setBeamPreviewPoint(resolveBeamDraftPoint(draftBeamPoints, point, table))
    }

    if (activeTool === 'draw' && drawDraft) {
      setDrawDraft((current) =>
        current
          ? {
              ...current,
              end: point,
            }
          : current,
      )
    }
  }

  const handlePointerUp = () => {
    if (activeTool !== 'draw' || !drawDraft) {
      return
    }

    const metrics = getDrawDraftMetrics(drawDraft.start, drawDraft.end)
    setDrawDraft(null)

    if (metrics.widthMm < 2 || metrics.heightMm < 2) {
      return
    }

    setPendingDrawPlacement({
      x: metrics.centerX,
      y: metrics.centerY,
      widthMm: metrics.widthMm,
      heightMm: metrics.heightMm,
    })
  }

  const handleHoverChange = (
    payload:
      | {
          summary: PlacementSummary
          clientX: number
          clientY: number
        }
      | null,
  ) => {
    const container = containerRef.current

    if (!container || !payload) {
      setHoveredPlacement(null)
      return
    }

    const rect = container.getBoundingClientRect()

    setHoveredPlacement({
      summary: payload.summary,
      x: payload.clientX - rect.left + 12,
      y: payload.clientY - rect.top + 12,
    })
  }

  const handlePlacementContextMenu = ({
    clientX,
    clientY,
    placementId,
  }: {
    clientX: number
    clientY: number
    placementId: string
  }) => {
    if (activeTool !== 'select') {
      return
    }

    if (!canConvertHoleStackToAssembly(placements, placementId)) {
      setContextMenu(null)
      return
    }

    const container = containerRef.current

    if (!container) {
      return
    }

    const rect = container.getBoundingClientRect()
    setSelected(placementId, 'placement')
    setContextMenu({
      placementId,
      x: clientX - rect.left + 8,
      y: clientY - rect.top + 8,
    })
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full"
      onContextMenu={(event) => {
        if (activeTool === 'select') {
          event.preventDefault()
        }
      }}
      onDragOver={(event) => {
        if (activeTool === 'select') {
          event.preventDefault()
        }
      }}
      onDrop={handleDrop}
    >
      {pendingDrawPlacement ? (
        <DrawComponentModal
          initialWidthMm={pendingDrawPlacement.widthMm}
          initialHeightMm={pendingDrawPlacement.heightMm}
          onClose={() => {
            setPendingDrawPlacement(null)
            setActiveTool('select')
          }}
          onSave={(input) => {
            const component: Component = buildDrawnComponent({
              id: crypto.randomUUID(),
              name: input.name,
              partNumber: input.partNumber,
              widthMm: input.widthMm,
              heightMm: input.heightMm,
              color: input.color,
              priceCents: input.priceCents,
              notes: input.notes,
            })

            addComponent(component)
            const placement: Placement = {
              id: crypto.randomUUID(),
              type: 'component',
              refId: component.id,
              x: pendingDrawPlacement.x,
              y: pendingDrawPlacement.y,
              rotation: 0,
              label: component.partNumber,
            }

            addPlacement(placement)
            setSelected(placement.id, 'placement')
            setPendingDrawPlacement(null)
            setActiveTool('select')
          }}
        />
      ) : null}
      {pendingAssemblyPlacementId ? (
        <ConvertToAssemblyModal
          defaultName={`Assembly ${assemblies.length + 1}`}
          onCancel={() => setPendingAssemblyPlacementId(null)}
          onConfirm={(name) => {
            convertHoleStackToAssembly(pendingAssemblyPlacementId, name)
            setPendingAssemblyPlacementId(null)
            setContextMenu(null)
          }}
        />
      ) : null}
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded border border-[#2a3248] bg-[#101524]/90 px-3 py-2 text-[10px] text-[#94a4c6] backdrop-blur">
        <div className="font-semibold text-[#c9d5f2]">
          {activeTool === 'select'
            ? 'Select Mode'
            : activeTool === 'draw'
              ? 'Draw Mode'
              : 'Beam Mode'}
        </div>
        {activeTool === 'select' ? (
          <>
            <div>Drag parts or assemblies from the library onto the table.</div>
            <div>Scroll to zoom and drag empty canvas to pan.</div>
          </>
        ) : activeTool === 'draw' ? (
          <>
            <div>Click and drag on empty table space to sketch a component.</div>
            <div>Release to confirm the new custom part.</div>
          </>
        ) : (
          <>
            <div>Click to add hole-anchored beam points and bends.</div>
            <div>Press Return, Esc, or double-click to finish the beam.</div>
          </>
        )}
      </div>
      {contextMenu ? (
        <div
          className="absolute z-30 min-w-36 rounded border border-[#32405c] bg-[#111827]/95 p-1 text-[11px] text-[#d0d6ea] shadow-xl backdrop-blur"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            className="w-full rounded px-3 py-2 text-left transition-colors hover:bg-[#1d2738]"
            onClick={() => {
              setPendingAssemblyPlacementId(contextMenu.placementId)
              setContextMenu(null)
            }}
          >
            Make Assembly
          </button>
        </div>
      ) : null}
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={transform.scale}
        scaleY={transform.scale}
        x={transform.x}
        y={transform.y}
        draggable={activeTool === 'select'}
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onDblClick={handleStageDoubleClick}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        onMouseMove={handlePointerMove}
        onTouchMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchEnd={handlePointerUp}
      >
        <Layer>
          <TableSurface table={table} scale={BASE_SCALE} />
          <HoleGrid table={table} scale={BASE_SCALE} zoom={transform.scale} />
        </Layer>
        {drawDraft ? (
          <Layer>
            <Rect
              x={mmToPx(
                Math.min(drawDraft.start.x, drawDraft.end.x),
                BASE_SCALE,
              )}
              y={mmToPx(
                Math.min(drawDraft.start.y, drawDraft.end.y),
                BASE_SCALE,
              )}
              width={mmToPx(
                Math.abs(drawDraft.end.x - drawDraft.start.x),
                BASE_SCALE,
              )}
              height={mmToPx(
                Math.abs(drawDraft.end.y - drawDraft.start.y),
                BASE_SCALE,
              )}
              fill="rgba(126, 184, 247, 0.18)"
              stroke="#7eb8f7"
              dash={[8, 5]}
            />
          </Layer>
        ) : null}
        <PlacementLayer
          scale={BASE_SCALE}
          onHoverChange={handleHoverChange}
          onContextMenu={handlePlacementContextMenu}
        />
        <BeamLayer
          scale={BASE_SCALE}
          draftPoints={draftBeamPoints}
          previewPoint={beamPreviewPoint}
        />
      </Stage>
      {hoveredPlacement ? (
        <HoverCard
          summary={hoveredPlacement.summary}
          x={hoveredPlacement.x}
          y={hoveredPlacement.y}
        />
      ) : null}
    </div>
  )
}
