import { describe, expect, it } from 'vitest'

import { buildImportedComponent, parseProductUrl } from './vendorImport'

describe('parseProductUrl', () => {
  it('parses a Thorlabs partnumber query parameter', () => {
    const parsed = parseProductUrl(
      'https://www.thorlabs.com/thorproduct.cfm?partnumber=KM100',
    )

    expect(parsed).toMatchObject({
      supplier: 'Thorlabs',
      partNumber: 'KM100',
    })
  })

  it('parses a Thorlabs pn query parameter', () => {
    const parsed = parseProductUrl(
      'https://www.thorlabs.com/newgrouppage9.cfm?objectgroup_ID=1492&pn=KM100C',
    )

    expect(parsed).toMatchObject({
      supplier: 'Thorlabs',
      partNumber: 'KM100C',
    })
  })

  it('parses a Newport product path', () => {
    const parsed = parseProductUrl('https://www.newport.com/p/U100-A2K')

    expect(parsed).toMatchObject({
      supplier: 'Newport',
      partNumber: 'U100-A2K',
    })
  })

  it('parses a Coherent product URL', () => {
    const parsed = parseProductUrl(
      'https://www.coherent.com/lasers/femtosecond-lasers/monaco',
    )

    expect(parsed).toMatchObject({
      supplier: 'Coherent',
      partNumber: 'MONACO',
    })
  })

  it('parses a Light Conversion product URL', () => {
    const parsed = parseProductUrl(
      'https://lightcon.com/product/carbide-cb5/?sku=CB5',
    )

    expect(parsed).toMatchObject({
      supplier: 'Light Conversion',
      partNumber: 'CB5',
    })
  })

  it('returns null for invalid urls', () => {
    expect(parseProductUrl('not a url')).toBeNull()
  })
})

describe('buildImportedComponent', () => {
  it('creates a custom library component with inferred color and notes', () => {
    const component = buildImportedComponent(
      {
        supplier: 'Thorlabs',
        partNumber: 'KM100',
        name: 'Mirror Mount',
        widthMm: 38,
        heightMm: 38,
        priceCents: 18950,
        url: 'https://www.thorlabs.com/thorproduct.cfm?partnumber=KM100',
        notes: '',
      },
      [],
    )

    expect(component).toMatchObject({
      supplier: 'Thorlabs',
      partNumber: 'KM100',
      category: 'Mirror Mounts',
      isBuiltIn: false,
      color: '#2a1a3a',
      widthMm: 38,
      heightMm: 38,
      reviewStatus: 'needs_review',
    })
    expect(component.notes).toContain('Imported from product link')
  })

  it('creates imported laser vendor components with review metadata', () => {
    const component = buildImportedComponent(
      {
        supplier: 'Coherent',
        partNumber: 'Monaco',
        name: 'Monaco 1035 nm',
        widthMm: 450,
        heightMm: 180,
        priceCents: 0,
        url: 'https://www.coherent.com/lasers/femtosecond-lasers/monaco',
        notes: 'Specs to review',
      },
      [],
    )

    expect(component).toMatchObject({
      supplier: 'Coherent',
      partNumber: 'MONACO',
      reviewStatus: 'needs_review',
      source: {
        kind: 'imported',
        vendor: 'Coherent',
      },
      widthMm: 450,
      heightMm: 180,
    })
  })
})
