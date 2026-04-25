import type { Component } from '../types'

const base = (
  id: string,
  partNumber: string,
  name: string,
  widthMm: number,
  heightMm: number,
  url: string,
  notes: string,
): Component => ({
  id,
  partNumber,
  name,
  supplier: 'Coherent',
  category: 'Lasers',
  widthMm,
  heightMm,
  anchorOffsetX: 0,
  anchorOffsetY: 0,
  color: '#4b244f',
  url,
  priceCents: 0,
  notes,
  specs: {},
  source: {
    kind: 'catalog',
    vendor: 'Coherent',
    importedFromUrl: url,
  },
  reviewStatus: 'published',
  isBuiltIn: true,
})

export const COHERENT_CATALOG: Component[] = [
  base(
    'coh-monaco',
    'MONACO',
    'Monaco Femtosecond Laser',
    510,
    190,
    'https://www.coherent.com/lasers/femtosecond-lasers/monaco',
    'Approximate footprint for tabletop planning. Confirm exact chassis size before procurement.',
  ),
  base(
    'coh-avia-nx',
    'AVIA-NX',
    'AVIA NX Nanosecond Laser',
    620,
    230,
    'https://www.coherent.com/lasers/q-switched/avia-nx',
    'Approximate footprint for tabletop planning. Confirm exact chassis size before procurement.',
  ),
]
