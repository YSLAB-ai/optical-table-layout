import { beforeEach, describe, expect, it } from 'vitest'

import type { BeamPath, Placement } from '../types'
import { buildCatalogKey } from '../utils/catalog'
import { serializeLayoutForPersistence, useStore } from './index'

function resetStore() {
  useStore.setState({
    ...useStore.getInitialState(),
    placements: [],
    beamPaths: [],
    assemblies: [],
    selectedId: null,
    selectedType: null,
    showBomDrawer: false,
  })
}

describe('store actions', () => {
  beforeEach(() => {
    resetStore()
  })

  it('deleteSelected removes a selected placement and clears selection', () => {
    const placement: Placement = {
      id: 'p1',
      type: 'component',
      refId: useStore.getState().components[0]!.id,
      x: 25,
      y: 25,
      rotation: 0,
      label: 'part',
    }

    useStore.setState({
      placements: [placement],
      selectedId: placement.id,
      selectedType: 'placement',
    })

    useStore.getState().deleteSelected()

    expect(useStore.getState().placements).toEqual([])
    expect(useStore.getState().selectedId).toBeNull()
    expect(useStore.getState().selectedType).toBeNull()
  })

  it('deleteSelected removes a selected beam and clears selection', () => {
    const beam: BeamPath = {
      id: 'beam-1',
      label: 'pump',
      wavelengthNm: 532,
      color: '#00ff44',
      lineStyle: 'solid',
      polarization: 'H',
      powerMw: 10,
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
    }

    useStore.setState({
      beamPaths: [beam],
      selectedId: beam.id,
      selectedType: 'beam',
    })

    useStore.getState().deleteSelected()

    expect(useStore.getState().beamPaths).toEqual([])
    expect(useStore.getState().selectedId).toBeNull()
    expect(useStore.getState().selectedType).toBeNull()
  })

  it('tracks whether the BOM drawer is expanded', () => {
    expect(useStore.getState().showBomDrawer).toBe(false)

    useStore.getState().setShowBomDrawer(true)
    expect(useStore.getState().showBomDrawer).toBe(true)

    useStore.getState().setShowBomDrawer(false)
    expect(useStore.getState().showBomDrawer).toBe(false)
  })

  it('replaces stacked component placements with a new assembly placement', () => {
    const firstComponent = useStore.getState().components[0]
    const secondComponent = useStore.getState().components[1]

    expect(firstComponent).toBeDefined()
    expect(secondComponent).toBeDefined()

    useStore.setState({
      placements: [
        {
          id: 'p1',
          type: 'component',
          refId: firstComponent!.id,
          x: 25,
          y: 25,
          holeCol: 0,
          holeRow: 0,
          rotation: 0,
          label: firstComponent!.partNumber,
        },
        {
          id: 'p2',
          type: 'component',
          refId: secondComponent!.id,
          x: 25,
          y: 25,
          holeCol: 0,
          holeRow: 0,
          rotation: 0,
          label: secondComponent!.partNumber,
        },
      ],
      assemblies: [],
      selectedId: null,
      selectedType: null,
    })

    useStore.getState().convertHoleStackToAssembly('p1', 'Mirror Stack')

    const state = useStore.getState()

    expect(state.assemblies).toHaveLength(1)
    expect(state.assemblies[0]).toMatchObject({
      name: 'Mirror Stack',
      items: [
        { type: 'component', refId: firstComponent!.id, quantity: 1 },
        { type: 'component', refId: secondComponent!.id, quantity: 1 },
      ],
    })
    expect(state.placements).toHaveLength(1)
    expect(state.placements[0]).toMatchObject({
      type: 'assembly',
      refId: state.assemblies[0]?.id,
      x: 25,
      y: 25,
      holeCol: 0,
      holeRow: 0,
      label: 'Mirror Stack',
    })
    expect(state.selectedId).toBe(state.placements[0]?.id)
    expect(state.selectedType).toBe('placement')
  })

  it('merges generated snapshot components into the built-in catalog without duplicate ids', () => {
    const state = useStore.getState()
    const ids = state.components.map((component) => component.id)
    const catalogKeys = state.components
      .map((component) => component.source.catalogKey)
      .filter((catalogKey): catalogKey is string => Boolean(catalogKey))
    const monacoMatches = state.components.filter(
      (component) => component.partNumber === 'MONACO',
    )

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(catalogKeys).size).toBe(catalogKeys.length)
    expect(
      state.components.some((component) => component.source.kind === 'snapshot'),
    ).toBe(true)
    expect(monacoMatches).toHaveLength(1)
    expect(monacoMatches[0]?.source.kind).toBe('snapshot')
  })

  it('relinks a saved catalog-linked component to the current built-in catalog entry', () => {
    const currentComponent = useStore
      .getState()
      .components.find((component) => component.partNumber === 'POLARIS-K1E3')

    expect(currentComponent).toBeDefined()

    useStore.getState().replaceLayout({
      version: 1,
      table: useStore.getState().table,
      components: [
        {
          ...currentComponent!,
          id: 'saved-component-1',
          isBuiltIn: false,
          priceCents: 19900,
          source: {
            ...currentComponent!.source,
            kind: 'imported',
            catalogKey: buildCatalogKey('Thorlabs', 'POLARIS-K1E3'),
          },
        },
      ],
      assemblies: [],
      placements: [
        {
          id: 'p1',
          type: 'component',
          refId: 'saved-component-1',
          x: 25,
          y: 25,
          rotation: 0,
          label: 'POLARIS-K1E3',
        },
      ],
      beamPaths: [],
    })

    const state = useStore.getState()

    expect(state.placements[0]?.refId).toBe(currentComponent?.id)
    expect(
      state.components.some((component) => component.id === 'saved-component-1'),
    ).toBe(false)
  })

  it('hydrates published catalog entries so saved index-only parts relink to the latest catalog record', () => {
    useStore.setState({
      components: [
        {
          id: 'saved-km200',
          partNumber: 'KM200',
          name: '2" Kinematic Mirror Mount',
          supplier: 'Thorlabs',
          category: 'Mirror Mounts',
          widthMm: 64,
          heightMm: 64,
          anchorOffsetX: 0,
          anchorOffsetY: 0,
          color: '#2a1a3a',
          url: 'https://www.thorlabs.com/thorproduct.cfm?partnumber=KM200',
          priceCents: 19900,
          notes: '',
          specs: {},
          source: {
            kind: 'imported',
            vendor: 'Thorlabs',
            catalogKey: buildCatalogKey('Thorlabs', 'KM200'),
          },
          reviewStatus: 'needs_review',
          isBuiltIn: false,
        },
      ],
      placements: [
        {
          id: 'p1',
          type: 'component',
          refId: 'saved-km200',
          x: 25,
          y: 25,
          rotation: 0,
          label: 'KM200',
        },
      ],
      assemblies: [],
      beamPaths: [],
      selectedId: null,
      selectedType: null,
    })

    useStore.getState().hydratePublishedCatalogIndex([
      {
        id: 'snapshot-thorlabs-km200',
        partNumber: 'KM200',
        name: '2" Kinematic Mirror Mount',
        supplier: 'Thorlabs',
        category: 'Mirror Mounts',
        widthMm: 64,
        heightMm: 64,
        anchorOffsetX: 0,
        anchorOffsetY: 0,
        color: '#2a1a3a',
        url: 'https://www.thorlabs.com/thorproduct.cfm?partnumber=KM200',
        priceCents: 28400,
        notes: '',
        specs: {},
        source: {
          kind: 'snapshot',
          vendor: 'Thorlabs',
          catalogKey: buildCatalogKey('Thorlabs', 'KM200'),
        },
        reviewStatus: 'published',
        isBuiltIn: true,
      },
    ])

    const state = useStore.getState()
    const refreshed = state.components.find(
      (component) => component.partNumber === 'KM200',
    )

    expect(state.placements[0]?.refId).toBe('snapshot-thorlabs-km200')
    expect(refreshed?.priceCents).toBe(28400)
    expect(
      state.components.some((component) => component.id === 'saved-km200'),
    ).toBe(false)
  })

  it('serializes referenced catalog components so saved layouts can be relinked later', () => {
    const currentComponent = useStore
      .getState()
      .components.find((component) => component.partNumber === 'POLARIS-K1E3')
    const unrelatedComponent = useStore
      .getState()
      .components.find((component) => component.partNumber === 'MONACO')

    expect(currentComponent).toBeDefined()
    expect(unrelatedComponent).toBeDefined()

    useStore.setState({
      components: [currentComponent!, unrelatedComponent!],
      placements: [
        {
          id: 'p1',
          type: 'component',
          refId: currentComponent!.id,
          x: 25,
          y: 25,
          rotation: 0,
          label: currentComponent!.partNumber,
        },
      ],
      assemblies: [],
      beamPaths: [],
    })

    const serialized = serializeLayoutForPersistence(useStore.getState())

    expect(serialized.components).toHaveLength(1)
    expect(serialized.components[0]?.id).toBe(currentComponent?.id)
    expect(serialized.components[0]?.source.catalogKey).toBe(
      buildCatalogKey('Thorlabs', 'POLARIS-K1E3'),
    )
  })

  it('serializes unplaced user library components so imported parts persist across reloads', () => {
    useStore.setState({
      components: [
        ...useStore.getState().components,
        {
          id: 'imported-km100-user',
          partNumber: 'KM100-USER',
          name: 'Imported KM100 User Variant',
          supplier: 'Thorlabs',
          category: 'Mirror Mounts',
          widthMm: 38,
          heightMm: 38,
          anchorOffsetX: 0,
          anchorOffsetY: 0,
          color: '#2a1a3a',
          url: 'https://www.thorlabs.com/newgrouppage9.cfm?pn=KM100-USER',
          priceCents: 1000,
          notes: 'Imported from product link.',
          specs: {},
          source: {
            kind: 'imported',
            vendor: 'Thorlabs',
            catalogKey: buildCatalogKey('Thorlabs', 'KM100-USER'),
          },
          reviewStatus: 'needs_review',
          isBuiltIn: false,
        },
      ],
      placements: [],
      assemblies: [],
      beamPaths: [],
    })

    const serialized = serializeLayoutForPersistence(useStore.getState())

    expect(
      serialized.components.some((component) => component.id === 'imported-km100-user'),
    ).toBe(true)
  })

  it('keeps unplaced imported vendor components when relinking a saved layout', () => {
    useStore.getState().replaceLayout({
      version: 1,
      table: useStore.getState().table,
      components: [
        {
          id: 'saved-km100-user',
          partNumber: 'KM100',
          name: 'Imported KM100 User Copy',
          supplier: 'Thorlabs',
          category: 'Mirror Mounts',
          widthMm: 38,
          heightMm: 38,
          anchorOffsetX: 0,
          anchorOffsetY: 0,
          color: '#2a1a3a',
          url: 'https://www.thorlabs.com/newgrouppage9.cfm?pn=KM100',
          priceCents: 1000,
          notes: 'Imported from product link.',
          specs: {},
          source: {
            kind: 'imported',
            vendor: 'Thorlabs',
            catalogKey: buildCatalogKey('Thorlabs', 'KM100'),
          },
          reviewStatus: 'needs_review',
          isBuiltIn: false,
        },
      ],
      assemblies: [],
      placements: [],
      beamPaths: [],
    })

    expect(
      useStore.getState().components.some((component) => component.id === 'saved-km100-user'),
    ).toBe(true)
  })
})
