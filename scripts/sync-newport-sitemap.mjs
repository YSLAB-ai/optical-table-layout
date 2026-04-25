#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  extractNewportCatalogProductsFromFamilyPage,
  extractNewportFamilyUrls,
} from './vendor/newport-sitemap-index.mjs'

const DEFAULT_START_URL =
  'https://api.p1.mks.com/medias/sys_master/root/h38/h7f/9965227114526/Product-en-USD-14814400047465689503/Product-en-USD-14814400047465689503.xml'
const DEFAULT_OUT = '.catalog-cache/newport-catalog.json'
const DEFAULT_MAX_PAGES = 1024
const DEFAULT_CONCURRENCY = 4
const DEFAULT_TIMEOUT_MS = 20000
const USER_AGENT =
  'optical-table-layout-catalog-sync/0.1 (+https://railway.app)'

function parseArgs(argv) {
  const args = {
    out: DEFAULT_OUT,
    startUrl: DEFAULT_START_URL,
    maxPages: DEFAULT_MAX_PAGES,
    concurrency: DEFAULT_CONCURRENCY,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (value === '--out') {
      args.out = argv[index + 1] ?? args.out
      index += 1
    } else if (value === '--start-url') {
      args.startUrl = argv[index + 1] ?? args.startUrl
      index += 1
    } else if (value === '--max-pages') {
      const parsed = Number(argv[index + 1])

      if (Number.isFinite(parsed) && parsed > 0) {
        args.maxPages = parsed
      }

      index += 1
    } else if (value === '--concurrency') {
      const parsed = Number(argv[index + 1])

      if (Number.isFinite(parsed) && parsed > 0) {
        args.concurrency = parsed
      }

      index += 1
    } else if (value === '--timeout-ms') {
      const parsed = Number(argv[index + 1])

      if (Number.isFinite(parsed) && parsed > 0) {
        args.timeoutMs = parsed
      }

      index += 1
    }
  }

  return args
}

export async function fetchTextWithTimeout(
  url,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  let response

  try {
    response = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        'user-agent': USER_AGENT,
      },
    })
  } catch (error) {
    clearTimeout(timeoutId)

    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
      throw new Error(`Timed out fetching Newport catalog URL "${url}"`)
    }

    throw error
  }

  clearTimeout(timeoutId)

  if (!response.ok) {
    throw new Error(`Failed to fetch Newport catalog URL "${url}": ${response.status}`)
  }

  return response.text()
}

async function fetchText(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return fetchTextWithTimeout(url, fetch, timeoutMs)
}

export async function crawlNewportCatalog(
  startUrl = DEFAULT_START_URL,
  maxPages = DEFAULT_MAX_PAGES,
  concurrency = DEFAULT_CONCURRENCY,
  timeoutMs = DEFAULT_TIMEOUT_MS,
) {
  const sitemapXml = await fetchText(startUrl, timeoutMs)
  const familyUrls = extractNewportFamilyUrls(sitemapXml).slice(0, maxPages)
  const products = new Map()
  const failures = []
  let pagesFetched = 0
  let cursor = 0

  console.log(
    `Fetching Newport catalog from ${familyUrls.length} family pages with concurrency ${Math.min(concurrency, familyUrls.length)}`,
  )

  async function worker() {
    while (cursor < familyUrls.length) {
      const familyUrl = familyUrls[cursor]
      cursor += 1

      try {
        const html = await fetchText(familyUrl, timeoutMs)
        const pageProducts = extractNewportCatalogProductsFromFamilyPage(
          html,
          familyUrl,
        )

        pagesFetched += 1

        if (pagesFetched % 50 === 0 || pagesFetched === familyUrls.length) {
          console.log(`Fetched ${pagesFetched}/${familyUrls.length} Newport family pages`)
        }

        for (const product of pageProducts) {
          if (!products.has(product.partNumber)) {
            products.set(product.partNumber, product)
          }
        }
      } catch (error) {
        failures.push({
          url: familyUrl,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, familyUrls.length) }, () => worker()),
  )

  return {
    generatedAt: new Date().toISOString(),
    source: startUrl,
    pagesFetched,
    familyCount: familyUrls.length,
    productCount: products.size,
    failures,
    products: [...products.values()].sort((left, right) =>
      left.partNumber.localeCompare(right.partNumber),
    ),
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const outputPath = resolve(args.out)
  const data = await crawlNewportCatalog(
    args.startUrl,
    args.maxPages,
    args.concurrency,
    args.timeoutMs,
  )

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')

  console.log(
    `Wrote ${data.productCount} Newport product records from ${data.pagesFetched} family pages to ${outputPath}`,
  )
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
