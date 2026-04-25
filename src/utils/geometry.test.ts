import { describe, expect, it } from 'vitest'

import {
  getHolePositions,
  getPlacementBounds,
  mmToPx,
  pxToMm,
  snapToNearestHole,
} from './geometry'
import type { Component, Placement, TableConfig } from '../types'

const table: TableConfig = {
  widthMm: 300,
  heightMm: 200,
  holeSpacingMm: 25,
  holeDiameterMm: 6.35,
  borderMarginMm: 25,
  units: 'mm',
}

describe('mmToPx / pxToMm', () => {
  it('converts mm to px using scale', () => {
    expect(mmToPx(25, 2)).toBe(50)
  })

  it('round-trips', () => {
    expect(pxToMm(mmToPx(37.5, 3), 3)).toBeCloseTo(37.5)
  })
})

describe('getHolePositions', () => {
  it('first hole is at borderMargin', () => {
    const holes = getHolePositions(table)
    expect(holes[0]).toEqual({ x: 25, y: 25, col: 0, row: 0 })
  })

  it('second hole in x is at borderMargin + spacing', () => {
    const holes = getHolePositions(table)
    expect(holes[1]).toEqual({ x: 50, y: 25, col: 1, row: 0 })
  })

  it('counts correct number of holes', () => {
    const holes = getHolePositions(table)
    expect(holes.length).toBe(11 * 7)
  })
})

describe('snapToNearestHole', () => {
  it('snaps cursor at (27, 28) to hole (25, 25)', () => {
    const result = snapToNearestHole(27, 28, table, 10)
    expect(result).toEqual({ x: 25, y: 25, col: 0, row: 0 })
  })

  it('returns null when no hole within threshold', () => {
    const result = snapToNearestHole(14, 14, table, 5)
    expect(result).toBeNull()
  })
})

describe('getPlacementBounds', () => {
  const comp: Component = {
    id: 'c1',
    partNumber: 'X',
    name: 'X',
    supplier: 'Custom',
    category: 'Other',
    widthMm: 30,
    heightMm: 20,
    anchorOffsetX: 0,
    anchorOffsetY: 0,
    color: '#fff',
    url: '',
    priceCents: 0,
    notes: '',
    specs: {},
    source: { kind: 'drawn', vendor: 'Custom' },
    reviewStatus: 'draft',
    isBuiltIn: false,
  }

  const placement: Placement = {
    id: 'p1',
    type: 'component',
    refId: 'c1',
    x: 100,
    y: 80,
    rotation: 0,
    label: 'X',
  }

  it('returns bounds centered on anchor', () => {
    const bounds = getPlacementBounds(placement, comp)
    expect(bounds).toEqual({ x: 85, y: 70, width: 30, height: 20 })
  })
})
