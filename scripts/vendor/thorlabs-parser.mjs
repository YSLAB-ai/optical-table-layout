import {
  extractDimensionsMm,
  extractHeadingText,
  extractLabelValue,
  extractPriceCents,
} from './normalize-component.mjs'

export function parseThorlabsProductPage(html, url) {
  const footprint =
    extractLabelValue(html, 'Footprint') ||
    extractLabelValue(html, 'Mounting Footprint')

  return {
    vendor: 'Thorlabs',
    url,
    partNumber: extractLabelValue(html, 'Part Number'),
    name: extractHeadingText(html),
    priceCents: extractPriceCents(html),
    ...extractDimensionsMm(footprint),
    specs: {
      Material: extractLabelValue(html, 'Material'),
    },
    notes: '',
  }
}
