import type { BeamPath, Component, TableConfig } from '../types'
import { getHolePositions } from './geometry'

export interface PointMm {
  x: number
  y: number
}

const AXIS_SNAP_THRESHOLD_DEGREES = 8
const STRAIGHT_CONTINUATION_THRESHOLD_DEGREES = 12
const MIN_SEGMENT_MM = 0.001

export interface DrawDraftMetrics {
  x: number
  y: number
  widthMm: number
  heightMm: number
  centerX: number
  centerY: number
}

export type BeamDraftKeyAction = 'finish' | 'cancel' | null

export function shouldCaptureBeamPointFromTargetName(
  activeTool: 'select' | 'draw' | 'beam',
  targetName: string,
): boolean {
  if (activeTool !== 'beam') {
    return false
  }

  return !targetName
    .split(/\s+/)
    .filter(Boolean)
    .includes('beam-hit')
}

export function getDrawDraftMetrics(
  start: PointMm,
  end: PointMm,
): DrawDraftMetrics {
  const x = Math.min(start.x, end.x)
  const y = Math.min(start.y, end.y)
  const widthMm = Math.abs(end.x - start.x)
  const heightMm = Math.abs(end.y - start.y)

  return {
    x,
    y,
    widthMm,
    heightMm,
    centerX: x + widthMm / 2,
    centerY: y + heightMm / 2,
  }
}

export function buildDrawnComponent(input: {
  id: string
  name: string
  partNumber: string
  widthMm: number
  heightMm: number
  color: string
  priceCents: number
  notes: string
}): Component {
  return {
    id: input.id,
    partNumber: input.partNumber.trim().toUpperCase(),
    name: input.name.trim(),
    supplier: 'Custom',
    category: 'Other',
    widthMm: input.widthMm,
    heightMm: input.heightMm,
    anchorOffsetX: 0,
    anchorOffsetY: 0,
    color: input.color,
    url: '',
    priceCents: input.priceCents,
    notes: input.notes.trim(),
    specs: {},
    source: {
      kind: 'drawn',
      vendor: 'Custom',
    },
    reviewStatus: 'draft',
    isBuiltIn: false,
  }
}

function getDistance(first: PointMm, second: PointMm): number {
  return Math.hypot(second.x - first.x, second.y - first.y)
}

function getAxisSnappedPoint(origin: PointMm, point: PointMm): PointMm {
  const deltaX = point.x - origin.x
  const deltaY = point.y - origin.y
  const angleDegrees = Math.abs((Math.atan2(deltaY, deltaX) * 180) / Math.PI)
  const distanceToHorizontal = Math.min(
    angleDegrees,
    Math.abs(180 - angleDegrees),
  )
  const distanceToVertical = Math.abs(90 - angleDegrees)

  if (distanceToHorizontal <= AXIS_SNAP_THRESHOLD_DEGREES) {
    return {
      x: point.x,
      y: origin.y,
    }
  }

  if (distanceToVertical <= AXIS_SNAP_THRESHOLD_DEGREES) {
    return {
      x: origin.x,
      y: point.y,
    }
  }

  return point
}

function shouldContinueStraight(
  previous: PointMm,
  current: PointMm,
  next: PointMm,
): boolean {
  const previousVector = {
    x: current.x - previous.x,
    y: current.y - previous.y,
  }
  const nextVector = {
    x: next.x - current.x,
    y: next.y - current.y,
  }
  const previousLength = Math.hypot(previousVector.x, previousVector.y)
  const nextLength = Math.hypot(nextVector.x, nextVector.y)

  if (previousLength < MIN_SEGMENT_MM || nextLength < MIN_SEGMENT_MM) {
    return false
  }

  const dotProduct =
    previousVector.x * nextVector.x + previousVector.y * nextVector.y

  if (dotProduct <= 0) {
    return false
  }

  const cosine = Math.max(
    -1,
    Math.min(1, dotProduct / (previousLength * nextLength)),
  )
  const angleDegrees = (Math.acos(cosine) * 180) / Math.PI

  return angleDegrees <= STRAIGHT_CONTINUATION_THRESHOLD_DEGREES
}

