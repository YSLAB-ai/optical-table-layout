import type { Assembly, AssemblyItem, Component, Placement } from '../types'

export interface ExpandedAssemblyComponent {
  component: Component
  quantity: number
}

export interface InspectionNode {
  type: 'component' | 'assembly'
  refId: string
  name: string
  quantity: number
  partNumber?: string
  supplier?: string
  totalCents: number
  children: InspectionNode[]
}

export interface AssemblySummary {
  id: string
  name: string
  widthMm: number
  heightMm: number
  anchorOffsetX: number
  anchorOffsetY: number
  totalCents: number
  components: ExpandedAssemblyComponent[]
  inspection: InspectionNode
}

export interface PlacementSummary {
  kind: 'component' | 'assembly'
  refId: string
  name: string
  partNumber: string
  supplier: string
  widthMm: number
  heightMm: number
  anchorOffsetX: number
  anchorOffsetY: number
  color: string
  totalCents: number
  notes: string
  inspection: InspectionNode
}

export interface HoleStackItemSummary {
  refId: string
  partNumber: string
  name: string
  quantity: number
  totalCents: number
}

export function getSameHoleComponentPlacements(
  placementId: string,
  placements: Placement[],
): Placement[] {
  const target = placements.find((placement) => placement.id === placementId)

  if (
    !target ||
    target.type !== 'component' ||
    target.holeCol === undefined ||
    target.holeRow === undefined
  ) {
    return []
  }

  return placements.filter(
    (placement) =>
      placement.type === 'component' &&
      placement.holeCol === target.holeCol &&
      placement.holeRow === target.holeRow,
  )
}

export function buildAssemblyItemsFromPlacements(
  placements: Placement[],
): AssemblyItem[] {
  const quantities = new Map<string, number>()

  for (const placement of placements) {
    quantities.set(placement.refId, (quantities.get(placement.refId) ?? 0) + 1)
  }

  return [...quantities.entries()].map(([refId, quantity]) => ({
    type: 'component',
    refId,
    quantity,
  }))
}

export function canConvertHoleStackToAssembly(
  placements: Placement[],
  placementId: string,
): boolean {
  return getSameHoleComponentPlacements(placementId, placements).length >= 2
}

export function summarizeHoleComponentStack(
  placementId: string,
  placements: Placement[],
  components: Component[],
): HoleStackItemSummary[] {
  const grouped = new Map<string, HoleStackItemSummary>()

  for (const placement of getSameHoleComponentPlacements(placementId, placements)) {
    const component = getComponentById(placement.refId, components)

    if (!component) {
      continue
    }

    const existing = grouped.get(component.id)

    if (existing) {
      existing.quantity += 1
      existing.totalCents += component.priceCents
      continue
    }

    grouped.set(component.id, {
      refId: component.id,
      partNumber: component.partNumber,
      name: component.name,
      quantity: 1,
      totalCents: component.priceCents,
    })
  }

  return [...grouped.values()]
}

interface LeafEntry {
  component: Component
  quantity: number
}

function getAssemblyById(assemblyId: string, assemblies: Assembly[]): Assembly | undefined {
  return assemblies.find((candidate) => candidate.id === assemblyId)
}

function getComponentById(componentId: string, components: Component[]): Component | undefined {
  return components.find((candidate) => candidate.id === componentId)
}

function collectLeafEntries(
  assemblyId: string,
  components: Component[],
  assemblies: Assembly[],
  quantity: number,
  path: Set<string>,
): LeafEntry[] {
  if (path.has(assemblyId)) {
    return []
  }

  const assembly = getAssemblyById(assemblyId, assemblies)

  if (!assembly) {
    return []
  }

  const nextPath = new Set(path)
  nextPath.add(assemblyId)

  return assembly.items.flatMap((item) => {
    const nextQuantity = item.quantity * quantity

    if (item.type === 'component') {
      const component = getComponentById(item.refId, components)
      return component ? [{ component, quantity: nextQuantity }] : []
    }

    return collectLeafEntries(
      item.refId,
      components,
      assemblies,
      nextQuantity,
      nextPath,
    )
  })
}

