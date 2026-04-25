import type { Component, Placement, TableConfig } from '../types'

export function mmToPx(mm: number, scale: number): number {
  return mm * scale
}

export function pxToMm(px: number, scale: number): number {
  return px / scale
}

export interface HolePosition {
  x: number
  y: number
  col: number
  row: number
}

export function getHolePositions(table: TableConfig): HolePosition[] {
  const { widthMm, heightMm, holeSpacingMm, borderMarginMm } = table
  const cols = Math.floor((widthMm - 2 * borderMarginMm) / holeSpacingMm) + 1
  const rows = Math.floor((heightMm - 2 * borderMarginMm) / holeSpacingMm) + 1
  const holes: HolePosition[] = []

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      holes.push({
        x: borderMarginMm + col * holeSpacingMm,
        y: borderMarginMm + row * holeSpacingMm,
        col,
        row,
      })
    }
  }

  return holes
}

export function snapToNearestHole(
  cursorXMm: number,
  cursorYMm: number,
  table: TableConfig,
  thresholdMm: number,
): HolePosition | null {
  const holes = getHolePositions(table)
  let nearest: HolePosition | null = null
  let minDist = Number.POSITIVE_INFINITY

  for (const hole of holes) {
    const dist = Math.hypot(hole.x - cursorXMm, hole.y - cursorYMm)

    if (dist < minDist && dist <= thresholdMm) {
      minDist = dist
      nearest = hole
    }
  }

  return nearest
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export function getPlacementBounds(
  placement: Placement,
  component: Component,
): Bounds {
  const { x, y } = placement
  const { widthMm, heightMm, anchorOffsetX, anchorOffsetY } = component

  return {
    x: x - widthMm / 2 + anchorOffsetX,
    y: y - heightMm / 2 + anchorOffsetY,
    width: widthMm,
    height: heightMm,
  }
}