function projectPointOntoPreviousDirection(
  previous: PointMm,
  current: PointMm,
  next: PointMm,
): PointMm {
  const direction = {
    x: current.x - previous.x,
    y: current.y - previous.y,
  }
  const directionLength = Math.hypot(direction.x, direction.y)

  if (directionLength < MIN_SEGMENT_MM) {
    return next
  }

  const unitDirection = {
    x: direction.x / directionLength,
    y: direction.y / directionLength,
  }
  const nextVector = {
    x: next.x - current.x,
    y: next.y - current.y,
  }
  const projectedLength = Math.max(
    0,
    nextVector.x * unitDirection.x + nextVector.y * unitDirection.y,
  )

  return {
    x: current.x + projectedLength * unitDirection.x,
    y: current.y + projectedLength * unitDirection.y,
  }
}

export function snapBeamDraftPoint(
  existingPoints: PointMm[],
  nextPoint: PointMm,
): PointMm {
  const current = existingPoints[existingPoints.length - 1]

  if (!current) {
    return nextPoint
  }

  if (existingPoints.length >= 2) {
    const previous = existingPoints[existingPoints.length - 2]

    if (previous && shouldContinueStraight(previous, current, nextPoint)) {
      return projectPointOntoPreviousDirection(previous, current, nextPoint)
    }
  }

  return getAxisSnappedPoint(current, nextPoint)
}

function getNearestHolePoint(point: PointMm, table: TableConfig): PointMm {
  const holes = getHolePositions(table)
  const nearestHole = holes.reduce((nearest, hole) => {
    if (!nearest) {
      return hole
    }

    const nearestDistance = getDistance(nearest, point)
    const holeDistance = getDistance(hole, point)

    return holeDistance < nearestDistance ? hole : nearest
  }, holes[0])

  return {
    x: nearestHole.x,
    y: nearestHole.y,
  }
}

export function resolveBeamDraftPoint(
  existingPoints: PointMm[],
  rawPoint: PointMm,
  table: TableConfig,
): PointMm {
  const guidedPoint = snapBeamDraftPoint(existingPoints, rawPoint)
  return getNearestHolePoint(guidedPoint, table)
}

export function getBeamDraftKeyAction(
  key: string,
  draftPoints: PointMm[],
): BeamDraftKeyAction {
  if (draftPoints.length === 0) {
    return null
  }

  if (key === 'Enter' || key === 'Return') {
    return draftPoints.length >= 2 ? 'finish' : null
  }

  if (key === 'Escape') {
    return draftPoints.length >= 2 ? 'finish' : 'cancel'
  }

  return null
}

function normalizeBeamPoints(points: PointMm[]): PointMm[] {
  return points.reduce<PointMm[]>((normalized, point) => {
    if (normalized.length === 0) {
      normalized.push(point)
      return normalized
    }

    const last = normalized[normalized.length - 1]

    if (last && getDistance(last, point) < MIN_SEGMENT_MM) {
      return normalized
    }

    const snappedPoint = snapBeamDraftPoint(normalized, point)

    if (normalized.length >= 2) {
      const previous = normalized[normalized.length - 2]
      const current = normalized[normalized.length - 1]

      if (
        previous &&
        current &&
        shouldContinueStraight(previous, current, snappedPoint)
      ) {
        normalized[normalized.length - 1] = snappedPoint
        return normalized
      }
    }

    normalized.push(snappedPoint)
    return normalized
  }, [])
}

export function buildBeamPath(
  points: PointMm[],
  existingBeamCount: number,
): BeamPath {
  return {
    id: crypto.randomUUID(),
    label: `Beam ${existingBeamCount + 1}`,
    wavelengthNm: 632.8,
    color: '#ff3333',
    lineStyle: 'solid',
    polarization: 'unpolarized',
    powerMw: null,
    points: normalizeBeamPoints(points),
  }
}

export function finalizeBeamDraft(
  points: PointMm[],
  existingBeamCount: number,
): BeamPath | null {
  const beamPath = buildBeamPath(points, existingBeamCount)

  return beamPath.points.length >= 2 ? beamPath : null
}
