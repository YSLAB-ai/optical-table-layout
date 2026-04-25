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
  supplier: 'Light Conversion',
  category: 'Lasers',
  widthMm,
  heightMm,
  anchorOffsetX: 0,
  anchorOffsetY: 0,
  color: '#294b3d',
  url,
  priceCents: 0,
  notes,
  specs: {},
  source: {
    kind: 'catalog',
    vendor: 'Light Conversion',
    importedFromUrl: url,
  },
  reviewStatus: 'published',
  isBuiltIn: true,
})

export const LIGHT_CONVERSION_CATALOG: Component[] = [
  base(
    'lc-carbide-cb5',
    'CB5',
    'CARBIDE CB5 Femtosecond Laser',
    430,
    180,
    'https://lightcon.com/product/carbide-cb5/',
    'Approximate footprint for tabletop planning. Confirm exact chassis size before procurement.',
  ),
  base(
    'lc-pharos',
    'PHAROS',
    'PHAROS Industrial Femtosecond Laser',
    560,
    220,
    'https://lightcon.com/product/pharos/',
    'Approximate footprint for tabletop planning. Confirm exact chassis size before procurement.',
  ),
]
