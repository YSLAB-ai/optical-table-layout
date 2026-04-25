import { Rect } from 'react-konva'

import type { TableConfig } from '../types'
import { mmToPx } from '../utils/geometry'

interface Props {
  table: TableConfig
  scale: number
}

export default function TableSurface({ table, scale }: Props) {
  return (
    <Rect
      x={0}
      y={0}
      width={mmToPx(table.widthMm, scale)}
      height={mmToPx(table.heightMm, scale)}
      fill="#141428"
      stroke="#334466"
      strokeWidth={2}
      cornerRadius={4}
      listening={false}
    />
  )
}
