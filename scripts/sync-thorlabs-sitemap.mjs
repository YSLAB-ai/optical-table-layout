#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  extractThorlabsCatalogProducts,
  getThorlabsCatalogChildPrefixes,
  isThorlabsCatalogQueryTruncated,
} from './vendor/thorlabs-sitemap-index.mjs'

const ALGOLIA_ENDPOINT = 'https://TDDBKZ98JB-dsn.algolia.net/1/indexes/products_en/query'
const ALGOLIA_APPLICATION_ID = 'TDDBKZ98JB'
const ALGOLIA_SEARCH_API_KEY_ENV = 'ALGOLIA_SEARCH_API_KEY'
const DEFAULT_START_URL = 'algolia:products_en'
const DEFAULT_OUT = '.catalog-cache/thorlabs-catalog.json'
const USER_AGENT =
  'optical-table-layout-catalog-sync/0.1 (+https://railway.app)'
const MAX_PAGES = 5000
const HITS_PER_PAGE = 1000
const MAX_PREFIX_LENGTH = 5

function parseArgs(argv) {
  const args = {
    out: DEFAULT_OUT,
    startUrl: DEFAULT_START_URL,
    maxPages: MAX_PAGES,
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
    }
  }

  return args
}

async function fetchCatalogPage(query) {
  const algoliaSearchApiKey = process.env[ALGOLIA_SEARCH_API_KEY_ENV]

  if (!algoliaSearchApiKey) {
    throw new Error(
      `Set ${ALGOLIA_SEARCH_API_KEY_ENV} before syncing the Thorlabs catalog.`,
    )
  }

  const response = await fetch(ALGOLIA_ENDPOINT, {
    method: 'POST',
    headers: {
      'user-agent': USER_AGENT,
      'content-type': 'application/json',
      'x-algolia-application-id': ALGOLIA_APPLICATION_ID,
      'x-algolia-api-key': algoliaSearchApiKey,
    },
    body: JSON.stringify({
      query,
      hitsPerPage: HITS_PER_PAGE,
      restrictSearchableAttributes: ['objectID'],
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Thorlabs catalog query "${query}": ${response.status} ${response.statusText}`,
    )
  }

  return response.json()
}

async function crawlCatalogPrefix({
  prefix,
  maxRequests,
  products,
  state,
}) {
  if (state.requests >= maxRequests) {
    return
  }

  console.log(`Fetching Thorlabs catalog prefix ${prefix} (${state.requests + 1}/${maxRequests})`)
  const payload = await fetchCatalogPage(prefix)
  state.requests += 1

  if (isThorlabsCatalogQueryTruncated(payload) && prefix.length < MAX_PREFIX_LENGTH) {
    for (const childPrefix of getThorlabsCatalogChildPrefixes(prefix)) {
      if (state.requests >= maxRequests) {
        break
      }

      await crawlCatalogPrefix({
        prefix: childPrefix,
        maxRequests,
        products,
        state,
      })
    }

    return
  }

  if (isThorlabsCatalogQueryTruncated(payload)) {
    state.truncatedPrefixes.push(prefix)
  }

  const pageProducts = extractThorlabsCatalogProducts(payload, prefix)

  for (const product of pageProducts) {
    if (!products.has(product.partNumber)) {
      products.set(product.partNumber, product)
    }
  }
}

export async function crawlSitemap(startUrl, maxPages = MAX_PAGES) {
  const products = new Map()
  const state = {
    requests: 0,
    truncatedPrefixes: [],
  }
  const rootPrefixes = getThorlabsCatalogChildPrefixes('')

  for (const prefix of rootPrefixes) {
    if (state.requests >= maxPages) {
      break
    }

    await crawlCatalogPrefix({
      prefix,
      maxRequests: maxPages,
      products,
      state,
    })
  }

  return {
    generatedAt: new Date().toISOString(),
    source: startUrl,
    pagesFetched: state.requests,
    productCount: products.size,
    truncatedPrefixes: state.truncatedPrefixes,
    products: [...products.values()].sort((left, right) =>
      left.partNumber.localeCompare(right.partNumber),
    ),
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const outputPath = resolve(args.out)
  const data = await crawlSitemap(args.startUrl, args.maxPages)

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')

  console.log(
    `Wrote ${data.productCount} product records from ${data.pagesFetched} sitemap pages to ${outputPath}`,
  )
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
