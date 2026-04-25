export interface TableConfig {
  widthMm: number
  heightMm: number
  holeSpacingMm: number
  holeDiameterMm: number
  borderMarginMm: number
  units: 'mm' | 'in'
}

export interface ComponentSource {
  kind: 'catalog' | 'imported' | 'drawn' | 'snapshot'
  vendor: string
  importedFromUrl?: string
  catalogKey?: string
}

export interface Component {
  id: string
  partNumber: string
  name: string
  supplier:
    | 'Thorlabs'
    | 'Newport'
    | 'Coherent'
    | 'Light Conversion'
    | 'Custom'
    | string
  category: string
  widthMm: number
  heightMm: number
  anchorOffsetX: number
  anchorOffsetY: number
  color: string
  url: string
  priceCents: number
  notes: string
  specs: Record<string, string | number | boolean | null>
  source: ComponentSource
  reviewStatus: 'published' | 'needs_review' | 'draft'
  isBuiltIn: boolean
}

export interface AssemblyItem {
  type: 'component' | 'assembly'
  refId: string
  quantity: number
}

export interface Assembly {
  id: string
  name: string
  items: AssemblyItem[]
  notes: string
}

export interface Placement {
  id: string
  type: 'component' | 'assembly'
  refId: string
  x: number
  y: number
  holeCol?: number
  holeRow?: number
  rotation: number
  label: string
}

export interface BeamPath {
  id: string
  label: string
  wavelengthNm: number
  color: string
  lineStyle: 'solid' | 'dashed'
  polarization: 'H' | 'V' | 'circular' | 'unpolarized' | string
  powerMw: number | null
  points: { x: number; y: number }[]
}

export interface LayoutState {
  version: number
  table: TableConfig
  components: Component[]
  assemblies: Assembly[]
  placements: Placement[]
  beamPaths: BeamPath[]
}

export const DEFAULT_TABLE_CONFIG: TableConfig = {
  widthMm: 1200,
  heightMm: 900,
  holeSpacingMm: 25,
  holeDiameterMm: 6.35,
  borderMarginMm: 37.5,
  units: 'mm',
}

export const TABLE_PRESETS: { label: string; config: TableConfig }[] = [
  {
    label: 'Newport 4x8 ft',
    config: { ...DEFAULT_TABLE_CONFIG, widthMm: 2438, heightMm: 1219 },
  },
  {
    label: 'Newport 2x4 ft',
    config: { ...DEFAULT_TABLE_CONFIG, widthMm: 1219, heightMm: 610 },
  },
  {
    label: 'Thorlabs 4x8 ft',
    config: { ...DEFAULT_TABLE_CONFIG, widthMm: 2438, heightMm: 1219 },
  },
  {
    label: 'Thorlabs 2x4 ft',
    config: { ...DEFAULT_TABLE_CONFIG, widthMm: 1219, heightMm: 610 },
  },
  {
    label: 'Custom 1200x900 mm',
    config: DEFAULT_TABLE_CONFIG,
  },
]
