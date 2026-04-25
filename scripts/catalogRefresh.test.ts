import { readFileSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

import { enrichThorlabsCatalogProducts } from './vendor/refresh-source.mjs'
import { parseThorlabsProductPage } from './vendor/thorlabs-parser.mjs'

function loadFixture(pathname: string) {
  return readFileSync(new URL(pathname, import.meta.url), 'utf8')
}

describe('parseThorlabsProductPage', () => {
  it('extracts explicit RS1 price and footprint from the product detail page', () => {
    const html = loadFixture('./vendor/fixtures/thorlabs-rs1.html')

    expect(
      parseThorlabsProductPage(
        html,
        'https://www.thorlabs.com/thorproduct.cfm?partnumber=RS1',
      ),
    ).toMatchObject({
      vendor: 'Thorlabs',
      partNumber: 'RS1',
      priceCents: 660,
      widthMm: 13,
      heightMm: 13,
    })
  })
})

describe('enrichThorlabsCatalogProducts', () => {
  it('fetches detail pages for discovered Thorlabs products before writing source records', async () => {
    const html = loadFixture('./vendor/fixtures/thorlabs-rs1.html')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(html, { status: 200, headers: { 'content-type': 'text/html' } }),
    )

    const records = await enrichThorlabsCatalogProducts(
      [
        {
          partNumber: 'RS1',
          description: 'Ø1/2" Pillar Post, 1/4"-20 Taps, L = 1"',
          detailUrl: 'https://www.thorlabs.com/thorproduct.cfm?partnumber=RS1',
          categoryName: 'Posts',
        },
      ],
      fetchMock as typeof fetch,
      '2026-04-16T12:00:00.000Z',
    )

    expect(records[0]).toMatchObject({
      supplier: 'Thorlabs',
      partNumber: 'RS1',
      widthMm: 13,
      heightMm: 13,
      priceCents: 660,
      extraction: {
        price: 'explicit',
        footprint: 'explicit',
      },
      reviewStatus: 'published',
    })
  })
})
