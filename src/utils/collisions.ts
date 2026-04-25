import type { Assembly, Component, Placement } from '../types'
import { resolvePlacementSummary } from './assembly'

export interface PlacementOverlap {
  placementIds: [string, string]
}

interface Bounds {
  left: number
  top: number
  right: number
  bottom: number
}

function getPlacementBounds(
  placement: Placement,
  components: Component[],
  assemblies: Assembly[],
): Bounds | null {
  const summary = resolvePlacementSummary(placement, components, assemblies)

  if (!summary) {
    return null
  }

  return {
    left: placement.x - summary.widthMm / 2 + summary.anchorOffsetX,
    top: placement.y - summary.heightMm / 2 + summary.anchorOffsetY,
    right:
      placement.x - summary.widthMm / 2 + summary.anchorOffsetX + summary.widthMm,
    bottom:
      placement.y - summary.heightMm / 2 + summary.anchorOffsetY + summary.heightMm,
  }
}

function overlaps(left: Bounds, right: Bounds): boolean {
  return (
    left.left < right.right &&
    left.right > right.left &&
    left.top < right.bottom &&
    left.bottom > right.top
  )
}

export function findPlacementOverlaps(
  placements: Placement[],
  components: Component[],
  assemblies: Assembly[],
): PlacementOverlap[] {
  const collisions: PlacementOverlap[] = []

  for (let index = 0; index < placements.length; index += 1) {
    const current = placements[index]

    if (!current) {
      continue
    }

    const currentBounds = getPlacementBounds(current, components, assemblies)

    if (!currentBounds) {
      continue
    }

    for (let otherIndex = index + 1; otherIndex < placements.length; otherIndex += 1) {
      const other = placements[otherIndex]

      if (!other) {
        continue
      }

      const otherBounds = getPlacementBounds(other, components, assemblies)

      if (!otherBounds) {
        continue
      }

      if (overlaps(currentBounds, otherBounds)) {
        collisions.push({
          placementIds: [current.id, other.id],
        })
      }
    }
  }

  return collisions
}
