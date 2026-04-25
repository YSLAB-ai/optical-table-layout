import { Circle } from 'react-konva'

import type { TableConfig } from '../types'
import { getHolePositions, mmToPx } from '../utils/geometry'

interface Props {
  table: TableConfig
  scale: number
  zoom: number
}

export default function HoleGrid({ table, scale, zoom }: Props) {
  const holes = getHolePositions(table)
  const radius = zoom < 0.5 ? 1 : mmToPx(table.holeDiameterMm / 2, scale)
  const color = zoom < 0.5 ? '#223344' : '#334a66'

  return (
    <>
      {holes.map((hole) => (
        <Circle
          key={`${hole.col}-${hole.row}`}
          x={mmToPx(hole.x, scale)}
          y={mmToPx(hole.y, scale)}
          radius={radius}
          fill={color}
          listening={false}
        />
      ))}
    </>
  )
}
