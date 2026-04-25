import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

import { COHERENT_CATALOG } from '../data/coherent'
import { GENERATED_VENDOR_SNAPSHOT } from '../data/generated/vendorSnapshot'
import { LIGHT_CONVERSION_CATALOG } from '../data/lightConversion'
import { NEWPORT_CATALOG } from '../data/newport'
import { THORLABS_CATALOG } from '../data/thorlabs'
import type {
  Assembly,
  BeamPath,
  Component,
  LayoutState,
  Placement,
  TableConfig,
} from '../types'
import { DEFAULT_TABLE_CONFIG } from '../types'
import { debouncedSave, loadLayout } from '../utils/autosave'
import {
  buildAssemblyItemsFromPlacements,
  getSameHoleComponentPlacements,
} from '../utils/assembly'
import { normalizeComponent, relinkLayoutToCatalog } from '../utils/catalog'

const BUILT_IN_COMPONENTS = [
  ...THORLABS_CATALOG,
  ...NEWPORT_CATALOG,
  ...COHERENT_CATALOG,
  ...LIGHT_CONVERSION_CATALOG,
  ...GENERATED_VENDOR_SNAPSHOT,
]
const NORMALIZED_BUILT_IN_COMPONENTS = BUILT_IN_COMPONENTS.map(normalizeComponent)
export const BUILT_IN_COMPONENT_CATALOG_KEYS = new Set(
  NORMALIZED_BUILT_IN_COMPONENTS
    .map((component) => component.source.catalogKey)
    .filter((catalogKey): catalogKey is string => Boolean(catalogKey)),
)
const saved = loadLayout()
const savedLayout = saved
  ? relinkLayoutToCatalog(saved, NORMALIZED_BUILT_IN_COMPONENTS)
  : null

function dedupeCatalogComponents(catalogComponents: Component[]): Component[] {
  return catalogComponents
    .map(normalizeComponent)
    .reduce<Component[]>((deduped, component) => {
      const identity = component.source.catalogKey ?? component.id
      const existingIndex = deduped.findIndex(
        (candidate) => (candidate.source.catalogKey ?? candidate.id) === identity,
      )

      if (existingIndex === -1) {
        deduped.push(component)
        return deduped
      }

      if (component.source.kind === 'snapshot') {
        deduped[existingIndex] = component
      }

      return deduped
    }, [])
}

function mergeCatalogAndUserComponents({
  catalogComponents,
  userComponents,
}: {
  catalogComponents: Component[]
  userComponents: Component[]
}): Component[] {
  const normalizedCatalog = dedupeCatalogComponents(catalogComponents)
  const catalogComponentIds = new Set(normalizedCatalog.map((component) => component.id))
  const dedupedUserComponents = userComponents
    .map(normalizeComponent)
    .filter(
      (component) =>
        !component.isBuiltIn &&
        !catalogComponentIds.has(component.id),
    )

  return [...normalizedCatalog, ...dedupedUserComponents]
}

function collectReferencedComponentIds(
  placements: Placement[],
  assemblies: Assembly[],
): Set<string> {
  const referencedComponentIds = new Set<string>()

  for (const placement of placements) {
    if (placement.type === 'component') {
      referencedComponentIds.add(placement.refId)
    }
  }

  for (const assembly of assemblies) {
    for (const item of assembly.items) {
      if (item.type === 'component') {
        referencedComponentIds.add(item.refId)
      }
    }
  }

  return referencedComponentIds
}

export function hasPublishedCatalogHydrationTargets(
  components: Component[],
): boolean {
  return components.some((component) => {
    const catalogKey = component.source.catalogKey

    return (
      component.supplier !== 'Custom' &&
      component.source.kind !== 'drawn' &&
      typeof catalogKey === 'string' &&
      !BUILT_IN_COMPONENT_CATALOG_KEYS.has(catalogKey)
    )
  })
}

export function serializeLayoutForPersistence(
  state: Pick<
    AppState,
    'table' | 'components' | 'assemblies' | 'placements' | 'beamPaths'
  >,
): LayoutState {
  const referencedComponentIds = collectReferencedComponentIds(
    state.placements,
    state.assemblies,
  )

  return {
    version: 1,
    table: state.table,
    components: state.components.filter(
      (component) => !component.isBuiltIn || referencedComponentIds.has(component.id),
    ),
    assemblies: state.assemblies,
    placements: state.placements,
    beamPaths: state.beamPaths,
  }
}

