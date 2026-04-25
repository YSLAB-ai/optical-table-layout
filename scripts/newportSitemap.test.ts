import { readFileSync } from 'node:fs'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchTextWithTimeout } from './sync-newport-sitemap.mjs'
import {
  extractNewportCatalogProductsFromFamilyPage,
  extractNewportFamilyUrls,
} from './vendor/newport-sitemap-index.mjs'

function loadFixture(pathname: string): string {
  return readFileSync(new URL(pathname, import.meta.url), 'utf8')
}

afterEach(() => {
  vi.useRealTimers()
})

describe('extractNewportFamilyUrls', () => {
  it('reads family URLs from the official Newport product sitemap XML', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.newport.com/f/450a-series-compact-ball-bearing-linear-stage</loc>
  </url>
  <url>
    <loc>https://www.newport.com/f/460a-quick-mount-linear-stages</loc>
  </url>
</urlset>`

    expect(extractNewportFamilyUrls(xml)).toEqual([
      'https://www.newport.com/f/450a-series-compact-ball-bearing-linear-stage',
      'https://www.newport.com/f/460a-quick-mount-linear-stages',
    ])
  })
})

describe('extractNewportCatalogProductsFromFamilyPage', () => {
  it('extracts priced Newport SKU rows from a family page SSR payload', () => {
    const html = loadFixture('./vendor/fixtures/newport-450a-family.html')

    expect(
      extractNewportCatalogProductsFromFamilyPage(
        html,
        'https://www.newport.com/f/450a-series-compact-ball-bearing-linear-stage',
      ),
    ).toEqual([
      {
        vendor: 'Newport',
        partNumber: '450A',
        description: '450A Series Compact Ball Bearing Stage',
        detailUrl: 'https://www.newport.com/p/450A',
        categoryName: 'Single-Row Ball Bearing Steel Stages',
        familyPageDescription: 'Main 450A stage',
        sourcePage:
          'https://www.newport.com/f/450a-series-compact-ball-bearing-linear-stage',
        priceCents: 25500,
        widthMm: 38.1,
        heightMm: 25.4,
        specs: {
          Material: 'Aluminum',
          Dimensions: '1.5 x 1.0 x 0.375 in.',
          'Thread Type': '8-32 & 1/4-20',
        },
      },
      {
        vendor: 'Newport',
        partNumber: '450P',
        description: '450A Series Compact Ball Bearing Stage',
        detailUrl: 'https://www.newport.com/p/450P',
        categoryName: 'Single-Row Ball Bearing Steel Stages',
        familyPageDescription: 'Adaptor Plate, 450A Linear Stage',
        sourcePage:
          'https://www.newport.com/f/450a-series-compact-ball-bearing-linear-stage',
        priceCents: 7800,
        widthMm: 38.1,
        heightMm: 25.4,
        specs: {
          Material: 'Aluminum',
          Dimensions: '1.5 x 1.0 x 0.375 in.',
          'Thread Type': '8-32 & 1/4-20',
        },
      },
    ])
  })

  it('prefers the visible product breadcrumb over unrelated JSON breadcrumb arrays', () => {
    const html = `
<!DOCTYPE html>
<html>
  <body>
    <product-breadcrumb>
      <ol class="breadcrumb" aria-label="breadcrumbs">
        <li><a href="/c/product">Products</a></li>
        <li><a href="/c/motion-control">Motion Control</a></li>
        <li><a href="/c/single-row-ball-bearing-steel-stages">Single-Row Ball Bearing Steel Stages</a></li>
        <li class="active"><span>450A Series Compact Ball Bearing Stage</span></li>
      </ol>
    </product-breadcrumb>
    <script>
      window.__STATE__ = {
        "breadcrumbs": [
          { "name": "Footer Navigation Slot", "url": "/footer" },
          { "name": "Catalogues", "url": "/catalogues" }
        ],
        "accessoryTables": [
          {
            "productRows": [
              {
                "label": "450P",
                "product": {
                  "code": "450P",
                  "modelNumber": "450P",
                  "name": "450A Series Compact Ball Bearing Stage",
                  "summary": "Adaptor Plate, 450A Linear Stage",
                  "url": "/p/450P",
                  "price": { "value": 78 },
                  "specifications": [
                    { "key": "Dimensions", "value": ["1.5 x 1.0 x 0.375 in. "] }
                  ]
                }
              }
            ]
          }
        ]
      }
    </script>
  </body>
</html>`

    expect(
      extractNewportCatalogProductsFromFamilyPage(
        html,
        'https://www.newport.com/f/450a-series-compact-ball-bearing-linear-stage',
      ),
    ).toContainEqual(
      expect.objectContaining({
        partNumber: '450P',
        categoryName: 'Single-Row Ball Bearing Steel Stages',
      }),
    )
  })
})

describe('fetchTextWithTimeout', () => {
  it('aborts a stuck Newport fetch instead of waiting forever', async () => {
    vi.useFakeTimers()

    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    })

    const pending = fetchTextWithTimeout(
      'https://www.newport.com/f/example',
      fetchMock as typeof fetch,
      25,
    )
    const rejection = expect(pending).rejects.toThrow(
      'Timed out fetching Newport catalog URL "https://www.newport.com/f/example"',
    )

    await vi.advanceTimersByTimeAsync(25)

    await rejection
  })
})
