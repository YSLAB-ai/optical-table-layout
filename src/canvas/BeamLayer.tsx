import { Group, Layer, Line, Text } from 'react-konva'

import { useStore } from '../store'
import { mmToPx } from '../utils/geometry'

interface Props {
  scale: number
  draftPoints?: { x: number; y: number }[]
  previewPoint?: { x: number; y: number } | null
}

export default function BeamLayer({
  scale,
  draftPoints = [],
  previewPoint = null,
}: Props) {
  const beamPaths = useStore((state) => state.beamPaths)
  const selectedId = useStore((state) => state.selectedId)
  const selectedType = useStore((state) => state.selectedType)
  const setSelected = useStore((state) => state.setSelected)

  const draftLinePoints = [...draftPoints, ...(previewPoint ? [previewPoint] : [])]
    .flatMap((point) => [mmToPx(point.x, scale), mmToPx(point.y, scale)])

  return (
    <Layer>
      {beamPaths.map((beam) => {
        const points = beam.points.flatMap((point) => [
          mmToPx(point.x, scale),
          mmToPx(point.y, scale),
        ])
        const firstPoint = beam.points[0]

        return (
          <Group key={beam.id} name="beam-hit">
            <Line
              name="beam-hit"
              points={points}
              stroke={beam.color}
              strokeWidth={
                selectedId === beam.id && selectedType === 'beam' ? 3 : 2
              }
              dash={beam.lineStyle === 'dashed' ? [8, 5] : undefined}
              lineCap="round"
              lineJoin="round"
              onClick={() => setSelected(beam.id, 'beam')}
              onTap={() => setSelected(beam.id, 'beam')}
            />
            {firstPoint ? (
              <Text
                name="beam-hit"
                x={mmToPx(firstPoint.x, scale) + 6}
                y={mmToPx(firstPoint.y, scale) - 14}
                text={beam.label || `${beam.wavelengthNm}nm`}
                fontSize={10}
                fill={beam.color}
              />
            ) : null}
          </Group>
        )
      })}

      {draftLinePoints.length >= 4 ? (
        <Line
          points={draftLinePoints}
          stroke="#f87171"
          strokeWidth={2}
          dash={[8, 4]}
          lineCap="round"
          lineJoin="round"
        />
      ) : null}
    </Layer>
  )
}