export interface AppState {
  table: TableConfig
  setTable: (config: TableConfig) => void

  components: Component[]
  addComponent: (component: Component) => void
  updateComponent: (id: string, patch: Partial<Component>) => void
  hydratePublishedCatalogIndex: (components: Component[]) => void

  assemblies: Assembly[]
  addAssembly: (assembly: Assembly) => void
  updateAssembly: (id: string, patch: Partial<Assembly>) => void
  removeAssembly: (id: string) => void
  convertHoleStackToAssembly: (placementId: string, name: string) => void

  placements: Placement[]
  addPlacement: (placement: Placement) => void
  movePlacement: (
    id: string,
    x: number,
    y: number,
    holeCol?: number,
    holeRow?: number,
  ) => void
  rotatePlacement: (id: string, rotation: number) => void
  removePlacement: (id: string) => void

  beamPaths: BeamPath[]
  addBeamPath: (beamPath: BeamPath) => void
  updateBeamPath: (id: string, patch: Partial<BeamPath>) => void
  removeBeamPath: (id: string) => void

  selectedId: string | null
  selectedType: 'placement' | 'beam' | null
  activeTool: 'select' | 'draw' | 'beam'
  showTableConfig: boolean
  exportStagePng: (() => string | null) | null

  setSelected: (id: string | null, type: 'placement' | 'beam' | null) => void
  setActiveTool: (tool: 'select' | 'draw' | 'beam') => void
  setShowTableConfig: (show: boolean) => void
  setStagePngExporter: (exporter: (() => string | null) | null) => void
  showBomDrawer: boolean
  setShowBomDrawer: (show: boolean) => void
  deleteSelected: () => void
  replaceLayout: (layout: LayoutState) => void
}

