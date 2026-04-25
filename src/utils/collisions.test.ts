import { describe, expect, it } from 'vitest'

import type { Assembly, Component, Placement } from '../types'
import { findPlacementOverlaps } from './collisions'

const compactMount: Component = {
  id: 'compact',
  partNumber: 'KM05',
  name: 'Compact Mount',
  supplier: 'Thorlabs',
  category: 'Mirror Mounts',
  widthMm: 20,
  heightMm: 20,
  anchorOffsetX: 0,
  anchorOffsetY: 0,
  color: '#456',
  url: '',
  priceCents: 1000,
  notes: '',
  specs: {},
  source: { kind: 'catalog', vendor: 'Thorlabs' },
  reviewStatus: 'published',
  isBuiltIn: true,
}

const wideMount: Component = {
  id: 'wide',
  partNumber: 'KM100',
  name: 'Wide Mount',
  supplier: 'Thorlabs',
  category: 'Mirror Mounts',
  widthMm: 40,
  heightMm: 40,
  anchorOffsetX: 0,
  anchorOffsetY: 0,
  color: '#789',
  url: '',
  priceCents: 2000,
  notes: '',
  specs: {},
  source: { kind: 'catalog', vendor: 'Thorlabs' },
  reviewStatus: 'published',
  isBuiltIn: true,
}

const assemblyWide: Assembly = {
  id: 'asm-wide',
  name: 'Wide Station',
  notes: '',
  items: [{ type: 'component', refId: 'wide', quantity: 1 }],
}

describe('findPlacementOverlaps', () => {
  it('detects overlaps between component and assembly placements', () => {
    const placements: Placement[] = [
      {
        id: 'p1',
        type: 'component',
        refId: 'compact',
        x: 50,
        y: 50,
        rotation: 0,
        label: '',
      },
      {
        id: 'p2',
        type: 'assembly',
        refId: 'asm-wide',
        x: 60,
        y: 55,
        rotation: 0,
        label: '',
      },
    ]

    const overlaps = findPlacementOverlaps(
      placements,
      [compactMount, wideMount],
      [assemblyWide],
    )

    expect(overlaps).toHaveLength(1)
    expect(overlaps[0]?.placementIds).toEqual(['p1', 'p2'])
  })

  it('returns an empty list when placements do not overlap', () => {
    const placements: Placement[] = [
      {
        id: 'p1',
        type: 'component',
        refId: 'compact',
        x: 20,
        y: 20,
        rotation: 0,
        label: '',
      },
      {
        id: 'p2',
        type: 'assembly',
        refId: 'asm-wide',
        x: 120,
        y: 120,
        rotation: 0,
        label: '',
      },
    ]

    expect(
      findPlacementOverlaps(placements, [compactMount, wideMount], [assemblyWide]),
    ).toEqual([])
  })
})
