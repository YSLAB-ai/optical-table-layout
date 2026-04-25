import type { Component } from '../types'
import { inferCatalogCategory } from '../utils/catalog'

const base = (
  id: string,
  partNumber: string,
  name: string,
  widthMm: number,
  heightMm: number,
  priceCents: number,
  url: string,
  color = '#1a3050',
): Component => ({
  id,
  partNumber,
  name,
  supplier: 'Newport',
  category: inferCatalogCategory(partNumber),
  widthMm,
  heightMm,
  anchorOffsetX: 0,
  anchorOffsetY: 0,
  color,
  url,
  priceCents,
  notes: '',
  specs: {},
  source: {
    kind: 'catalog',
    vendor: 'Newport',
    importedFromUrl: url,
  },
  reviewStatus: 'published',
  isBuiltIn: true,
})

export const NEWPORT_CATALOG: Component[] = [
  base('nw-sp1', 'SP-1', 'Stainless Post, 1"', 12, 12, 890, 'https://www.newport.com/p/SP-1'),
  base('nw-sp2', 'SP-2', 'Stainless Post, 2"', 12, 12, 980, 'https://www.newport.com/p/SP-2'),
  base('nw-sp3', 'SP-3', 'Stainless Post, 3"', 12, 12, 1050, 'https://www.newport.com/p/SP-3'),
  base('nw-ph1', 'PH-1', 'Post Holder, 1"', 31, 31, 1450, 'https://www.newport.com/p/PH-1', '#1a2a3a'),
  base('nw-ph2', 'PH-2', 'Post Holder, 2"', 31, 31, 1550, 'https://www.newport.com/p/PH-2', '#1a2a3a'),
  base('nw-u100-a2k', 'U100-A2K', '1" Kinematic Mirror Mount', 44, 44, 22500, 'https://www.newport.com/p/U100-A2K', '#2a1a3a'),
  base('nw-u200-a2k', 'U200-A2K', '2" Kinematic Mirror Mount', 64, 64, 31500, 'https://www.newport.com/p/U200-A2K', '#2a1a3a'),
  base('nw-05bc16pb-2', '05BC16PB.2', '1" 50:50 Cube BS', 25, 25, 24500, 'https://www.newport.com/p/05BC16PB.2', '#1a3a3a'),
  base('nw-mt-rs', 'MT-RS', '1" Manual Translation Stage', 76, 76, 21000, 'https://www.newport.com/p/MT-RS', '#2a3a1a'),
]