export const useStore = create<AppState>()(
  subscribeWithSelector((set) => ({
    table: savedLayout?.table ?? DEFAULT_TABLE_CONFIG,
    setTable: (config) => set({ table: config }),

    components: mergeCatalogAndUserComponents({
      catalogComponents: NORMALIZED_BUILT_IN_COMPONENTS,
      userComponents: savedLayout?.components ?? [],
    }),
    addComponent: (component) =>
      set((state) => ({
        components: [...state.components, normalizeComponent(component)],
      })),
    updateComponent: (id, patch) =>
      set((state) => ({
        components: state.components.map((component) =>
          component.id === id
            ? normalizeComponent({ ...component, ...patch })
            : component,
        ),
      })),
    hydratePublishedCatalogIndex: (publishedComponents) =>
      set((state) => {
        const normalizedPublished = publishedComponents.map(normalizeComponent)
        const availableCatalog = dedupeCatalogComponents([
          ...NORMALIZED_BUILT_IN_COMPONENTS,
          ...normalizedPublished,
        ])
        const relinkedLayout = relinkLayoutToCatalog(
          {
            version: 1,
            table: state.table,
            components: state.components,
            assemblies: state.assemblies,
            placements: state.placements,
            beamPaths: state.beamPaths,
          },
          availableCatalog,
        )
        const referencedComponentIds = collectReferencedComponentIds(
          relinkedLayout.placements,
          relinkedLayout.assemblies,
        )
        const catalogComponentsInUse = availableCatalog.filter((component) =>
          referencedComponentIds.has(component.id),
        )

        return {
          table: relinkedLayout.table,
          components: mergeCatalogAndUserComponents({
            catalogComponents: [
              ...NORMALIZED_BUILT_IN_COMPONENTS,
              ...catalogComponentsInUse,
            ],
            userComponents: relinkedLayout.components,
          }),
          assemblies: relinkedLayout.assemblies,
          placements: relinkedLayout.placements,
          beamPaths: relinkedLayout.beamPaths,
        }
      }),

    assemblies: savedLayout?.assemblies ?? [],
    addAssembly: (assembly) =>
      set((state) => ({ assemblies: [...state.assemblies, assembly] })),
    updateAssembly: (id, patch) =>
      set((state) => ({
        assemblies: state.assemblies.map((assembly) =>
          assembly.id === id ? { ...assembly, ...patch } : assembly,
        ),
      })),
    removeAssembly: (id) =>
      set((state) => ({
        assemblies: state.assemblies.filter((assembly) => assembly.id !== id),
      })),
    convertHoleStackToAssembly: (placementId, name) =>
      set((state) => {
        const stackedPlacements = getSameHoleComponentPlacements(
          placementId,
          state.placements,
        )
        const anchor = stackedPlacements[0]
        const trimmedName = name.trim()

        if (!anchor || stackedPlacements.length < 2 || !trimmedName) {
          return state
        }

        const assembly: Assembly = {
          id: crypto.randomUUID(),
          name: trimmedName,
          notes: '',
          items: buildAssemblyItemsFromPlacements(stackedPlacements),
        }

        const replacementPlacement: Placement = {
          id: crypto.randomUUID(),
          type: 'assembly',
          refId: assembly.id,
          x: anchor.x,
          y: anchor.y,
          holeCol: anchor.holeCol,
          holeRow: anchor.holeRow,
          rotation: 0,
          label: assembly.name,
        }

        return {
          assemblies: [...state.assemblies, assembly],
          placements: [
            ...state.placements.filter(
              (placement) =>
                !stackedPlacements.some((stacked) => stacked.id === placement.id),
            ),
            replacementPlacement,
          ],
          selectedId: replacementPlacement.id,
          selectedType: 'placement',
        }
      }),

    placements: savedLayout?.placements ?? [],
    addPlacement: (placement) =>
      set((state) => ({ placements: [...state.placements, placement] })),
    movePlacement: (id, x, y, holeCol, holeRow) =>
      set((state) => ({
        placements: state.placements.map((placement) =>
          placement.id === id
            ? { ...placement, x, y, holeCol, holeRow }
            : placement,
        ),
      })),
    rotatePlacement: (id, rotation) =>
      set((state) => ({
        placements: state.placements.map((placement) =>
          placement.id === id ? { ...placement, rotation } : placement,
        ),
      })),
    removePlacement: (id) =>
      set((state) => ({
        placements: state.placements.filter((placement) => placement.id !== id),
      })),

    beamPaths: savedLayout?.beamPaths ?? [],
    addBeamPath: (beamPath) =>
      set((state) => ({ beamPaths: [...state.beamPaths, beamPath] })),
    updateBeamPath: (id, patch) =>
      set((state) => ({
        beamPaths: state.beamPaths.map((beamPath) =>
          beamPath.id === id ? { ...beamPath, ...patch } : beamPath,
        ),
      })),
    removeBeamPath: (id) =>
      set((state) => ({
        beamPaths: state.beamPaths.filter((beamPath) => beamPath.id !== id),
      })),

    selectedId: null,
    selectedType: null,
    activeTool: 'select',
    showTableConfig: !savedLayout,
    exportStagePng: null,
    showBomDrawer: false,

    setSelected: (id, type) => set({ selectedId: id, selectedType: type }),
    setActiveTool: (tool) => set({ activeTool: tool }),
    setShowTableConfig: (show) => set({ showTableConfig: show }),
    setStagePngExporter: (exporter) => set({ exportStagePng: exporter }),
    setShowBomDrawer: (show) => set({ showBomDrawer: show }),
    deleteSelected: () =>
      set((state) => {
        if (!state.selectedId || !state.selectedType) {
          return state
        }

        if (state.selectedType === 'placement') {
          return {
            placements: state.placements.filter(
              (placement) => placement.id !== state.selectedId,
            ),
            selectedId: null,
            selectedType: null,
          }
        }

        return {
          beamPaths: state.beamPaths.filter(
            (beam) => beam.id !== state.selectedId,
          ),
          selectedId: null,
          selectedType: null,
        }
      }),
    replaceLayout: (layout) =>
      set(() => {
        const relinkedLayout = relinkLayoutToCatalog(
          layout,
          NORMALIZED_BUILT_IN_COMPONENTS,
        )

        return {
          table: relinkedLayout.table,
          components: mergeCatalogAndUserComponents({
            catalogComponents: NORMALIZED_BUILT_IN_COMPONENTS,
            userComponents: relinkedLayout.components,
          }),
          assemblies: relinkedLayout.assemblies,
          placements: relinkedLayout.placements,
          beamPaths: relinkedLayout.beamPaths,
          selectedId: null,
          selectedType: null,
          activeTool: 'select',
          showTableConfig: false,
          showBomDrawer: false,
        }
      }),
  })),
)

useStore.subscribe(
  (state) =>
    JSON.stringify(
      serializeLayoutForPersistence({
        table: state.table,
        components: state.components,
        assemblies: state.assemblies,
        placements: state.placements,
        beamPaths: state.beamPaths,
      }),
    ),
  (serializedLayout) => {
    debouncedSave(JSON.parse(serializedLayout) as LayoutState)
  },
)
