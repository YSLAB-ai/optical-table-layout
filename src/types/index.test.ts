import { describe, expectTypeOf, it } from 'vitest'
import type {
  Assembly,
  BeamPath,
  Component,
  LayoutState,
  Placement,
  TableConfig,
} from './index'

describe('types', () => {
  it('Component has required fields', () => {
    const c: Component = {
      id: 'c1',
      partNumber: 'KM100',
      name: 'Mirror Mount',
      supplier: 'Thorlabs',
      category: 'Mirror Mounts',
      widthMm: 30,
      heightMm: 30,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
      color: '#2a4a6a',
      url: 'https://thorlabs.com',
      priceCents: 18950,
      notes: '',
      specs: {
        wavelengthNm: 532,
      },
      source: {
        kind: 'catalog',
        vendor: 'Thorlabs',
      },
      reviewStatus: 'published',
      isBuiltIn: true,
    }

    expectTypeOf(c).toMatchTypeOf<Component>()
  })

  it('Component exposes normalized catalog metadata', () => {
    expectTypeOf<Component['category']>().toEqualTypeOf<string>()
    expectTypeOf<Component['specs']>().toMatchTypeOf<
      Record<string, string | number | boolean | null>
    >()
    expectTypeOf<Component['reviewStatus']>().toEqualTypeOf<
      'published' | 'needs_review' | 'draft'
    >()
    expectTypeOf<Component['source']['catalogKey']>().toEqualTypeOf<
      string | undefined
    >()
  })

  it('Placement has optional holeCol/holeRow', () => {
    const p: Placement = {
      id: 'p1',
      type: 'component',
      refId: 'c1',
      x: 25,
      y: 25,
      rotation: 0,
      label: 'KM100',
    }

    expectTypeOf(p.holeCol).toEqualTypeOf<number | undefined>()
    expectTypeOf(p.holeRow).toEqualTypeOf<number | undefined>()
  })

  it('LayoutState has a version field', () => {
    expectTypeOf<LayoutState['version']>().toEqualTypeOf<number>()
    expectTypeOf<LayoutState['table']>().toMatchTypeOf<TableConfig>()
    expectTypeOf<LayoutState['assemblies'][number]>().toMatchTypeOf<Assembly>()
    expectTypeOf<LayoutState['beamPaths'][number]>().toMatchTypeOf<BeamPath>()
  })
})
