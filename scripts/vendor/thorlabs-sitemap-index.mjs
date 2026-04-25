const BASE_URL = 'https://www.thorlabs.com'
const THORLABS_CATALOG_PREFIX_CHARSET = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  '-',
  '/',
  '.',
]

function normalizeUrl(href, baseUrl = BASE_URL) {
  if (!href) {
    return null
  }

  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return null
  }
}

function normalizePartNumber(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

function normalizeDescription(hit) {
  return String(hit?.name ?? hit?.familyPageName ?? hit?.objectID ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getThorlabsCatalogPageCount(payload) {
  const count = Number(payload?.nbPages)
  return Number.isFinite(count) && count > 0 ? count : 0
}

export function isThorlabsCatalogQueryTruncated(payload) {
  const nbHits = Number(payload?.nbHits)
  const hitCount = Array.isArray(payload?.hits)
    ? payload.hits.length
    : Number(payload?.hitsPerPage)

  return Number.isFinite(nbHits) && Number.isFinite(hitCount) && nbHits > hitCount
}

export function getThorlabsCatalogChildPrefixes(prefix) {
  return THORLABS_CATALOG_PREFIX_CHARSET.map((character) => `${prefix}${character}`)
}

export function extractThorlabsCatalogProducts(payload, sourceKey = 0) {
  const entries = new Map()
  const hits = Array.isArray(payload?.hits) ? payload.hits : []

  for (const hit of hits) {
    const partNumber = normalizePartNumber(hit.objectID)
    const description = normalizeDescription(hit)

    if (!partNumber || !description) {
      continue
    }

    entries.set(partNumber, {
      partNumber,
      description,
      detailUrl: normalizeUrl(hit.url ?? hit.familyPageUrl),
      categoryName: String(hit.visualNavigationParentName ?? '')
        .replace(/\s+/g, ' ')
        .trim(),
      sourcePage: `algolia:products_en:${sourceKey}`,
    })
  }

  return [...entries.values()]
}
