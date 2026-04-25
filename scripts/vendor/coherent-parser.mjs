import {
  extractDimensionsMm,
  extractHeadingText,
  extractLabelValue,
} from './normalize-component.mjs'

export function parseCoherentProductPage(html, url) {
  const footprint = extractLabelValue(html, 'Base Footprint')

  return {
    vendor: 'Coherent',
    url,
    partNumber: extractLabelValue(html, 'Part Number'),
    name: extractHeadingText(html),
    priceCents: 0,
    ...extractDimensionsMm(footprint),
    specs: {
      Wavelength: extractLabelValue(html, 'Wavelength'),
      'Average Power': extractLabelValue(html, 'Average Power'),
    },
    notes: '',
  }
}
