import { describe, expect, it } from 'vitest'

import type { Assembly, Component, Placement } from '../types'
import {
  buildAssemblyItemsFromPlacements,
  buildAssemblyInspectionTree,
  canConvertHoleStackToAssembly,
  expandAssemblyComponents,
  getSameHoleComponentPlacements,
  getAssemblySummary,
  resolvePlacementSummary,
  summarizeHoleComponentStack,
} from './assembly'

const post: Component = {
  id: 'post',
  partNumber: 'RS1',
  name: 'Post 1"',
  supplier: 'Thorlabs',
  category: 'Posts',
  widthMm: 13,
  heightMm: 13,
  anchorOffsetX: 1,
  anchorOffsetY: -1,
  color: '#aaa',
  url: '',
  priceCents: 660,
  notes: '',
  specs: {},
  source: { kind: 'catalog', vendor: 'Thorlabs' },
  reviewStatus: 'published',
  isBuiltIn: true,
}

const holder: Component = {
  id: 'holder',
  partNumber: 'PH1',
  name: 'Post Holder',
  supplier: 'Thorlabs',
  category: 'Post Holders',
  widthMm: 20,
  heightMm: 20,
  anchorOffsetX: 0,
  anchorOffsetY: 0,
  color: '#bbb',
  url: '',
  priceCents: 1420,
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
  heightMm: 35,
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

const components = [post, holder, mount]

const baseAssembly: Assembly = {
  id: 'base',
  name: 'Post Base',
  notes: '',
  items: [
    { type: 'component', refId: 'post', quantity: 1 },
    { type: 'component', refId: 'holder', quantity: 1 },
  ],
}

const derivedAssembly: Assembly = {
  id: 'station',
  name: 'Mirror Station',
  notes: '',
  items: [
    { type: 'assembly', refId: 'base', quantity: 2 },
    { type: 'component', refId: 'mount', quantity: 1 },
  ],
}

const assemblies = [baseAssembly, derivedAssembly]
const stackedPlacements: Placement[] = [
  {
    id: 'p1',
    type: 'component',
    refId: 'post',
    x: 25,
    y: 25,
    holeCol: 0,
    holeRow: 0,
    rotation: 0,
    label: 'RS1',
  },
  {
    id: 'p2',
    type: 'component',
    refId: 'holder',
    x: 25,
    y: 25,
    holeCol: 0,
    holeRow: 0,
    rotation: 0,
    label: 'PH1',
  },
  {
    id: 'p3',
    type: 'component',
    refId: 'mount',
    x: 50,
    y: 25,
    holeCol: 1,
    holeRow: 0,
    rotation: 0,
    label: 'KM100',
  },
  {
    id: 'p4',
    type: 'component',
    refId: 'post',
    x: 25,
    y: 25,
    holeCol: 0,
    holeRow: 0,
    rotation: 0,
    label: 'RS1',
  },
  {
    id: 'p5',
    type: 'assembly',
    refId: 'base',
    x: 25,
    y: 25,
    holeCol: 0,
    holeRow: 0,
    rotation: 0,
    label: 'Base',
  },
]

describe('assembly utilities', () => {
  it('finds only component placements stacked on the same hole as the clicked placement', () => {
    const stacked = getSameHoleComponentPlacements('p2', stackedPlacements)

    expect(stacked.map((placement) => placement.id)).toEqual(['p1', 'p2', 'p4'])
  })

  it('folds duplicate component placements into assembly items with quantities', () => {
    const items = buildAssemblyItemsFromPlacements(
      getSameHoleComponentPlacements('p1', stackedPlacements),
    )

    expect(items).toEqual([
      { type: 'component', refId: 'post', quantity: 2 },
      { type: 'component', refId: 'holder', quantity: 1 },
    ])
  })

  it('treats a same-hole stack as eligible only when at least two components are present', () => {
    expect(canConvertHoleStackToAssembly(stackedPlacements, 'p1')).toBe(true)
    expect(canConvertHoleStackToAssembly(stackedPlacements, 'p3')).toBe(false)
    expect(canConvertHoleStackToAssembly(stackedPlacements, 'p5')).toBe(false)
  })

  it('groups same-hole components by refId for stacked-hole display', () => {
    const grouped = summarizeHoleComponentStack(
      'p1',
      stackedPlacements,
      components,
    )

    expect(grouped).toEqual([
      {
        refId: 'post',
        partNumber: 'RS1',
        name: 'Post 1"',
        quantity: 2,
        totalCents: 1320,
      },
      {
        refId: 'holder',
        partNumber: 'PH1',
        name: 'Post Holder',
        quantity: 1,
        totalCents: 1420,
      },
    ])
  })

  it('expands nested assembly components with accumulated quantities', () => {
    const expanded = expandAssemblyComponents(
      'station',
      components,
      assemblies,
    )

    expect(expanded.map((item) => [item.component.id, item.quantity])).toEqual([
      ['post', 2],
      ['holder', 2],
      ['mount', 1],
    ])
  })

  it('computes assembly footprint, inherited anchor, and price from expanded items', () => {
    const summary = getAssemblySummary('station', components, assemblies)

    expect(summary).not.toBeNull()
    expect(summary).toMatchObject({
      widthMm: 30,
      heightMm: 35,
      anchorOffsetX: 1,
      anchorOffsetY: -1,
      totalCents: 2 * 660 + 2 * 1420 + 18950,
    })
  })

  it('builds a nested inspection tree for hover/details UI', () => {
    const tree = buildAssemblyInspectionTree('station', components, assemblies)

    expect(tree).not.toBeNull()
    expect(tree?.children).toHaveLength(2)
    expect(tree?.children[0]).toMatchObject({
      type: 'assembly',
      name: 'Post Base',
      quantity: 2,
    })
    expect(tree?.children[0]?.children.map((item) => item.name)).toEqual([
      'Post 1"',
      'Post Holder',
    ])
  })

  it('resolves assembly placements into display-ready placement summaries', () => {
    const placement: Placement = {
      id: 'p1',
      type: 'assembly',
      refId: 'station',
      x: 100,
      y: 150,
      rotation: 0,
      label: 'Mirror Station',
    }

    const summary = resolvePlacementSummary(placement, components, assemblies)

    expect(summary).toMatchObject({
      kind: 'assembly',
      name: 'Mirror Station',
      widthMm: 30,
      heightMm: 35,
      totalCents: 2 * 660 + 2 * 1420 + 18950,
    })
    expect(summary?.inspection?.children).toHaveLength(2)
  })
})
