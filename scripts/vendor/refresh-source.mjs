import { parseThorlabsProductPage } from './thorlabs-parser.mjs'

function toSourceRecord(parsed, refreshedAt) {
  return {
    supplier: parsed.vendor,
    partNumber: parsed.partNumber,
    name: parsed.name,
    category: parsed.category ?? 'Other',
    widthMm: parsed.widthMm,
    heightMm: parsed.heightMm,
    priceCents: parsed.priceCents,
    url: parsed.url,
    notes: parsed.notes ?? '',
    specs: parsed.specs ?? {},
    extraction: {
      price: parsed.priceCents > 0 ? 'explicit' : 'missing',
      footprint:
        parsed.widthMm > 1 && parsed.heightMm > 1 ? 'explicit' : 'missing',
      refreshedAt,
    },
    reviewStatus:
      parsed.priceCents > 0 && parsed.widthMm > 1 && parsed.heightMm > 1
        ? 'published'
        : 'needs_review',
  }
}

export async function enrichThorlabsCatalogProducts(
  products,
  fetchImpl = fetch,
  refreshedAt,
) {
  const records = []

  for (const product of products) {
    const response = await fetchImpl(product.detailUrl)

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Thorlabs detail page: ${product.detailUrl}`,
      )
    }

    const html = await response.text()
    records.push(
      toSourceRecord(parseThorlabsProductPage(html, product.detailUrl), refreshedAt),
    )
  }

  return records
}
