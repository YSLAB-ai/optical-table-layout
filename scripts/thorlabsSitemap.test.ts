import { describe, expect, it } from 'vitest'

import { normalizeSitemapProduct } from './vendor/normalize-component.mjs'
import {
  extractThorlabsCatalogProducts,
  getThorlabsCatalogChildPrefixes,
  getThorlabsCatalogPageCount,
  isThorlabsCatalogQueryTruncated,
} from './vendor/thorlabs-sitemap-index.mjs'

const ALGOLIA_PAGE = {
  page: 0,
  nbPages: 3,
  hits: [
    {
      objectID: 'KM100',
      name: 'Kinematic Mirror Mount for Ø1" Optics',
      url: '/newgrouppage9.cfm?objectgroup_id=1492&pn=KM100',
      familyPageUrl: '/newgrouppage9.cfm?objectgroup_id=1492',
      visualNavigationParentName: 'Mirror Mounts',
      familyPageDescription: 'Kinematic mirror mounts',
    },
    {
      objectID: 'RS1',
      name: '1/2" Post, L=1"',
      url: '/thorproduct.cfm?partnumber=RS1',
      familyPageUrl: '/thorproduct.cfm?partnumber=RS1',
      visualNavigationParentName: 'Posts',
      familyPageDescription: 'Posts and post accessories',
    },
  ],
}

describe('extractThorlabsCatalogProducts', () => {
  it('extracts normalized fallback products from the public Algolia catalog page', () => {
    expect(extractThorlabsCatalogProducts(ALGOLIA_PAGE, 0)).toEqual([
      {
        partNumber: 'KM100',
        description: 'Kinematic Mirror Mount for Ø1" Optics',
        detailUrl:
          'https://www.thorlabs.com/newgrouppage9.cfm?objectgroup_id=1492&pn=KM100',
        categoryName: 'Mirror Mounts',
        sourcePage: 'algolia:products_en:0',
      },
      {
        partNumber: 'RS1',
        description: '1/2" Post, L=1"',
        detailUrl: 'https://www.thorlabs.com/thorproduct.cfm?partnumber=RS1',
        categoryName: 'Posts',
        sourcePage: 'algolia:products_en:0',
      },
    ])
    expect(getThorlabsCatalogPageCount(ALGOLIA_PAGE)).toBe(3)
  })

  it('normalizes discovery rows that only expose family page URLs', () => {
    expect(
      extractThorlabsCatalogProducts(
        {
          hits: [
            {
              objectID: 'RS1',
              name: 'Ø1/2" Pillar Post, 1/4"-20 Taps, L = 1"',
              familyPageUrl: '/thorproduct.cfm?partnumber=RS1',
              visualNavigationParentName: 'Posts',
            },
          ],
        },
        1,
      ),
    ).toEqual([
      {
        partNumber: 'RS1',
        description: 'Ø1/2" Pillar Post, 1/4"-20 Taps, L = 1"',
        detailUrl: 'https://www.thorlabs.com/thorproduct.cfm?partnumber=RS1',
        categoryName: 'Posts',
        sourcePage: 'algolia:products_en:1',
      },
    ])
  })
})

describe('Thorlabs catalog prefix helpers', () => {
  it('flags truncated objectID search pages and generates child prefixes for deeper crawling', () => {
    expect(
      isThorlabsCatalogQueryTruncated({
        nbHits: 5698,
        hitsPerPage: 1000,
      }),
    ).toBe(true)
    expect(
      isThorlabsCatalogQueryTruncated({
        nbHits: 99,
        hitsPerPage: 1000,
      }),
    ).toBe(false)
    expect(getThorlabsCatalogChildPrefixes('M').slice(0, 6)).toEqual([
      'M0',
      'M1',
      'M2',
      'M3',
      'M4',
      'M5',
    ])
  })
})

describe('normalizeSitemapProduct', () => {
  it('converts sitemap-only Thorlabs rows into fallback searchable components', () => {
    const component = normalizeSitemapProduct({
      vendor: 'Thorlabs',
      partNumber: 'KM100',
      description: '1" Kinematic Mirror Mount',
      detailUrl:
        'https://www.thorlabs.com/newgrouppage9.cfm?objectgroup_id=1492&pn=KM100',
    })

    expect(component).toMatchObject({
      id: 'snapshot-thorlabs-km100',
      supplier: 'Thorlabs',
      partNumber: 'KM100',
      category: 'Mirror Mounts',
      widthMm: 38,
      heightMm: 38,
      priceCents: 0,
      reviewStatus: 'needs_review',
      source: {
        kind: 'snapshot',
        vendor: 'Thorlabs',
      },
    })
  })
})
