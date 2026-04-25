import type { Assembly, BeamPath, Component, Placement, TableConfig } from '../types'
import type { BomLine } from './bom'
import { resolvePlacementSummary } from './assembly'
import { getHolePositions } from './geometry'

function escapeCsv(value: string | number | null): string {
  const normalized = value === null ? '' : String(value)

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }

  return normalized
}

function joinCsvRow(values: Array<string | number | null>): string {
  return values.map(escapeCsv).join(',')
}

export function buildBomCsv(lines: BomLine[]): string {
  const rows = [
    joinCsvRow([
      'Part #',
      'Name',
      'Supplier',
      'Qty',
      'Unit Price',
      'Total',
      'Link',
      'Notes',
    ]),
    ...lines.map((line) =>
      joinCsvRow([
        line.partNumber,
        line.name,
        line.supplier,
        line.quantity,
        (line.unitCents / 100).toFixed(2),
        (line.totalCents / 100).toFixed(2),
        line.url,
        line.notes,
      ]),
    ),
  ]

  return `${rows.join('\n')}\n`
}

export function buildBeamsCsv(beams: BeamPath[]): string {
  const rows = [
    joinCsvRow([
      'Label',
      'Wavelength (nm)',
      'Color',
      'Line Style',
      'Polarization',
      'Power (mW)',
      'Waypoint Count',
    ]),
    ...beams.map((beam) =>
      joinCsvRow([
        beam.label,
        beam.wavelengthNm,
        beam.color,
        beam.lineStyle,
        beam.polarization,
        beam.powerMw ?? '',
        beam.points.length,
      ]),
    ),
  ]

  return `${rows.join('\n')}\n`
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function serializeLayoutSvg({
  table,
  placements,
  components,
  assemblies,
  beamPaths,
}: {
  table: TableConfig
  placements: Placement[]
  components: Component[]
  assemblies: Assembly[]
  beamPaths: BeamPath[]
}): string {
  const holeRadius = table.holeDiameterMm / 2
  const holeMarkup = getHolePositions(table)
    .map(
      (hole) =>
        `  <circle cx="${hole.x}" cy="${hole.y}" r="${holeRadius}" fill="#334a66" />`,
    )
    .join('\n')
  const placementMarkup = placements
    .map((placement) => {
      const summary = resolvePlacementSummary(placement, components, assemblies)

      if (!summary) {
        return ''
      }

      const x = placement.x - summary.widthMm / 2 + summary.anchorOffsetX
      const y = placement.y - summary.heightMm / 2 + summary.anchorOffsetY
      const stroke = summary.kind === 'assembly' ? '#88c988' : '#7eb8f7'
      const dash = summary.kind === 'assembly' ? ' stroke-dasharray="6 4"' : ''

      return `
  <g>
    <rect x="${x}" y="${y}" width="${summary.widthMm}" height="${summary.heightMm}" rx="2" fill="${summary.color}" stroke="${stroke}" stroke-width="1.5"${dash} />
    <text x="${placement.x}" y="${placement.y}" text-anchor="middle" dominant-baseline="middle" font-size="6" fill="#d0d6ea">${escapeXml(summary.kind === 'assembly' ? `[ASM] ${placement.label}` : placement.label)}</text>
  </g>`
    })
    .join('\n')

  const beamMarkup = beamPaths
    .map((beam) => {
      const points = beam.points.map((point) => `${point.x},${point.y}`).join(' ')
      const dash = beam.lineStyle === 'dashed' ? ' stroke-dasharray="6 4"' : ''
      const labelPoint = beam.points[0]

      return `
  <g>
    <polyline points="${points}" fill="none" stroke="${beam.color}" stroke-width="1.5"${dash} />
    ${
      labelPoint
        ? `<text x="${labelPoint.x + 4}" y="${labelPoint.y - 4}" font-size="5" fill="${beam.color}">${escapeXml(beam.label)}</text>`
        : ''
    }
  </g>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${table.widthMm} ${table.heightMm}" width="${table.widthMm}" height="${table.heightMm}">
  <rect x="0" y="0" width="${table.widthMm}" height="${table.heightMm}" rx="4" fill="#141428" stroke="#334466" stroke-width="2" />
${holeMarkup}
${placementMarkup}
${beamMarkup}
</svg>
`
}
