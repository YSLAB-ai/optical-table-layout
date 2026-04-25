import type { Assembly, Component, Placement } from '../types'
import { expandAssemblyComponents } from './assembly'

export interface BomLine {
  componentId: string
  partNumber: string
  name: string
  supplier: string
  quantity: number
  unitCents: number
  totalCents: number
  url: string
  notes: string
}

export function computeBom(
  placements: Placement[],
  components: Component[],
  assemblies: Assembly[],
): BomLine[] {
  const counts = new Map<string, number>()

  for (const placement of placements) {
    if (placement.type === 'component') {
      counts.set(placement.refId, (counts.get(placement.refId) ?? 0) + 1)
    } else {
      const expanded = expandAssemblyComponents(
        placement.refId,
        components,
        assemblies,
      )

      for (const item of expanded) {
        counts.set(
          item.component.id,
          (counts.get(item.component.id) ?? 0) + item.quantity,
        )
      }
    }
  }

  const lines: BomLine[] = []

  for (const [componentId, quantity] of counts.entries()) {
    const component = components.find((candidate) => candidate.id === componentId)

    if (!component) {
      continue
    }

    lines.push({
      componentId,
      partNumber: component.partNumber,
      name: component.name,
      supplier: component.supplier,
      quantity,
      unitCents: component.priceCents,
      totalCents: component.priceCents * quantity,
      url: component.url,
      notes: component.notes,
    })
  }

  lines.sort(
    (left, right) =>
      left.supplier.localeCompare(right.supplier) ||
      left.partNumber.localeCompare(right.partNumber),
  )

  return lines
}

export function grandTotalCents(lines: BomLine[]): number {
  return lines.reduce((sum, line) => sum + line.totalCents, 0)
}
