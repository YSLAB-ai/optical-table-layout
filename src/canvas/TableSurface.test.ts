import { describe, expect, it } from 'vitest'

import type { TableConfig } from '../types'
import TableSurface from './TableSurface'

const table: TableConfig = {
  widthMm: 900,
  heightMm: 600,
  holeSpacingMm: 25,
  holeDiameterMm: 6.5,
  borderMarginMm: 50,
  units: 'mm',
}

describe('TableSurface', () => {
  it('disables pointer listening so draw and beam tools can start directly on the table', () => {
    const element = TableSurface({ table, scale: 0.65 })

    expect(element.props.listening).toBe(false)
  })
})
