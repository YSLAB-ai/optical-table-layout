function decodeHtml(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export function stripTags(text = '') {
  return decodeHtml(text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
}

export function extractHeadingText(html) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  return stripTags(match?.[1] ?? '')
}

export function extractLabelValue(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const inlineMatch = html.match(new RegExp(`${escaped}:\\s*([^<\\n]+)`, 'i'))

  if (inlineMatch) {
    return inlineMatch[1].trim()
  }

  const tableMatch = html.match(
    new RegExp(`<th[^>]*>${escaped}</th>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`, 'i'),
  )

  return tableMatch ? stripTags(tableMatch[1]) : ''
}

export function extractPriceCents(html) {
  const match = html.match(/\$([0-9,]+(?:\.[0-9]{2})?)/)

  if (!match) {
    return 0
  }

  return Math.round(Number.parseFloat(match[1].replace(/,/g, '')) * 100)
}

export function extractDimensionsMm(text) {
  const match = text.match(/([0-9.]+)\s*mm\s*x\s*([0-9.]+)\s*mm/i)

  if (match) {
    return {
      widthMm: Number.parseFloat(match[1]),
      heightMm: Number.parseFloat(match[2]),
    }
  }

  const inchMatch = text.match(
    /([0-9.]+)\s*(?:x|×)\s*([0-9.]+)(?:\s*(?:x|×)\s*[0-9.]+)?\s*(?:"|in\.?)/i,
  )

  if (inchMatch) {
    return {
      widthMm: Number.parseFloat((Number.parseFloat(inchMatch[1]) * 25.4).toFixed(1)),
      heightMm: Number.parseFloat((Number.parseFloat(inchMatch[2]) * 25.4).toFixed(1)),
    }
  }

  return {
    widthMm: 1,
    heightMm: 1,
  }
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function inferCategory(partNumber, name) {
  const normalizedPartNumber = partNumber.toUpperCase()
  const normalizedName = name.toLowerCase()

  if (
    /^(MONACO|AVIA|CB|PHAROS|CARBIDE)/.test(normalizedPartNumber) ||
    normalizedName.includes('laser')
  ) {
    return 'Lasers'
  }

  if (/^(KM|POLARIS|U1|U2)/.test(normalizedPartNumber)) {
    return 'Mirror Mounts'
  }

  if (/^M-/.test(normalizedPartNumber) || normalizedName.includes('stage')) {
    return 'Stages'
  }

  return 'Other'
}

function inferColor(category) {
  if (category === 'Lasers') {
    return '#3d2750'
  }

  if (category === 'Mirror Mounts') {
    return '#2a1a3a'
  }

  if (category === 'Stages') {
    return '#2a3a1a'
  }

  return '#243045'
}

function parseFractionalInches(value) {
  const trimmed = value.trim()

  if (trimmed.includes('/')) {
    const [numeratorText, denominatorText] = trimmed.split('/')
    const numerator = Number.parseFloat(numeratorText)
    const denominator = Number.parseFloat(denominatorText)

    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
      return numerator / denominator
    }
  }

  const parsed = Number.parseFloat(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function extractOpticDiameterMm(text) {
  const inchMatch = text.match(/Ø?\s*([0-9./]+)\s*"/i)

  if (inchMatch) {
    const inches = parseFractionalInches(inchMatch[1])

    if (inches) {
      return Number.parseFloat((inches * 25.4).toFixed(1))
    }
  }

  const metricMatch = text.match(/Ø?\s*([0-9.]+)\s*mm/i)

  if (metricMatch) {
    return Number.parseFloat(metricMatch[1])
  }

  return null
}

function inferFallbackFootprint(partNumber, name, category) {
  const diameterMm = extractOpticDiameterMm(`${partNumber} ${name}`)

  if (category === 'Posts') {
    return { widthMm: 13, heightMm: 13 }
  }

  if (category === 'Post Holders') {
    return { widthMm: 30, heightMm: 30 }
  }

  if (category === 'Stages') {
    return { widthMm: 76, heightMm: 76 }
  }

  if (category === 'Lasers') {
    return { widthMm: 320, heightMm: 180 }
  }

  if (category === 'Mirror Mounts') {
    if (partNumber.startsWith('POLARIS')) {
      return { widthMm: 50, heightMm: 50 }
    }

    if (diameterMm && diameterMm > 30) {
      return { widthMm: 64, heightMm: 64 }
    }

    return { widthMm: 38, heightMm: 38 }
  }

  if (category === 'Lens Mounts') {
    if (diameterMm && diameterMm > 40) {
      return { widthMm: 50, heightMm: 50 }
    }

    if (diameterMm && diameterMm > 25.4) {
      return { widthMm: 40, heightMm: 40 }
    }

    return { widthMm: 30, heightMm: 30 }
  }

  if (category === 'Beam Splitters') {
    if (diameterMm && diameterMm > 30) {
      return { widthMm: 50, heightMm: 50 }
    }

    return { widthMm: 25, heightMm: 25 }
  }

  if (category === 'Mirrors' || category === 'Lenses' || category === 'Irises') {
    if (diameterMm && diameterMm > 30) {
      return { widthMm: 50, heightMm: 50 }
    }

    if (diameterMm && diameterMm > 15) {
      return { widthMm: 25, heightMm: 25 }
    }
  }

  return { widthMm: 25, heightMm: 25 }
}

export function normalizeParsedProduct(rawProduct) {
  const partNumber = rawProduct.partNumber.trim().toUpperCase()
  const category = inferCategory(partNumber, rawProduct.name)

  return {
    id: `snapshot-${slugify(rawProduct.vendor)}-${slugify(partNumber)}`,
    partNumber,
    name: rawProduct.name.trim() || partNumber,
    supplier: rawProduct.vendor,
    category,
    widthMm: rawProduct.widthMm,
    heightMm: rawProduct.heightMm,
    anchorOffsetX: 0,
    anchorOffsetY: 0,
    color: inferColor(category),
    url: rawProduct.url,
    priceCents: rawProduct.priceCents ?? 0,
    notes: rawProduct.notes ?? '',
    specs: rawProduct.specs ?? {},
    source: {
      kind: 'snapshot',
      vendor: rawProduct.vendor,
    },
    reviewStatus:
      rawProduct.widthMm > 1 && rawProduct.heightMm > 1
        ? 'published'
        : 'needs_review',
    isBuiltIn: true,
  }
}

export function normalizeSitemapProduct(rawProduct) {
  const partNumber = rawProduct.partNumber.trim().toUpperCase()
  const name = rawProduct.description.trim() || partNumber
  const category = rawProduct.categoryName?.trim() || inferCategory(partNumber, name)
  const hasExplicitFootprint =
    Number.isFinite(rawProduct.widthMm) &&
    Number.isFinite(rawProduct.heightMm) &&
    rawProduct.widthMm > 1 &&
    rawProduct.heightMm > 1
  const { widthMm, heightMm } = hasExplicitFootprint
    ? {
        widthMm: rawProduct.widthMm,
        heightMm: rawProduct.heightMm,
      }
    : inferFallbackFootprint(partNumber, name, category)

  return {
    id: `snapshot-${slugify(rawProduct.vendor)}-${slugify(partNumber)}`,
    partNumber,
    name,
    supplier: rawProduct.vendor,
    category,
    widthMm,
    heightMm,
    anchorOffsetX: 0,
    anchorOffsetY: 0,
    color: inferColor(category),
    url: rawProduct.detailUrl ?? rawProduct.url ?? '',
    priceCents: rawProduct.priceCents ?? 0,
    notes:
      rawProduct.notes ?? rawProduct.familyPageDescription ?? rawProduct.description ?? '',
    specs: rawProduct.specs ?? {},
    source: {
      kind: 'snapshot',
      vendor: rawProduct.vendor,
    },
    reviewStatus: hasExplicitFootprint ? 'published' : 'needs_review',
    isBuiltIn: true,
  }
}
