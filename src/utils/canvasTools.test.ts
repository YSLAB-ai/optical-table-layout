import { describe, expect, it } from 'vitest'

import type { BeamPath } from '../types'
import { DEFAULT_TABLE_CONFIG } from '../types'
import {
  buildBeamPath,
  buildDrawnComponent,
  finalizeBeamDraft,
  getBeamDraftKeyAction,
  getDrawDraftMetrics,
  resolveBeamDraftPoint,
  shouldCaptureBeamPointFromTargetName,
  snapBeamDraftPoint,
} from './canvasTools'

describe('getDrawDraftMetrics', () => {
  it('computes normalized draft bounds and center', () => {
    const metrics = getDrawDraftMetrics(
      { x: 80, y: 60 },
      { x: 20, y: 10 },
    )

    expect(metrics).toEqual({
      x: 20,
      y: 10,
      widthMm: 60,
      heightMm: 50,
      centerX: 50,
      centerY: 35,
    })
  })
})

describe('buildDrawnComponent', () => {
  it('creates a normalized custom component from draw modal input', () => {
    const component = buildDrawnComponent({
      id: 'custom-1',
      name: 'Custom Mount',
      partNumber: 'cm-1',
      widthMm: 44,
      heightMm: 28,
      color: '#445566',
      priceCents: 1200,
      notes: 'bench fixture',
    })

    expect(component).toMatchObject({
      id: 'custom-1',
      supplier: 'Custom',
      category: 'Other',
      partNumber: 'CM-1',
      widthMm: 44,
      heightMm: 28,
      color: '#445566',
      priceCents: 1200,
      reviewStatus: 'draft',
      source: {
        kind: 'drawn',
        vendor: 'Custom',
      },
      isBuiltIn: false,
    })
  })
})

describe('buildBeamPath', () => {
  it('creates a default beam record from draft points', () => {
    const beam = buildBeamPath(
      [
        { x: 10, y: 20 },
        { x: 80, y: 20 },
      ],
      2,
    )

    expect(beam).toMatchObject<BeamPath>({
      id: expect.any(String),
      label: 'Beam 3',
      wavelengthNm: 632.8,
      color: '#ff3333',
      lineStyle: 'solid',
      polarization: 'unpolarized',
      powerMw: null,
      points: [
        { x: 10, y: 20 },
        { x: 80, y: 20 },
      ],
    })
  })

  it('collapses nearly straight continuation into a single straight segment', () => {
    const beam = buildBeamPath(
      [
        { x: 10, y: 10 },
        { x: 40, y: 40 },
        { x: 74, y: 76 },
      ],
      0,
    )

    expect(beam.points).toHaveLength(2)
    expect(beam.points[1]?.x).toBeCloseTo(75, 4)
    expect(beam.points[1]?.y).toBeCloseTo(75, 4)
  })
})

describe('snapBeamDraftPoint', () => {
  it('snaps the first beam segment to a straight horizontal line when the angle is small', () => {
    const snapped = snapBeamDraftPoint([{ x: 10, y: 20 }], { x: 80, y: 24 })

    expect(snapped).toEqual({ x: 80, y: 20 })
  })

  it('continues the previous beam direction when the bend angle is small', () => {
    const snapped = snapBeamDraftPoint(
      [
        { x: 10, y: 10 },
        { x: 40, y: 40 },
      ],
      { x: 74, y: 76 },
    )

    expect(snapped.x).toBeCloseTo(75, 4)
    expect(snapped.y).toBeCloseTo(75, 4)
  })

  it('keeps a deliberate bend when the angle is large', () => {
    const snapped = snapBeamDraftPoint(
      [
        { x: 10, y: 10 },
        { x: 60, y: 10 },
      ],
      { x: 60, y: 80 },
    )

    expect(snapped).toEqual({ x: 60, y: 80 })
  })
})

describe('resolveBeamDraftPoint', () => {
  it('anchors the first beam point to the nearest table hole', () => {
    const resolved = resolveBeamDraftPoint(
      [],
      { x: 41, y: 42 },
      DEFAULT_TABLE_CONFIG,
    )

    expect(resolved).toEqual({ x: 37.5, y: 37.5 })
  })

  it('keeps straightening behavior but re-anchors the resolved point to a hole', () => {
    const resolved = resolveBeamDraftPoint(
      [
        { x: 37.5, y: 37.5 },
        { x: 62.5, y: 37.5 },
      ],
      { x: 87, y: 39 },
      DEFAULT_TABLE_CONFIG,
    )

    expect(resolved).toEqual({ x: 87.5, y: 37.5 })
  })
})

describe('getBeamDraftKeyAction', () => {
  it('finishes a valid draft on return', () => {
    expect(
      getBeamDraftKeyAction('Enter', [
        { x: 37.5, y: 37.5 },
        { x: 62.5, y: 37.5 },
      ]),
    ).toBe('finish')
  })

  it('cancels an invalid draft on escape', () => {
    expect(
      getBeamDraftKeyAction('Escape', [{ x: 37.5, y: 37.5 }]),
    ).toBe('cancel')
  })

  it('ignores escape when there is no active beam draft', () => {
    expect(getBeamDraftKeyAction('Escape', [])).toBeNull()
  })
})

describe('shouldCaptureBeamPointFromTargetName', () => {
  it('allows beam clicks to resolve from occupied-hole placement hits', () => {
    expect(shouldCaptureBeamPointFromTargetName('beam', '')).toBe(true)
    expect(shouldCaptureBeamPointFromTargetName('beam', 'placement-hit')).toBe(
      true,
    )
  })

  it('ignores clicks on existing beam geometry while drafting', () => {
    expect(shouldCaptureBeamPointFromTargetName('beam', 'beam-hit')).toBe(false)
    expect(shouldCaptureBeamPointFromTargetName('select', 'placement-hit')).toBe(
      false,
    )
  })
})

describe('finalizeBeamDraft', () => {
  it('returns null when a finished draft still has fewer than two normalized points', () => {
    const beam = finalizeBeamDraft(
      [
        { x: 37.5, y: 37.5 },
        { x: 37.5, y: 37.5 },
      ],
      0,
    )

    expect(beam).toBeNull()
  })
})
