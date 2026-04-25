import { Layer } from 'react-konva'

import { useStore } from '../store'
import { resolvePlacementSummary, type PlacementSummary } from '../utils/assembly'
import PlacementNode from './PlacementNode'

interface Props {
  scale: number
  onHoverChange: (
    payload:
      | {
          summary: PlacementSummary
          clientX: number
          clientY: number
        }
      | null,
  ) => void
  onContextMenu: (
    payload: {
      clientX: number
      clientY: number
      placementId: string
    },
  ) => void
}

export default function PlacementLayer({
  scale,
  onHoverChange,
  onContextMenu,
}: Props) {
  const placements = useStore((state) => state.placements)
  const components = useStore((state) => state.components)
  const assemblies = useStore((state) => state.assemblies)
  const selectedId = useStore((state) => state.selectedId)
  const selectedType = useStore((state) => state.selectedType)
  const setSelected = useStore((state) => state.setSelected)

  return (
    <Layer>
      {placements.map((placement) => {
        const summary = resolvePlacementSummary(
          placement,
          components,
          assemblies,
        )

        if (!summary) {
          return null
        }

        return (
          <PlacementNode
            key={placement.id}
            placement={placement}
            summary={summary}
            scale={scale}
            isSelected={
              selectedId === placement.id && selectedType === 'placement'
            }
            onSelect={() => setSelected(placement.id, 'placement')}
            onHover={(clientX, clientY) =>
              onHoverChange({ summary, clientX, clientY })
            }
            onHoverEnd={() => onHoverChange(null)}
            onContextMenu={(clientX, clientY, placementId) =>
              onContextMenu({ clientX, clientY, placementId })
            }
          />
        )
      })}
    </Layer>
  )
}
