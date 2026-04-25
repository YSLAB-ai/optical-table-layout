import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  buildPublishedCatalogIndex,
  generateVendorSnapshotModule,
} from './sync-vendor-links.mjs'
import { parseCoherentProductPage } from './vendor/coherent-parser.mjs'
import { parseLightConversionProductPage } from './vendor/light-conversion-parser.mjs'
import { normalizeSitemapProduct } from './vendor/normalize-component.mjs'
import { parseNewportProductPage } from './vendor/newport-parser.mjs'
import { parseThorlabsProductPage } from './vendor/thorlabs-parser.mjs'

function loadFixture(pathname: string): string {
  return readFileSync(new URL(pathname, import.meta.url), 'utf8')
}

describe('vendor product parsers', () => {
  it('parses a Thorlabs product page into raw fields', () => {
    const html = loadFixture('./vendor/fixtures/thorlabs-polaris-k1e3.html')

    expect(
      parseThorlabsProductPage(
        html,
        'https://www.thorlabs.com/newgrouppage9.cfm?pn=POLARIS-K1E3',
      ),
    ).toMatchObject({
      vendor: 'Thorlabs',
      partNumber: 'POLARIS-K1E3',
      name: 'POLARIS-K1E3 E-Series Kinematic Mirror Mount',
      priceCents: 26500,
      widthMm: 50,
      heightMm: 50,
      specs: {
        Material: 'Stainless Steel',
      },
    })
  })

  it('parses a Newport product page into raw fields', () => {
    const html = loadFixture('./vendor/fixtures/newport-m-u100.html')

    expect(parseNewportProductPage(html, 'https://www.newport.com/p/M-U100')).toMatchObject({
      vendor: 'Newport',
      partNumber: 'M-U100',
      name: 'M-U100 Linear Translation Stage',
      priceCents: 41000,
      widthMm: 100,
      heightMm: 60,
      specs: {
        Travel: '25 mm',
      },
    })
  })

  it('parses a Coherent product page into raw fields', () => {
    const html = loadFixture('./vendor/fixtures/coherent-monaco.html')

    expect(
      parseCoherentProductPage(
        html,
        'https://www.coherent.com/lasers/femtosecond-lasers/monaco',
      ),
    ).toMatchObject({
      vendor: 'Coherent',
      partNumber: 'MONACO',
      name: 'Monaco Industrial Femtosecond Laser',
      widthMm: 620,
      heightMm: 300,
      specs: {
        Wavelength: '1035 nm',
        'Average Power': '40 W',
      },
    })
  })

  it('parses a Light Conversion product page into raw fields', () => {
    const html = loadFixture('./vendor/fixtures/light-conversion-carbide.html')

    expect(
      parseLightConversionProductPage(
        html,
        'https://lightcon.com/product/carbide-cb5/?sku=CB5',
      ),
    ).toMatchObject({
      vendor: 'Light Conversion',
      partNumber: 'CB5',
      name: 'Carbide CB5 Ultrafast Laser',
      widthMm: 540,
      heightMm: 240,
      specs: {
        Wavelength: '1030 nm',
        'Pulse Energy': '120 uJ',
      },
    })
  })
})

describe('generateVendorSnapshotModule', () => {
  it('writes a typed vendor snapshot module from parsed vendor pages', async () => {
    const moduleText = await generateVendorSnapshotModule({
      entries: [
        {
          vendor: 'Thorlabs',
          url: 'https://www.thorlabs.com/newgrouppage9.cfm?pn=POLARIS-K1E3',
          fixturePath: 'scripts/vendor/fixtures/thorlabs-polaris-k1e3.html',
        },
        {
          vendor: 'Coherent',
          url: 'https://www.coherent.com/lasers/femtosecond-lasers/monaco',
          fixturePath: 'scripts/vendor/fixtures/coherent-monaco.html',
        },
      ],
      rootDir: process.cwd(),
    })

    expect(moduleText).toContain('export const GENERATED_VENDOR_SNAPSHOT')
    expect(moduleText).toContain('export const GENERATED_VENDOR_SNAPSHOT_PUBLISHED_AT')
    expect(moduleText).toContain('POLARIS-K1E3')
    expect(moduleText).toContain('MONACO')
    expect(moduleText).toContain("kind: 'snapshot'")
    expect(moduleText).toContain("reviewStatus: 'published'")
    expect(moduleText).toContain("'Average Power': '40 W'")
  })
})

