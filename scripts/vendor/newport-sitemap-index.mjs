import { extractDimensionsMm } from './normalize-component.mjs'

const NEWPORT_BASE_URL = 'https://www.newport.com'

function decodeXml(text = '') {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function extractJsonArraysAfterKey(text, key) {
  const arrays = []
  let searchIndex = 0

  while (searchIndex < text.length) {
    const keyIndex = text.indexOf(key, searchIndex)

    if (keyIndex === -1) {
      break
    }

    const startIndex = text.indexOf('[', keyIndex)

    if (startIndex === -1) {
      break
    }

    let depth = 0
    let inString = false
    let escaped = false

    for (let index = startIndex; index < text.length; index += 1) {
      const character = text[index]

      if (inString) {
        if (escaped) {
          escaped = false
        } else if (character === '\\') {
          escaped = true
        } else if (character === '"') {
          inString = false
        }

        continue
      }

      if (character === '"') {
        inString = true
        continue
      }

      if (character === '[') {
        depth += 1
      } else if (character === ']') {
        depth -= 1

        if (depth === 0) {
          arrays.push(JSON.parse(text.slice(startIndex, index + 1)))
          searchIndex = index + 1
          break
        }
      }
    }

    if (searchIndex <= keyIndex) {
      break
    }
  }

  return arrays
}

function stripTags(text = '') {
  return decodeXml(text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
}

function extractBreadcrumbCategoryName(html) {
  const breadcrumbHtmlMatch = html.match(
    /<ol[^>]*class="breadcrumb"[^>]*aria-label="breadcrumbs"[^>]*>([\s\S]*?)<\/ol>/i,
  )

  if (breadcrumbHtmlMatch) {
    const items = [...breadcrumbHtmlMatch[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((match) => stripTags(match[1]))
      .filter(Boolean)

    if (items.length >= 2) {
      return items.at(-2) || 'Other'
    }
  }

  const breadcrumbArrays = extractJsonArraysAfterKey(html, '"breadcrumbs"')
  const breadcrumbs = breadcrumbArrays.at(0)

  if (!Array.isArray(breadcrumbs) || breadcrumbs.length < 2) {
    return 'Other'
  }

  return breadcrumbs.at(-2)?.name?.trim() || 'Other'
}

function normalizeSpecValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter(Boolean)
      .join(', ')
  }

  return String(value ?? '').trim()
}

function buildSpecsMap(specifications = []) {
  return specifications.reduce((specs, specification) => {
    const key = String(specification?.key ?? '').trim()
    const value = normalizeSpecValue(specification?.value)

    if (!key || !value) {
      return specs
    }

    specs[key] = value
    return specs
  }, {})
}

function toAbsoluteNewportUrl(url = '') {
  if (!url) {
    return ''
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  return `${NEWPORT_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

function toCatalogProduct(productRow, categoryName, familyUrl) {
  const product = productRow?.product ?? {}
  const specs = buildSpecsMap(product.specifications ?? [])
  const dimensions = extractDimensionsMm(specs.Dimensions ?? '')
  const partNumber = String(
    product.modelNumber ?? product.code ?? productRow?.label ?? '',
  )
    .trim()
    .toUpperCase()

  if (!partNumber) {
    return null
  }

  return {
    vendor: 'Newport',
    partNumber,
    description: String(product.name ?? partNumber).trim(),
    detailUrl: toAbsoluteNewportUrl(product.url),
    categoryName,
    familyPageDescription: String(product.summary ?? '').trim(),
    sourcePage: familyUrl,
    priceCents: Math.round(Number(product.price?.value ?? 0) * 100),
    widthMm: dimensions.widthMm,
    heightMm: dimensions.heightMm,
    specs,
  }
}

export function extractNewportFamilyUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
    decodeXml(match[1].trim()),
  )
}

export function extractNewportCatalogProductsFromFamilyPage(html, familyUrl) {
  const categoryName = extractBreadcrumbCategoryName(html)
  const productRowArrays = extractJsonArraysAfterKey(html, '"productRows"')
  const products = new Map()

  for (const productRows of productRowArrays) {
    if (!Array.isArray(productRows)) {
      continue
    }

    for (const productRow of productRows) {
      const catalogProduct = toCatalogProduct(productRow, categoryName, familyUrl)

      if (catalogProduct) {
        products.set(catalogProduct.partNumber, catalogProduct)
      }
    }
  }

  return [...products.values()].sort((left, right) =>
    left.partNumber.localeCompare(right.partNumber),
  )
}
