import { describe, expect, it } from 'vitest'

import { computeBom } from './bom'
import type { Assembly, Component, LayoutState, Placement } from '../types'
import { DEFAULT_TABLE_CONFIG } from '../types'
import { buildCatalogKey, normalizeComponent, relinkLayoutToCatalog } from './catalog'

const post: Component = {
  id: 'post',
  partNumber: 'RS1',
  name: 'Post 1"',
  supplier: 'Thorlabs',
  category: 'Posts',
  widthMm: 13,
  heightMm: 13,
  anchorOffsetX: 0,
  anchorOffsetY: 0,
  color: '#aaa',
  url: '',
  priceCents: 660,
  notes: '',
  specs: {},
  source: { kind: 'catalog', vendor: 'Thorlabs' },
  reviewStatus: 'published',
  isBuiltIn: true,
}

const mount: Component = {
  id: 'mount',
  partNumber: 'KM100',
  name: 'Mirror Mount',
  supplier: 'Thorlabs',
  category: 'Mirror Mounts',
  widthMm: 30,
  heightMm: 30,
  anchorOffsetX: 0,
  anchorOffsetY: 0,
  color: '#2a4a6a',
  url: '',
  priceCents: 18950,
  notes: '',
  specs: {},
  source: { kind: 'catalog', vendor: 'Thorlabs' },
  reviewStatus: 'published',
  isBuiltIn: true,
}

const components = [post, mount]

describe('computeBom', () => {
  it('single component placement -> 1 line item', () => {
    const placements: Placement[] = [
      {
        id: 'p1',
        type: 'component',
        refId: 'mount',
        x: 25,
        y: 25,
        rotation: 0,
        label: 'KM100',
      },
    ]

    const lines = computeBom(placements, components, [])

    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({
      partNumber: 'KM100',
      quantity: 1,
      totalCents: 18950,
    })
  })

  it('two placements of same component -> qty 2', () => {
    const placements: Placement[] = [
      { id: 'p1', type: 'component', refId: 'mount', x: 25, y: 25, rotation: 0, label: '' },
      { id: 'p2', type: 'component', refId: 'mount', x: 50, y: 25, rotation: 0, label: '' },
    ]

    const lines = computeBom(placements, components, [])

    expect(lines).toHaveLength(1)
    expect(lines[0].quantity).toBe(2)
    expect(lines[0].totalCents).toBe(18950 * 2)
  })

  it('assembly placement flattens sub-components', () => {
    const asm: Assembly = {
      id: 'asm1',
      name: 'Mirror Station',
      notes: '',
      items: [
        { type: 'component', refId: 'post', quantity: 1 },
        { type: 'component', refId: 'mount', quantity: 1 },
      ],
    }

    const placements: Placement[] = [
      { id: 'p1', type: 'assembly', refId: 'asm1', x: 25, y: 25, rotation: 0, label: '' },
      { id: 'p2', type: 'assembly', refId: 'asm1', x: 50, y: 25, rotation: 0, label: '' },
    ]

    const lines = computeBom(placements, components, [asm])
    const postLine = lines.find((line) => line.partNumber === 'RS1')
    const mountLine = lines.find((line) => line.partNumber === 'KM100')

    expect(lines).toHaveLength(2)
    expect(postLine?.quantity).toBe(2)
    expect(mountLine?.quantity).toBe(2)
  })

  it('nested assemblies multiply quantities correctly', () => {
    const base: Assembly = {
      id: 'base',
      name: 'Post Base',
      notes: '',
      items: [{ type: 'component', refId: 'post', quantity: 2 }],
    }

    const nested: Assembly = {
      id: 'nested',
      name: 'Nested',
      notes: '',
      items: [
        { type: 'assembly', refId: 'base', quantity: 2 },
        { type: 'component', refId: 'mount', quantity: 1 },
      ],
    }

    const placements: Placement[] = [
      {
        id: 'p1',
        type: 'assembly',
        refId: 'nested',
        x: 25,
        y: 25,
        rotation: 0,
        label: '',
      },
    ]

    const lines = computeBom(placements, components, [base, nested])
    const postLine = lines.find((line) => line.componentId === 'post')
    const mountLine = lines.find((line) => line.componentId === 'mount')

    expect(postLine?.quantity).toBe(4)
    expect(mountLine?.quantity).toBe(1)
  })

  it('grand total is sum of all line totals', () => {
    const placements: Placement[] = [
      { id: 'p1', type: 'component', refId: 'post', x: 25, y: 25, rotation: 0, label: '' },
      { id: 'p2', type: 'component', refId: 'mount', x: 50, y: 25, rotation: 0, label: '' },
    ]

    const lines = computeBom(placements, components, [])
    const total = lines.reduce((sum, line) => sum + line.totalCents, 0)

    expect(total).toBe(660 + 18950)
  })

  it('uses the latest catalog price after a saved layout is relinked', () => {
    const currentCatalogMount = normalizeComponent({
      ...mount,
      id: 'snapshot-thorlabs-km100',
      priceCents: 22500,
      source: {
        kind: 'snapshot',
        vendor: 'Thorlabs',
      },
    })
    const savedLayout: LayoutState = {
      version: 1,
      table: DEFAULT_TABLE_CONFIG,
      components: [
        {
          ...currentCatalogMount,
          id: 'saved-km100',
          isBuiltIn: false,
          priceCents: 18950,
          source: {
            kind: 'imported',
            vendor: 'Thorlabs',
            catalogKey: buildCatalogKey('Thorlabs', 'KM100'),
          },
        },
      ],
      assemblies: [],
      placements: [
        {
          id: 'p1',
          type: 'component',
          refId: 'saved-km100',
          x: 25,
          y: 25,
          rotation: 0,
          label: 'KM100',
        },
      ],
      beamPaths: [],
    }

    const relinked = relinkLayoutToCatalog(savedLayout, [currentCatalogMount])
    const lines = computeBom(relinked.placements, [currentCatalogMount], [])

    expect(lines[0]).toMatchObject({
      partNumber: 'KM100',
      unitCents: 22500,
      totalCents: 22500,
    })
  })
})
