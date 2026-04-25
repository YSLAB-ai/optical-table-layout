#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { crawlNewportCatalog } from './sync-newport-sitemap.mjs'
import { crawlSitemap } from './sync-thorlabs-sitemap.mjs'
import { writePublishedCatalogArtifacts } from './sync-vendor-links.mjs'

const DEFAULT_INPUT = 'scripts/vendor/sample-product-pages.json'
const DEFAULT_SNAPSHOT_OUTPUT = 'src/data/generated/vendorSnapshot.ts'
const DEFAULT_CATALOG_INDEX_OUTPUT = 'public/catalog/vendorCatalogIndex.json'
const DEFAULT_CATALOG_CACHE_OUTPUT = '.catalog-cache/thorlabs-catalog.json'
const DEFAULT_NEWPORT_CACHE_OUTPUT = '.catalog-cache/newport-catalog.json'
const DEFAULT_START_URL = 'algolia:products_en'
const DEFAULT_MAX_PAGES = 5000
const DEFAULT_NEWPORT_START_URL =
  'https://api.p1.mks.com/medias/sys_master/root/h38/h7f/9965227114526/Product-en-USD-14814400047465689503/Product-en-USD-14814400047465689503.xml'
const DEFAULT_NEWPORT_MAX_PAGES = 1024

function parseArgs(argv) {
  const args = {
    inputPath: DEFAULT_INPUT,
    outputPath: DEFAULT_SNAPSHOT_OUTPUT,
    catalogIndexOut: DEFAULT_CATALOG_INDEX_OUTPUT,
    sitemapOut: DEFAULT_CATALOG_CACHE_OUTPUT,
    newportOut: DEFAULT_NEWPORT_CACHE_OUTPUT,
    startUrl: DEFAULT_START_URL,
    maxPages: DEFAULT_MAX_PAGES,
    newportStartUrl: DEFAULT_NEWPORT_START_URL,
    newportMaxPages: DEFAULT_NEWPORT_MAX_PAGES,
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
    } else if (value === '--sitemap-out') {
      args.sitemapOut = argv[index + 1] ?? args.sitemapOut
      index += 1
    } else if (value === '--newport-out') {
      args.newportOut = argv[index + 1] ?? args.newportOut
      index += 1
    } else if (value === '--start-url') {
      args.startUrl = argv[index + 1] ?? args.startUrl
      index += 1
    } else if (value === '--newport-start-url') {
      args.newportStartUrl = argv[index + 1] ?? args.newportStartUrl
      index += 1
    } else if (value === '--max-pages') {
      const parsed = Number(argv[index + 1])

      if (Number.isFinite(parsed) && parsed > 0) {
        args.maxPages = parsed
      }

      index += 1
    } else if (value === '--newport-max-pages') {
      const parsed = Number(argv[index + 1])

      if (Number.isFinite(parsed) && parsed > 0) {
        args.newportMaxPages = parsed
      }

      index += 1
    }
  }

  return args
}

export async function writeCatalogSitemapCache({
  sitemapOut,
  sitemapData,
  rootDir = process.cwd(),
}) {
  const absoluteSitemapPath = resolve(rootDir, sitemapOut)

  await mkdir(dirname(absoluteSitemapPath), { recursive: true })
  await writeFile(absoluteSitemapPath, `${JSON.stringify(sitemapData, null, 2)}\n`, 'utf8')

  return absoluteSitemapPath
}

export async function publishCatalog({
  inputPath = DEFAULT_INPUT,
  outputPath = DEFAULT_SNAPSHOT_OUTPUT,
  catalogIndexOut = DEFAULT_CATALOG_INDEX_OUTPUT,
  sitemapOut = DEFAULT_CATALOG_CACHE_OUTPUT,
  newportOut = DEFAULT_NEWPORT_CACHE_OUTPUT,
  startUrl = DEFAULT_START_URL,
  maxPages = DEFAULT_MAX_PAGES,
  newportStartUrl = DEFAULT_NEWPORT_START_URL,
  newportMaxPages = DEFAULT_NEWPORT_MAX_PAGES,
  rootDir = process.cwd(),
} = {}) {
  const sitemapData = await crawlSitemap(startUrl, maxPages)
  const newportData = await crawlNewportCatalog(newportStartUrl, newportMaxPages)

  await writeCatalogSitemapCache({
    sitemapOut,
    sitemapData,
    rootDir,
  })
  await writeCatalogSitemapCache({
    sitemapOut: newportOut,
    sitemapData: newportData,
    rootDir,
  })

  const artifacts = await writePublishedCatalogArtifacts({
    inputPath,
    outputPath,
    catalogIndexOut,
    thorlabsCatalogPath: sitemapOut,
    thorlabsSitemapPath: sitemapOut,
    newportCatalogPath: newportOut,
    rootDir,
  })

  return {
    ...artifacts,
    sitemapData,
    newportData,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const result = await publishCatalog(args)

  console.log(
    `Published catalog snapshot with ${result.records.length} enriched products, ${result.sitemapData.productCount} Thorlabs catalog products, and ${result.newportData.productCount} Newport catalog products`,
  )
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
