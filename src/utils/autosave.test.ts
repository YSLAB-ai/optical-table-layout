import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_TABLE_CONFIG, type LayoutState } from '../types'
import { buildCatalogKey } from './catalog'
import { AUTOSAVE_KEY, loadLayout, saveLayout } from './autosave'

const mockState: LayoutState = {
  version: 1,
  table: DEFAULT_TABLE_CONFIG,
  components: [],
  assemblies: [],
  placements: [],
  beamPaths: [],
}

beforeEach(() => localStorage.clear())

describe('autosave', () => {
  it('saveLayout writes to localStorage', () => {
    saveLayout(mockState)
    const raw = localStorage.getItem(AUTOSAVE_KEY)

    expect(raw).not.toBeNull()
    expect(JSON.parse(raw ?? '{}')).toMatchObject({ version: 1 })
  })

  it('loadLayout returns parsed state', () => {
    saveLayout(mockState)
    const loaded = loadLayout()

    expect(loaded).toMatchObject({ version: 1 })
    expect(loaded?.placements).toEqual([])
  })

  it('round-trips saved catalog identity metadata', () => {
    const catalogLinkedState: LayoutState = {
      ...mockState,
      components: [
        {
          id: 'snapshot-thorlabs-polaris-k1e3',
          partNumber: 'POLARIS-K1E3',
          name: 'POLARIS-K1E3 E-Series Kinematic Mirror Mount',
          supplier: 'Thorlabs',
          category: 'Mirror Mounts',
          widthMm: 50,
          heightMm: 50,
          anchorOffsetX: 0,
          anchorOffsetY: 0,
          color: '#2a1a3a',
          url: 'https://www.thorlabs.com/newgrouppage9.cfm?pn=POLARIS-K1E3',
          priceCents: 19900,
          notes: '',
          specs: {},
          source: {
            kind: 'imported',
            vendor: 'Thorlabs',
            catalogKey: buildCatalogKey('Thorlabs', 'POLARIS-K1E3'),
          },
          reviewStatus: 'needs_review',
          isBuiltIn: false,
        },
      ],
      placements: [
        {
          id: 'p1',
          type: 'component',
          refId: 'snapshot-thorlabs-polaris-k1e3',
          x: 25,
          y: 25,
          rotation: 0,
          label: 'POLARIS-K1E3',
        },
      ],
    }

    saveLayout(catalogLinkedState)
    const loaded = loadLayout()

    expect(loaded?.components[0]?.source.catalogKey).toBe(
      buildCatalogKey('Thorlabs', 'POLARIS-K1E3'),
    )
  })

  it('loadLayout returns null when nothing saved', () => {
    expect(loadLayout()).toBeNull()
  })

  it('loadLayout returns null on corrupted data', () => {
    localStorage.setItem(AUTOSAVE_KEY, 'not-json{{{')
    expect(loadLayout()).toBeNull()
  })
})
