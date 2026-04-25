import type { Component, LayoutState } from '../types'

export const POPULAR_CATALOG_PART_NUMBERS = {
  Thorlabs: ['RS1', 'PH1', 'LMR1', 'KM100', 'POLARIS-K1', 'BS013', 'LA1074-A', 'ID25', 'MT1'],
  Newport: ['SP-1', 'PH-1', 'U100-A2K', 'MT-RS'],
} as const

export const CATEGORY_ORDER = [
  'Lasers',
  'Posts',
  'Post Holders',
  'Lens Mounts',
  'Mirror Mounts',
  'Beam Splitters',
  'Mirrors',
  'Lenses',
  'Irises',
  'Stages',
  'Other',
] as const

export type CatalogCategory = (typeof CATEGORY_ORDER)[number]
export type CuratedShelfVendor = keyof typeof POPULAR_CATALOG_PART_NUMBERS

const CATEGORY_COLORS: Record<CatalogCategory, string> = {
  Lasers: '#3d2750',
  Posts: '#1a3050',
  'Post Holders': '#1a2a3a',
  'Lens Mounts': '#1a3a2a',
  'Mirror Mounts': '#2a1a3a',
  'Beam Splitters': '#1a3a3a',
  Mirrors: '#2a2a1a',
  Lenses: '#1a2a1a',
  Irises: '#3a2a1a',
  Stages: '#2a3a1a',
  Other: '#243045',
}

export function buildCatalogKey(vendor: string, partNumber: string): string {
  return `${vendor.trim().toLowerCase()}:${partNumber.trim().toLowerCase()}`
}

export function inferCatalogCategory(partNumber: string): CatalogCategory {
  if (/^(MONACO|AVIA|CB|PHAROS|CARBIDE)/.test(partNumber)) {
    return 'Lasers'
  }

  if (/^(RS|SP)/.test(partNumber)) {
    return 'Posts'
  }

  if (/^PH/.test(partNumber)) {
    return 'Post Holders'
  }

  if (/^LMR/.test(partNumber)) {
    return 'Lens Mounts'
  }

  if (/^(KM|POLARIS|U1|U2)/.test(partNumber)) {
    return 'Mirror Mounts'
  }

  if (/^(BS|CCM|05BC)/.test(partNumber)) {
    return 'Beam Splitters'
  }

  if (/^BB/.test(partNumber)) {
    return 'Mirrors'
  }

  if (/^LA/.test(partNumber)) {
    return 'Lenses'
  }

  if (/^ID/.test(partNumber)) {
    return 'Irises'
  }

  if (/^MT/.test(partNumber)) {
    return 'Stages'
  }

  return 'Other'
}

export function inferCatalogColor(partNumber: string): string {
  return CATEGORY_COLORS[inferCatalogCategory(partNumber)]
}

export function normalizeComponent(component: Component): Component {
  const source = component.source ?? {
    kind: component.isBuiltIn ? 'catalog' : 'imported',
    vendor: component.supplier,
    importedFromUrl: component.url || undefined,
  }

  return {
    ...component,
    category: component.category || inferCatalogCategory(component.partNumber),
    specs: component.specs ?? {},
    source: {
      ...source,
      catalogKey:
        source.catalogKey ??
        (source.kind === 'drawn'
          ? undefined
          : buildCatalogKey(component.supplier, component.partNumber)),
    },
    reviewStatus:
      component.reviewStatus ??
      (component.isBuiltIn ? 'published' : 'needs_review'),
  }
}

export function getPopularShelfItems(
  components: Component[],
  vendor: CuratedShelfVendor,
): Component[] {
  const partNumbers = POPULAR_CATALOG_PART_NUMBERS[vendor]
  const order = new Map<string, number>(
    partNumbers.map((partNumber, index) => [partNumber, index]),
  )

  return components
    .filter(
      (component) =>
        component.supplier === vendor && order.has(component.partNumber),
    )
    .sort(
      (left, right) =>
        (order.get(left.partNumber) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(right.partNumber) ?? Number.MAX_SAFE_INTEGER) ||
        left.partNumber.localeCompare(right.partNumber),
    )
}