function buildInspectionNode(
  assemblyId: string,
  components: Component[],
  assemblies: Assembly[],
  quantity = 1,
  path = new Set<string>(),
): InspectionNode | null {
  if (path.has(assemblyId)) {
    return null
  }

  const assembly = getAssemblyById(assemblyId, assemblies)

  if (!assembly) {
    return null
  }

  const nextPath = new Set(path)
  nextPath.add(assemblyId)

  const children = assembly.items.flatMap((item) => {
    if (item.type === 'component') {
      const component = getComponentById(item.refId, components)

      if (!component) {
        return []
      }

      return [
        {
          type: 'component' as const,
          refId: component.id,
          name: component.name,
          quantity: item.quantity,
          partNumber: component.partNumber,
          supplier: component.supplier,
          totalCents: component.priceCents * item.quantity,
          children: [],
        },
      ]
    }

    const child = buildInspectionNode(
      item.refId,
      components,
      assemblies,
      item.quantity,
      nextPath,
    )
    return child ? [child] : []
  })

  const totalCents = children.reduce(
    (sum, child) => sum + child.totalCents * quantity,
    0,
  )

  return {
    type: 'assembly',
    refId: assembly.id,
    name: assembly.name,
    quantity,
    totalCents,
    children,
  }
}

export function expandAssemblyComponents(
  assemblyId: string,
  components: Component[],
  assemblies: Assembly[],
): ExpandedAssemblyComponent[] {
  const leaves = collectLeafEntries(
    assemblyId,
    components,
    assemblies,
    1,
    new Set<string>(),
  )
  const quantities = new Map<string, ExpandedAssemblyComponent>()

  for (const leaf of leaves) {
    const existing = quantities.get(leaf.component.id)

    if (existing) {
      existing.quantity += leaf.quantity
      continue
    }

    quantities.set(leaf.component.id, {
      component: leaf.component,
      quantity: leaf.quantity,
    })
  }

  return [...quantities.values()]
}

export function buildAssemblyInspectionTree(
  assemblyId: string,
  components: Component[],
  assemblies: Assembly[],
): InspectionNode | null {
  return buildInspectionNode(
    assemblyId,
    components,
    assemblies,
    1,
    new Set<string>(),
  )
}

export function getAssemblySummary(
  assemblyId: string,
  components: Component[],
  assemblies: Assembly[],
): AssemblySummary | null {
  const assembly = getAssemblyById(assemblyId, assemblies)

  if (!assembly) {
    return null
  }

  const leaves = collectLeafEntries(
    assemblyId,
    components,
    assemblies,
    1,
    new Set<string>(),
  )

  if (leaves.length === 0) {
    return null
  }

  const expandedComponents = expandAssemblyComponents(
    assemblyId,
    components,
    assemblies,
  )
  const firstLeaf = leaves[0]
  const widthMm = Math.max(...leaves.map((leaf) => leaf.component.widthMm))
  const heightMm = Math.max(...leaves.map((leaf) => leaf.component.heightMm))
  const totalCents = leaves.reduce(
    (sum, leaf) => sum + leaf.component.priceCents * leaf.quantity,
    0,
  )
  const inspection = buildAssemblyInspectionTree(assemblyId, components, assemblies)

  if (!firstLeaf || !inspection) {
    return null
  }

  return {
    id: assembly.id,
    name: assembly.name,
    widthMm,
    heightMm,
    anchorOffsetX: firstLeaf.component.anchorOffsetX,
    anchorOffsetY: firstLeaf.component.anchorOffsetY,
    totalCents,
    components: expandedComponents,
    inspection,
  }
}

export function resolvePlacementSummary(
  placement: Placement,
  components: Component[],
  assemblies: Assembly[],
): PlacementSummary | null {
  if (placement.type === 'component') {
    const component = getComponentById(placement.refId, components)

    if (!component) {
      return null
    }

    return {
      kind: 'component',
      refId: component.id,
      name: component.name,
      partNumber: component.partNumber,
      supplier: component.supplier,
      widthMm: component.widthMm,
      heightMm: component.heightMm,
      anchorOffsetX: component.anchorOffsetX,
      anchorOffsetY: component.anchorOffsetY,
      color: component.color,
      totalCents: component.priceCents,
      notes: component.notes,
      inspection: {
        type: 'component',
        refId: component.id,
        name: component.name,
        quantity: 1,
        partNumber: component.partNumber,
        supplier: component.supplier,
        totalCents: component.priceCents,
        children: [],
      },
    }
  }

  const summary = getAssemblySummary(placement.refId, components, assemblies)

  if (!summary) {
    return null
  }

  return {
    kind: 'assembly',
    refId: summary.id,
    name: summary.name,
    partNumber: summary.name,
    supplier: 'Assembly',
    widthMm: summary.widthMm,
    heightMm: summary.heightMm,
    anchorOffsetX: summary.anchorOffsetX,
    anchorOffsetY: summary.anchorOffsetY,
    color: '#35557a',
    totalCents: summary.totalCents,
    notes: '',
    inspection: summary.inspection,
  }
}
