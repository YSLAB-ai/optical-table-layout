#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  normalizeParsedProduct,
  normalizeSitemapProduct,
} from './vendor/normalize-component.mjs'
import { parseCoherentProductPage } from './vendor/coherent-parser.mjs'
import { parseLightConversionProductPage } from './vendor/light-conversion-parser.mjs'
import { parseNewportProductPage } from './vendor/newport-parser.mjs'
import { parseThorlabsProductPage } from './vendor/thorlabs-parser.mjs'

const PARSERS = {
  Thorlabs: parseThorlabsProductPage,
  Newport: parseNewportProductPage,
  Coherent: parseCoherentProductPage,
  'Light Conversion': parseLightConversionProductPage,
}

const DEFAULT_INPUT = 'scripts/vendor/sample-product-pages.json'
const DEFAULT_SNAPSHOT_OUTPUT = 'src/data/generated/vendorSnapshot.ts'
const DEFAULT_CATALOG_INDEX_OUTPUT = 'public/catalog/vendorCatalogIndex.json'

function parseArgs(argv) {
  const args = {
    inputPath: DEFAULT_INPUT,
    outputPath: DEFAULT_SNAPSHOT_OUTPUT,
    catalogIndexOut: DEFAULT_CATALOG_INDEX_OUTPUT,
    thorlabsCatalogPath: null,
    thorlabsSitemapPath: null,
    newportCatalogPath: null,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (value === '--input') {
      args.inputPath = argv[index + 1] ?? args.inputPath
      index += 1
    } else if (value === '--out') {
      args.outputPath = argv[index + 1] ?? args.outputPath
      index += 1
    } else if (value === '--catalog-index-out') {
      args.catalogIndexOut = argv[index + 1] ?? args.catalogIndexOut
      index += 1
    } else if (value === '--thorlabs-catalog-json') {
      args.thorlabsCatalogPath = argv[index + 1] ?? args.thorlabsCatalogPath
      index += 1
    } else if (value === '--thorlabs-sitemap-json') {
      args.thorlabsSitemapPath = argv[index + 1] ?? args.thorlabsSitemapPath
      index += 1
    } else if (value === '--newport-catalog-json') {
      args.newportCatalogPath = argv[index + 1] ?? args.newportCatalogPath
      index += 1
    }
  }

  return args
}

function formatValue(value, indent = 0) {
  const padding = ' '.repeat(indent)
  const childPadding = ' '.repeat(indent + 2)

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]'
    }

    return `[\n${value
      .map((entry) => `${childPadding}${formatValue(entry, indent + 2)}`)
      .join(',\n')}\n${padding}]`
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)

    if (entries.length === 0) {
      return '{}'
    }

    return `{\n${entries
      .map(
        ([key, entryValue]) =>
          `${childPadding}${formatObjectKey(key)}: ${formatValue(entryValue, indent + 2)}`,
      )
      .join(',\n')}\n${padding}}`
  }

  if (typeof value === 'string') {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  }

  if (value === null) {
    return 'null'
  }

  return String(value)
}