describe('buildPublishedCatalogIndex', () => {
  it('merges sitemap fallback records with enriched parsed products for a deduped search catalog', async () => {
    const snapshotModule = await generateVendorSnapshotModule({
      entries: [
        {
          vendor: 'Thorlabs',
          url: 'https://www.thorlabs.com/newgrouppage9.cfm?pn=POLARIS-K1E3',
          fixturePath: 'scripts/vendor/fixtures/thorlabs-polaris-k1e3.html',
        },
      ],
      rootDir: process.cwd(),
    })

    expect(snapshotModule).toContain('POLARIS-K1E3')

    const published = buildPublishedCatalogIndex({
      publishedAt: '2026-04-03T12:00:00.000Z',
      enrichedComponents: [
        normalizeSitemapProduct({
          vendor: 'Thorlabs',
          partNumber: 'POLARIS-K1E3',
          description: 'POLARIS-K1E3 E-Series Kinematic Mirror Mount',
          detailUrl: 'https://www.thorlabs.com/newgrouppage9.cfm?pn=POLARIS-K1E3',
        }),
        {
          ...normalizeSitemapProduct({
            vendor: 'Thorlabs',
            partNumber: 'POLARIS-K1E3',
            description: 'POLARIS-K1E3 E-Series Kinematic Mirror Mount',
            detailUrl: 'https://www.thorlabs.com/newgrouppage9.cfm?pn=POLARIS-K1E3',
          }),
          priceCents: 26500,
          reviewStatus: 'published',
          specs: { Material: 'Stainless Steel' },
        },
      ],
      thorlabsCatalogProducts: [
        {
          partNumber: 'POLARIS-K1E3',
          description: 'POLARIS-K1E3 E-Series Kinematic Mirror Mount',
          detailUrl: 'https://www.thorlabs.com/newgrouppage9.cfm?pn=POLARIS-K1E3',
          categoryName: 'Mirror Mounts',
          sourcePage: 'algolia:products_en:0',
        },
        {
          partNumber: 'KM100',
          description: '1" Kinematic Mirror Mount',
          detailUrl:
            'https://www.thorlabs.com/newgrouppage9.cfm?objectgroup_id=1492&pn=KM100',
          categoryName: 'Mirror Mounts',
          sourcePage: 'algolia:products_en:0',
        },
      ],
    })

    expect(published.publishedAt).toBe('2026-04-03T12:00:00.000Z')
    expect(published.components).toHaveLength(2)
    expect(
      published.components.find((component) => component.partNumber === 'POLARIS-K1E3'),
    ).toMatchObject({
      priceCents: 26500,
      reviewStatus: 'published',
    })
    expect(
      published.components.find((component) => component.partNumber === 'KM100'),
    ).toMatchObject({
      supplier: 'Thorlabs',
      reviewStatus: 'needs_review',
      priceCents: 0,
    })
  })

  it('merges Newport catalog rows with explicit prices and footprints into the published index', () => {
    const published = buildPublishedCatalogIndex({
      publishedAt: '2026-04-04T12:00:00.000Z',
      enrichedComponents: [],
      thorlabsCatalogProducts: [],
      newportCatalogProducts: [
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
            Dimensions: '1.5 x 1.0 x 0.375 in.',
          },
        },
      ],
    })

    expect(published.counts).toMatchObject({
      enriched: 0,
      thorlabsCatalog: 0,
      newportCatalog: 1,
      total: 1,
    })
    expect(published.components).toHaveLength(1)
    expect(published.components[0]).toMatchObject({
      supplier: 'Newport',
      partNumber: '450P',
      priceCents: 7800,
      widthMm: 38.1,
      heightMm: 25.4,
      reviewStatus: 'published',
      specs: {
        Dimensions: '1.5 x 1.0 x 0.375 in.',
      },
    })
  })
})
