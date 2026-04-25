import { describe, expect, it } from 'vitest'

import type { BeamPath, Component, Placement, TableConfig } from '../types'
import type { BomLine } from './bom'
import { buildBeamsCsv, buildBomCsv, serializeLayoutSvg } from './export'

const table: TableConfig = {
  widthMm: 300,
  heightMm: 200,
  holeSpacingMm: 25,
  holeDiameterMm: 6.35,
  borderMarginMm: 25,
  units: 'mm',
}

const component: Component = {
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
  url: 'https://example.com/km100',
  priceCents: 18950,
  notes: '',
  specs: {},
  source: { kind: 'catalog', vendor: 'Thorlabs' },
  reviewStatus: 'published',
  isBuiltIn: true,
}

describe('buildBomCsv', () => {
  it('serializes BOM rows with headers', () => {
    const lines: BomLine[] = [
      {
        componentId: 'mount',
        partNumber: 'KM100',
        name: 'Mirror Mount',
        supplier: 'Thorlabs',
        quantity: 2,
        unitCents: 18950,
        totalCents: 37900,
        url: 'https://example.com/km100',
        notes: 'critical optic',
      },
    ]

    const csv = buildBomCsv(lines)

    expect(csv).toContain('Part #,Name,Supplier,Qty,Unit Price,Total,Link,Notes')
    expect(csv).toContain('KM100,Mirror Mount,Thorlabs,2,189.50,379.00,https://example.com/km100,critical optic')
  })
})

describe('buildBeamsCsv', () => {
  it('serializes beam metadata rows', () => {
    const beams: BeamPath[] = [
      {
        id: 'beam-1',
        label: 'Pump',
        wavelengthNm: 532,
        color: '#00ff44',
        lineStyle: 'solid',
        polarization: 'H',
        powerMw: 50,
        points: [
          { x: 10, y: 10 },
          { x: 50, y: 10 },
        ],
      },
    ]

    const csv = buildBeamsCsv(beams)

    expect(csv).toContain('Label,Wavelength (nm),Color,Line Style,Polarization,Power (mW),Waypoint Count')
    expect(csv).toContain('Pump,532,#00ff44,solid,H,50,2')
  })
})

describe('serializeLayoutSvg', () => {
  it('renders a simple svg document with placements and beams', () => {
    const placements: Placement[] = [
      {
        id: 'p1',
        type: 'component',
        refId: 'mount',
        x: 75,
        y: 75,
        rotation: 0,
        label: 'KM100',
      },
    ]
    const beams: BeamPath[] = [
      {
        id: 'beam-1',
        label: 'Probe',
        wavelengthNm: 633,
        color: '#ff3333',
        lineStyle: 'dashed',
        polarization: 'V',
        powerMw: null,
        points: [
          { x: 20, y: 20 },
          { x: 120, y: 20 },
        ],
      },
    ]

    const svg = serializeLayoutSvg({
      table,
      placements,
      components: [component],
      assemblies: [],
      beamPaths: beams,
    })

    expect(svg).toContain('<svg')
    expect(svg).toContain('<circle')
    expect(svg).toContain('cx="25"')
    expect(svg).toContain('cy="25"')
    expect(svg).toContain('KM100')
    expect(svg).toContain('Probe')
    expect(svg).toContain('<polyline')
  })
})
