import type { Component } from '../types'
import { inferCatalogCategory, inferCatalogColor } from './catalog'

export type SupportedVendor =
  | 'Thorlabs'
  | 'Newport'
  | 'Coherent'
  | 'Light Conversion'
export type ImportSupplier = SupportedVendor | 'Custom'

export interface ParsedProductUrl {
  normalizedUrl: string
  supplier: SupportedVendor | null
  partNumber: string
}

export interface ImportedComponentInput {
  url: string
  supplier: ImportSupplier
  partNumber: string
  name: string
  widthMm: number
  heightMm: number
  priceCents: number
  notes: string
}

export function normalizePartNumber(partNumber: string): string {
  return partNumber.trim().toUpperCase()
}

export function detectVendorFromUrl(url: URL): SupportedVendor | null {
  const hostname = url.hostname.toLowerCase()

  if (hostname.includes('thorlabs.com')) {
    return 'Thorlabs'
  }

  if (hostname.includes('newport.com')) {
    return 'Newport'
  }

  if (hostname.includes('coherent.com')) {
    return 'Coherent'
  }

  if (hostname.includes('lightcon.com') || hostname.includes('lightconversion.com')) {
    return 'Light Conversion'
  }

  return null
}

export function extractPartNumberFromUrl(url: URL): string {
  const supplier = detectVendorFromUrl(url)

  if (supplier === 'Thorlabs') {
    const explicit =
      url.searchParams.get('partnumber') ?? url.searchParams.get('pn') ?? ''

    return normalizePartNumber(explicit)
  }

  if (supplier === 'Newport') {
    const pathnameSegments = url.pathname
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean)
    const productSegment =
      pathnameSegments.find((_, index) => {
        return pathnameSegments[index - 1]?.toLowerCase() === 'p'
      }) ?? url.searchParams.get('pn') ?? ''

    return normalizePartNumber(productSegment)
  }

  if (supplier === 'Coherent' || supplier === 'Light Conversion') {
    const queryPartNumber =
      url.searchParams.get('partnumber') ??
      url.searchParams.get('pn') ??
      url.searchParams.get('sku') ??
      ''

    if (queryPartNumber) {
      return normalizePartNumber(queryPartNumber)
    }

    const segments = url.pathname
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean)
    const tail = segments.at(-1) ?? ''

    return normalizePartNumber(tail.replace(/\.[a-z0-9]+$/i, ''))
  }

  return ''
}

export function parseProductUrl(rawUrl: string): ParsedProductUrl | null {
  try {
    const normalizedUrl = new URL(rawUrl.trim())
    const supplier = detectVendorFromUrl(normalizedUrl)

    return {
      normalizedUrl: normalizedUrl.toString(),
      supplier,
      partNumber: extractPartNumberFromUrl(normalizedUrl),
    }
  } catch {
    return null
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function makeComponentId(
  supplier: ImportSupplier,
  partNumber: string,
  components: Component[],
): string {
  const baseId = `import-${slugify(supplier)}-${slugify(partNumber)}`
  let nextId = baseId
  let index = 2

  while (components.some((component) => component.id === nextId)) {
    nextId = `${baseId}-${index}`
    index += 1
  }

  return nextId
}

export function findExistingImportedComponent(
  components: Component[],
  supplier: ImportSupplier,
  partNumber: string,
): Component | undefined {
  const normalized = normalizePartNumber(partNumber)

  return components.find(
    (component) =>
      component.supplier === supplier &&
      normalizePartNumber(component.partNumber) === normalized,
  )
}

export function buildImportedComponent(
  input: ImportedComponentInput,
  components: Component[],
): Component {
  const normalizedPartNumber = normalizePartNumber(input.partNumber)
  const inferredCategory = inferCatalogCategory(normalizedPartNumber)
  const notes = [
    input.notes.trim(),
    input.url
      ? `Imported from product link. Category inferred as ${inferredCategory}.`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  return {
    id: makeComponentId(input.supplier, normalizedPartNumber, components),
    partNumber: normalizedPartNumber,
    name: input.name.trim() || normalizedPartNumber,
    supplier: input.supplier,
    category: inferredCategory,
    widthMm: input.widthMm,
    heightMm: input.heightMm,
    anchorOffsetX: 0,
    anchorOffsetY: 0,
    color: inferCatalogColor(normalizedPartNumber),
    url: input.url.trim(),
    priceCents: input.priceCents,
    notes,
    specs: {},
    source: {
      kind: 'imported',
      vendor: input.supplier,
      importedFromUrl: input.url.trim() || undefined,
    },
    reviewStatus: 'needs_review',
    isBuiltIn: false,
  }
}
