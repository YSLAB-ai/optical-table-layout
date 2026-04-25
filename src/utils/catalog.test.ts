import { describe, expect, it } from 'vitest'

import { DEFAULT_TABLE_CONFIG, type Component, type LayoutState } from '../types'
import {
  buildCatalogKey,
  getPopularShelfItems,
  normalizeComponent,
  rankCatalogSearchResults,
  relinkLayoutToCatalog,
} from './catalog'

const builtInComponent = normalizeComponent({
  id: 'snapshot-thorlabs-polaris-k1e3',
  partNumber: 'POLARIS-K1E3',
  name: 'POLARIS-K1E3 E-Series Kinematic Mirror Mount',
  supplier: 'Thorlabs',
  category: 'Mirror Mounts',
  widthMm: 50,
  heightMm: 50,
  anchorOffsetX: 0,
  anchorOffsetY: 0,
  color: '#2a1a3a',
  url: 'https://www.thorlabs.com/newgrouppage9.cfm?pn=POLARIS-K1E3',
  priceCents: 26500,
  notes: '',
  specs: {},
  source: {
    kind: 'snapshot',
    vendor: 'Thorlabs',
  },
  reviewStatus: 'published',
  isBuiltIn: true,
} satisfies Component)

const km100 = normalizeComponent({
  id: 'tl-km100',
  partNumber: 'KM100',
  name: '1" Kinematic Mirror Mount',
  supplier: 'Thorlabs',
  category: 'Mirror Mounts',
  widthMm: 38,
  heightMm: 38,
  anchorOffsetX: 0,
  anchorOffsetY: 0,
  color: '#2a1a3a',
  url: 'https://www.thorlabs.com/thorproduct.cfm?partnumber=KM100',
  priceCents: 18950,
  notes: '',
  specs: {},
  source: {
    kind: 'catalog',
    vendor: 'Thorlabs',
  },
  reviewStatus: 'published',
  isBuiltIn: true,
} satisfies Component)

const newportMount = normalizeComponent({
  id: 'nw-u100-a2k',
  partNumber: 'U100-A2K',
  name: '1" Kinematic Mirror Mount',
  supplier: 'Newport',
  category: 'Mirror Mounts',
  widthMm: 44,
  heightMm: 44,
  anchorOffsetX: 0,
  anchorOffsetY: 0,
  color: '#2a1a3a',
  url: 'https://www.newport.com/p/U100-A2K',
  priceCents: 22500,
  notes: '',
  specs: {},
  source: {
    kind: 'catalog',
    vendor: 'Newport',
  },
  reviewStatus: 'published',
  isBuiltIn: true,
} satisfies Component)

describe('buildCatalogKey', () => {
  it('builds a stable catalog key from vendor and part number', () => {
    expect(buildCatalogKey('Thorlabs', 'POLARIS-K1E3')).toBe(
      'thorlabs:polaris-k1e3',
    )
  })
})

describe('getPopularShelfItems', () => {
  it('returns curated popular subsets for Thorlabs and Newport shelves', () => {
    const components = [builtInComponent, km100, newportMount]

    expect(
      getPopularShelfItems(components, 'Thorlabs').map(
        (component) => component.partNumber,
      ),
    ).toContain('KM100')
    expect(
      getPopularShelfItems(components, 'Thorlabs').map(
        (component) => component.partNumber,
      ),
    ).not.toContain('POLARIS-K1E3')
    expect(
      getPopularShelfItems(components, 'Newport').map(
        (component) => component.partNumber,
      ),
    ).toContain('U100-A2K')
  })
})

describe('rankCatalogSearchResults', () => {
  it('ranks exact part-number matches above name-only matches', () => {
    const ranked = rankCatalogSearchResults(
      [
        km100,
        normalizeComponent({
          ...km100,
          id: 'name-only',
          partNumber: 'X1',
          name: 'KM100 adapter plate',
        }),
      ],
      'KM100',
    )

    expect(ranked[0]?.id).toBe('tl-km100')
  })
})

describe('relinkLayoutToCatalog', () => {
  it('relinks a saved imported/catalog component to the latest built-in catalog entry', () => {
    const savedComponent: Component = {
      ...builtInComponent,
      id: 'saved-component-1',
      priceCents: 19900,
      isBuiltIn: false,
      source: {
        ...builtInComponent.source,
        kind: 'imported',
      },
    }

    const layout: LayoutState = {
      version: 1,
      table: DEFAULT_TABLE_CONFIG,
      components: [savedComponent],
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
    }

    const result = relinkLayoutToCatalog(layout, [builtInComponent])

    expect(result.components).toEqual([])
    expect(result.placements[0]?.refId).toBe('snapshot-thorlabs-polaris-k1e3')
  })
})
