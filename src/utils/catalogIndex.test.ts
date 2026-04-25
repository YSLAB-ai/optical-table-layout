import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Component } from '../types'
import {
  loadPublishedCatalogIndex,
  mergePublishedCatalogSearchSources,
  resetPublishedCatalogIndexCache,
  resolveDroppedCatalogComponent,
} from './catalogIndex'

const fallbackKm100: Component = {
  id: 'snapshot-thorlabs-km100',
  partNumber: 'KM100',
  name: '1" Kinematic Mirror Mount',
  supplier: 'Thorlabs',
  category: 'Mirror Mounts',
  widthMm: 38,
  heightMm: 38,
  anchorOffsetX: 0,
  anchorOffsetY: 0,
  color: '#2a1a3a',
  url: 'https://www.thorlabs.com/newgrouppage9.cfm?objectgroup_id=1492&pn=KM100',
  priceCents: 0,
  notes: '',
  specs: {},
  source: {
    kind: 'snapshot',
    vendor: 'Thorlabs',
  },
  reviewStatus: 'needs_review',
  isBuiltIn: true,
}

describe('loadPublishedCatalogIndex', () => {
  beforeEach(() => {
    resetPublishedCatalogIndexCache()
  })

  it('loads and normalizes the published catalog index asset', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        publishedAt: '2026-04-03T12:00:00.000Z',
        components: [fallbackKm100],
      }),
    })

    const result = await loadPublishedCatalogIndex(fetchMock)

    expect(fetchMock).toHaveBeenCalledWith('/catalog/vendorCatalogIndex.json')
    expect(result.publishedAt).toBe('2026-04-03T12:00:00.000Z')
    expect(result.components[0]?.source.catalogKey).toBe('thorlabs:km100')
  })

  it('reuses the in-flight published catalog request so multiple callers do not refetch it', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        publishedAt: '2026-04-03T12:00:00.000Z',
        components: [fallbackKm100],
      }),
    })

    const [first, second] = await Promise.all([
      loadPublishedCatalogIndex(fetchMock),
      loadPublishedCatalogIndex(fetchMock),
    ])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(first.components[0]?.partNumber).toBe('KM100')
    expect(second.components[0]?.partNumber).toBe('KM100')
  })
})

describe('mergePublishedCatalogSearchSources', () => {
  it('prefers local enriched components over fallback index records with the same catalog identity', () => {
    const merged = mergePublishedCatalogSearchSources(
      [
        {
          ...fallbackKm100,
          priceCents: 18950,
          reviewStatus: 'published',
        },
      ],
      [fallbackKm100],
    )

    expect(merged).toHaveLength(1)
    expect(merged[0]?.priceCents).toBe(18950)
    expect(merged[0]?.reviewStatus).toBe('published')
  })
})

describe('resolveDroppedCatalogComponent', () => {
  it('reuses an existing local component when an index-only drag matches by catalog identity', () => {
    const existing: Component = {
      ...fallbackKm100,
      id: 'tl-km100',
      priceCents: 18950,
      reviewStatus: 'published',
    }

    const result = resolveDroppedCatalogComponent([existing], fallbackKm100)

    expect(result).toMatchObject({
      component: {
        ...existing,
        source: {
          ...existing.source,
          catalogKey: 'thorlabs:km100',
        },
      },
      shouldAddToStore: false,
    })
  })
})