function getCatalogSearchScore(
  component: Component,
  normalizedQuery: string,
): number {
  if (!normalizedQuery) {
    return 0
  }

  const partNumber = component.partNumber.toLowerCase()
  const name = component.name.toLowerCase()
  const vendor = component.supplier.toLowerCase()
  const category = component.category.toLowerCase()

  if (partNumber === normalizedQuery) {
    return 400
  }

  if (partNumber.startsWith(normalizedQuery)) {
    return 300
  }

  if (partNumber.includes(normalizedQuery)) {
    return 250
  }

  if (name === normalizedQuery) {
    return 220
  }

  if (name.includes(normalizedQuery)) {
    return 200
  }

  if (vendor.includes(normalizedQuery) || category.includes(normalizedQuery)) {
    return 100
  }

  return 0
}

export function rankCatalogSearchResults(
  components: Component[],
  query: string,
): Component[] {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return []
  }

  return [...components]
    .map((component) => ({
      component,
      score: getCatalogSearchScore(component, normalizedQuery),
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.component.partNumber.localeCompare(right.component.partNumber),
    )
    .map((entry) => entry.component)
}

export function relinkLayoutToCatalog(
  layout: LayoutState,
  builtInComponents: Component[],
): LayoutState {
  const normalizedBuiltIns = builtInComponents.map(normalizeComponent)
  const referencedComponentIds = new Set<string>()

  for (const placement of layout.placements) {
    if (placement.type === 'component') {
      referencedComponentIds.add(placement.refId)
    }
  }

  for (const assembly of layout.assemblies) {
    for (const item of assembly.items) {
      if (item.type === 'component') {
        referencedComponentIds.add(item.refId)
      }
    }
  }

  const builtInByCatalogKey = new Map(
    normalizedBuiltIns
      .map((component) => [component.source.catalogKey, component] as const)
      .filter(([catalogKey]) => Boolean(catalogKey)),
  )
  const builtInByVendorPart = new Map(
    normalizedBuiltIns.map((component) => [
      buildCatalogKey(component.supplier, component.partNumber),
      component,
    ]),
  )
  const refIdMap = new Map<string, string>()
  const components = layout.components.reduce<Component[]>((kept, component) => {
    const normalized = normalizeComponent(component)
    const candidate =
      (normalized.source.catalogKey
        ? builtInByCatalogKey.get(normalized.source.catalogKey)
        : undefined) ??
      builtInByVendorPart.get(
        buildCatalogKey(normalized.supplier, normalized.partNumber),
      )

    if (
      candidate &&
      referencedComponentIds.has(component.id) &&
      normalized.source.kind !== 'drawn' &&
      normalized.supplier !== 'Custom'
    ) {
      refIdMap.set(component.id, candidate.id)
      return kept
    }

    kept.push(normalized)
    return kept
  }, [])

  return {
    ...layout,
    components,
    placements: layout.placements.map((placement) =>
      placement.type === 'component' && refIdMap.has(placement.refId)
        ? { ...placement, refId: refIdMap.get(placement.refId)! }
        : placement,
    ),
    assemblies: layout.assemblies.map((assembly) => ({
      ...assembly,
      items: assembly.items.map((item) =>
        item.type === 'component' && refIdMap.has(item.refId)
          ? { ...item, refId: refIdMap.get(item.refId)! }
          : item,
      ),
    })),
  }
}

export function groupComponentsByCategory(
  components: Component[],
): Array<[CatalogCategory, Component[]]> {
  const groups: Partial<Record<CatalogCategory, Component[]>> = {}

  for (const component of components) {
    const inferred = component.category || inferCatalogCategory(component.partNumber)
    const category = CATEGORY_ORDER.includes(inferred as CatalogCategory)
      ? (inferred as CatalogCategory)
      : 'Other'
    groups[category] ??= []
    groups[category].push(component)
  }

  return CATEGORY_ORDER.filter((category) => groups[category]?.length).map(
    (category) => [category, groups[category] ?? []],
  )
}