function formatObjectKey(key) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
    ? key
    : `'${key.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

function getCatalogIdentity(component) {
  return `${component.supplier.trim().toLowerCase()}:${component.partNumber
    .trim()
    .toLowerCase()}`
}

export async function loadNormalizedProductsFromEntries({ entries, rootDir }) {
  const records = []

  for (const entry of entries) {
    const html = await readFile(resolve(rootDir, entry.fixturePath), 'utf8')
    const parser = PARSERS[entry.vendor]

    if (!parser) {
      throw new Error(`Unsupported vendor: ${entry.vendor}`)
    }

    records.push(normalizeParsedProduct(parser(html, entry.url)))
  }

  return records
}

export function generateVendorSnapshotModuleFromRecords({
  publishedAt,
  records,
}) {
  return `import type { Component } from '../../types'\n\nexport const GENERATED_VENDOR_SNAPSHOT_PUBLISHED_AT = '${publishedAt}'\n\nexport const GENERATED_VENDOR_SNAPSHOT: Component[] = ${formatValue(records)}\n`
}

export async function generateVendorSnapshotModule({ entries, rootDir }) {
  const publishedAt = new Date().toISOString()
  const records = await loadNormalizedProductsFromEntries({ entries, rootDir })

  return generateVendorSnapshotModuleFromRecords({ publishedAt, records })
}

export function buildPublishedCatalogIndex({
  publishedAt,
  enrichedComponents,
  thorlabsCatalogProducts,
  newportCatalogProducts = [],
}) {
  const merged = new Map()

  for (const product of thorlabsCatalogProducts) {
    const component = normalizeSitemapProduct({
      vendor: 'Thorlabs',
      ...product,
    })

    merged.set(getCatalogIdentity(component), component)
  }

  for (const product of newportCatalogProducts) {
    const component = normalizeSitemapProduct({
      vendor: 'Newport',
      ...product,
    })

    merged.set(getCatalogIdentity(component), component)
  }

  for (const component of enrichedComponents) {
    merged.set(getCatalogIdentity(component), component)
  }

  return {
    publishedAt,
    counts: {
      enriched: enrichedComponents.length,
      thorlabsCatalog: thorlabsCatalogProducts.length,
      newportCatalog: newportCatalogProducts.length,
      total: merged.size,
    },
    components: [...merged.values()].sort(
      (left, right) =>
        left.supplier.localeCompare(right.supplier) ||
        left.partNumber.localeCompare(right.partNumber),
    ),
  }
}

export async function writePublishedCatalogArtifacts({
  inputPath = DEFAULT_INPUT,
  outputPath = DEFAULT_SNAPSHOT_OUTPUT,
  catalogIndexOut = DEFAULT_CATALOG_INDEX_OUTPUT,
  thorlabsCatalogPath = null,
  thorlabsSitemapPath = null,
  newportCatalogPath = null,
  rootDir = process.cwd(),
} = {}) {
  const entries = JSON.parse(await readFile(resolve(rootDir, inputPath), 'utf8'))
  const publishedAt = new Date().toISOString()
  const records = await loadNormalizedProductsFromEntries({ entries, rootDir })
  const moduleText = generateVendorSnapshotModuleFromRecords({
    publishedAt,
    records,
  })
  const absoluteOutputPath = resolve(rootDir, outputPath)

  await mkdir(dirname(absoluteOutputPath), { recursive: true })
  await writeFile(absoluteOutputPath, moduleText, 'utf8')

  let catalogIndexText = null

  if (catalogIndexOut) {
    const absoluteCatalogIndexPath = resolve(rootDir, catalogIndexOut)
    const thorlabsCatalogSource = thorlabsCatalogPath ?? thorlabsSitemapPath
    const thorlabsCatalogData = thorlabsCatalogSource
      ? JSON.parse(await readFile(resolve(rootDir, thorlabsCatalogSource), 'utf8'))
      : { products: [] }
    const newportCatalogData = newportCatalogPath
      ? JSON.parse(await readFile(resolve(rootDir, newportCatalogPath), 'utf8'))
      : { products: [] }
    const publishedCatalogIndex = buildPublishedCatalogIndex({
      publishedAt,
      enrichedComponents: records,
      thorlabsCatalogProducts: thorlabsCatalogData.products ?? [],
      newportCatalogProducts: newportCatalogData.products ?? [],
    })

    catalogIndexText = `${JSON.stringify(publishedCatalogIndex, null, 2)}\n`
    await mkdir(dirname(absoluteCatalogIndexPath), { recursive: true })
    await writeFile(absoluteCatalogIndexPath, catalogIndexText, 'utf8')
  }

  return {
    moduleText,
    catalogIndexText,
    publishedAt,
    records,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const result = await writePublishedCatalogArtifacts({
    inputPath: args.inputPath,
    outputPath: args.outputPath,
    catalogIndexOut: args.catalogIndexOut,
    thorlabsCatalogPath: args.thorlabsCatalogPath,
    thorlabsSitemapPath: args.thorlabsSitemapPath,
    newportCatalogPath: args.newportCatalogPath,
  })

  console.log(
    `Generated vendor snapshot module (${result.moduleText.length} chars)` +
      (result.catalogIndexText
        ? ` and catalog index (${result.catalogIndexText.length} chars)`
        : ''),
  )
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
