import {
  extractDimensionsMm,
  extractHeadingText,
  extractLabelValue,
  extractPriceCents,
} from './normalize-component.mjs'

function extractPartNumberFromUrl(url) {
  const pathname = new URL(url).pathname.split('/').filter(Boolean)
  return pathname.at(-1) ?? ''
}

export function parseNewportProductPage(html, url) {
  const stageSize = extractLabelValue(html, 'Stage Size')

  return {
    vendor: 'Newport',
    url,
    partNumber: extractLabelValue(html, 'Model') || extractPartNumberFromUrl(url),
    name: extractHeadingText(html),
    priceCents: extractPriceCents(html),
    ...extractDimensionsMm(stageSize),
    specs: {
      Travel: extractLabelValue(html, 'Travel'),
    },
    notes: '',
  }
}
