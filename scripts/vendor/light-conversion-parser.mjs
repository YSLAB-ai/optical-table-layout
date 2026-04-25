import {
  extractDimensionsMm,
  extractHeadingText,
  extractLabelValue,
} from './normalize-component.mjs'

export function parseLightConversionProductPage(html, url) {
  const footprint = extractLabelValue(html, 'Footprint')

  return {
    vendor: 'Light Conversion',
    url,
    partNumber: extractLabelValue(html, 'SKU'),
    name: extractHeadingText(html),
    priceCents: 0,
    ...extractDimensionsMm(footprint),
    specs: {
      Wavelength: extractLabelValue(html, 'Wavelength'),
      'Pulse Energy': extractLabelValue(html, 'Pulse Energy'),
    },
    notes: '',
  }
}
