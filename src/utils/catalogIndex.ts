import type { Component } from '../types'
import { buildCatalogKey, normalizeComponent } from './catalog'

export interface PublishedCatalogIndex {
  publishedAt: string
  counts?: {
    enriched: number
    thorlabsCatalog: number
    total: number
  }
  components: Component[]
}

let publishedCatalogIndexPromise: Promise<PublishedCatalogIndex> | null = null

function getCatalogIdentity(component: Component): string {
  return (
    component.source.catalogKey ??
    buildCatalogKey(component.supplier, component.partNumber)
  )
}

export async function loadPublishedCatalogIndex(
  fetchImpl: typeof fetch = fetch,
  url = `${import.meta.env.BASE_URL}catalog/vendorCatalogIndex.json`,
): Promise<PublishedCatalogIndex> {
  if (!publishedCatalogIndexPromise) {
    publishedCatalogIndexPromise = (async () => {
      const response = await fetchImpl(url)

      if (!response.ok) {
        throw new Error(`Failed to load catalog index: ${response.status}`)
      }

      const payload = (await response.json()) as PublishedCatalogIndex

      return {
        ...payload,
        components: (payload.components ?? []).map(normalizeComponent),
      }
    })().catch((error) => {
      publishedCatalogIndexPromise = null
      throw error
    })
  }

  return publishedCatalogIndexPromise
}

export function resetPublishedCatalogIndexCache() {
  publishedCatalogIndexPromise = null
}

export function mergePublishedCatalogSearchSources(
  localComponents: Component[],
  remoteComponents: Component[],
): Component[] {
  const merged = new Map<string, Component>()

  for (const component of remoteComponents.map(normalizeComponent)) {
    merged.set(getCatalogIdentity(component), component)
  }

  for (const component of localComponents.map(normalizeComponent)) {
    merged.set(getCatalogIdentity(component), component)
  }

  return [...merged.values()]
}

export function resolveDroppedCatalogComponent(
  existingComponents: Component[],
  droppedComponent: Component,
): {
  component: Component
  shouldAddToStore: boolean
} {
  const normalizedDropped = normalizeComponent(droppedComponent)
  const catalogIdentity = getCatalogIdentity(normalizedDropped)
  const existing = existingComponents
    .map(normalizeComponent)
    .find(
      (component) =>
        component.id === normalizedDropped.id ||
        getCatalogIdentity(component) === catalogIdentity,
    )

  if (existing) {
    return {
      component: existing,
      shouldAddToStore: false,
    }
  }

  return {
    component: normalizedDropped,
    shouldAddToStore: true,
  }
}
