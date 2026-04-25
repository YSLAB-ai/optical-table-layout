import { describe, expect, it } from 'vitest'

import { COHERENT_CATALOG } from './coherent'
import { GENERATED_VENDOR_SNAPSHOT } from './generated/vendorSnapshot'
import { LIGHT_CONVERSION_CATALOG } from './lightConversion'
import { NEWPORT_CATALOG } from './newport'
import { THORLABS_CATALOG } from './thorlabs'

describe('built-in catalogs', () => {
  it('all Thorlabs items have required fields', () => {
    for (const component of THORLABS_CATALOG) {
      expect(component.id).toBeTruthy()
      expect(component.partNumber).toBeTruthy()
      expect(component.widthMm).toBeGreaterThan(0)
      expect(component.heightMm).toBeGreaterThan(0)
      expect(component.isBuiltIn).toBe(true)
      expect(component.supplier).toBe('Thorlabs')
    }
  })

  it('all Newport items have required fields', () => {
    for (const component of NEWPORT_CATALOG) {
      expect(component.isBuiltIn).toBe(true)
      expect(component.supplier).toBe('Newport')
    }
  })

  it('all Coherent and Light Conversion items are normalized placeable records', () => {
    for (const component of [...COHERENT_CATALOG, ...LIGHT_CONVERSION_CATALOG]) {
      expect(component.isBuiltIn).toBe(true)
      expect(component.widthMm).toBeGreaterThan(0)
      expect(component.heightMm).toBeGreaterThan(0)
      expect(component.category).toBeTruthy()
      expect(component.reviewStatus).toBe('published')
      expect(component.source.kind).toBe('catalog')
    }
  })

  it('no duplicate IDs across catalogs', () => {
    const all = [
      ...THORLABS_CATALOG,
      ...NEWPORT_CATALOG,
      ...COHERENT_CATALOG,
      ...LIGHT_CONVERSION_CATALOG,
    ]
    const ids = all.map((component) => component.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('Thorlabs has at least 10 items', () => {
    expect(THORLABS_CATALOG.length).toBeGreaterThanOrEqual(10)
  })

  it('laser vendor catalogs include at least one seed item each', () => {
    expect(COHERENT_CATALOG.length).toBeGreaterThanOrEqual(1)
    expect(LIGHT_CONVERSION_CATALOG.length).toBeGreaterThanOrEqual(1)
  })

  it('generated snapshot items are normalized and non-empty', () => {
    expect(GENERATED_VENDOR_SNAPSHOT.length).toBeGreaterThanOrEqual(4)

    for (const component of GENERATED_VENDOR_SNAPSHOT) {
      expect(component.id).toBeTruthy()
      expect(component.isBuiltIn).toBe(true)
      expect(component.source.kind).toBe('snapshot')
    }
  })
})
