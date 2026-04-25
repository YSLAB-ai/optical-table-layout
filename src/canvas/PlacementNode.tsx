import type Konva from 'konva'
import { Group, Rect, Text } from 'react-konva'

import { useStore } from '../store'
import type { Placement } from '../types'
import type { PlacementSummary } from '../utils/assembly'
import { mmToPx, snapToNearestHole } from '../utils/geometry'
import { isSecondaryContextMenuGesture } from './contextMenu'

interface Props {
  placement: Placement
  summary: PlacementSummary
  scale: number
  isSelected: boolean
  onSelect: () => void
  onHover: (clientX: number, clientY: number) => void
  onHoverEnd: () => void
  onContextMenu: (
    clientX: number,
    clientY: number,
    placementId: string,
  ) => void
}

export default function PlacementNode({
  placement,
  summary,
  scale,
  isSelected,
  onSelect,
  onHover,
  onHoverEnd,
  onContextMenu,
}: Props) {
  const movePlacement = useStore((state) => state.movePlacement)
  const table = useStore((state) => state.table)
  const activeTool = useStore((state) => state.activeTool)
  const { x, y, rotation, label } = placement
  const { widthMm, heightMm, color, kind } = summary

  const pxX = mmToPx(x, scale)
  const pxY = mmToPx(y, scale)
  const pxW = mmToPx(widthMm, scale)
  const pxH = mmToPx(heightMm, scale)

  const handleDragEnd = (event: Konva.KonvaEventObject<DragEvent>) => {
    const node = event.target
    const rawXMm = node.x() / scale
    const rawYMm = node.y() / scale
    const snap = snapToNearestHole(rawXMm, rawYMm, table, 15)

    if (snap) {
      movePlacement(placement.id, snap.x, snap.y, snap.col, snap.row)
      node.position({ x: mmToPx(snap.x, scale), y: mmToPx(snap.y, scale) })
      return
    }

    movePlacement(placement.id, rawXMm, rawYMm)
  }

  const handleSecondaryContextMenu = (nativeEvent: MouseEvent) => {
    nativeEvent.preventDefault()
    onContextMenu(nativeEvent.clientX, nativeEvent.clientY, placement.id)
  }

  return (
    <Group
      x={pxX}
      y={pxY}
      rotation={rotation}
      offsetX={pxW / 2}
      offsetY={pxH / 2}
      draggable={activeTool === 'select'}
      onClick={() => {
        if (activeTool === 'select') {
          onSelect()
        }
      }}
      onTap={() => {
        if (activeTool === 'select') {
          onSelect()
        }
      }}
      onMouseDown={(event) => {
        if (isSecondaryContextMenuGesture(event.evt)) {
          handleSecondaryContextMenu(event.evt)
        }
      }}
      onContextMenu={(event) => {
        handleSecondaryContextMenu(event.evt)
      }}
      onDragEnd={handleDragEnd}
      onMouseEnter={(event) => onHover(event.evt.clientX, event.evt.clientY)}
      onMouseMove={(event) => onHover(event.evt.clientX, event.evt.clientY)}
      onMouseLeave={onHoverEnd}
    >
      <Rect
        width={pxW}
        height={pxH}
        fill={color}
        stroke={isSelected ? '#ffffff' : kind === 'assembly' ? '#88c988' : '#7eb8f7'}
        dash={kind === 'assembly' ? [6, 4] : undefined}
        strokeWidth={isSelected ? 2 : 1.25}
        cornerRadius={2}
        shadowColor={isSelected ? '#7eb8f7' : undefined}
        shadowBlur={isSelected ? 8 : 0}
        shadowOpacity={0.8}
      />
      <Text
        text={kind === 'assembly' ? `[ASM] ${label}` : label}
        width={pxW}
        height={pxH}
        align="center"
        verticalAlign="middle"
        fontSize={Math.max(8, Math.min(11, pxW / 5))}
        fill="#d0d6ea"
        listening={false}
      />
    </Group>
  )
}
