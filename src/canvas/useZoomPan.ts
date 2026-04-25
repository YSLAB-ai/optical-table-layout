import { useCallback, useState } from 'react'
import type Konva from 'konva'

export interface StageTransform {
  x: number
  y: number
  scale: number
}

const MIN_SCALE = 0.25
const MAX_SCALE = 4

export function useZoomPan(initialScale: number) {
  const [transform, setTransform] = useState<StageTransform>({
    x: 0,
    y: 0,
    scale: initialScale,
  })

  const handleWheel = useCallback((event: Konva.KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault()
    const stage = event.target.getStage()

    if (!stage) {
      return
    }

    const pointer = stage.getPointerPosition()

    if (!pointer) {
      return
    }

    const direction = event.evt.deltaY < 0 ? 1 : -1
    const factor = 1.1

    setTransform((previous) => {
      const newScale = Math.min(
        MAX_SCALE,
        Math.max(
          MIN_SCALE,
          direction > 0 ? previous.scale * factor : previous.scale / factor,
        ),
      )
      const mousePointTo = {
        x: (pointer.x - previous.x) / previous.scale,
        y: (pointer.y - previous.y) / previous.scale,
      }

      return {
        scale: newScale,
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      }
    })
  }, [])

  const handleDragEnd = useCallback((event: Konva.KonvaEventObject<Event>) => {
    if (event.target !== event.target.getStage()) {
      return
    }

    const stage = event.target.getStage()

    if (!stage) {
      return
    }

    setTransform((previous) => ({
      ...previous,
      x: stage.x(),
      y: stage.y(),
    }))
  }, [])

  return { transform, handleWheel, handleDragEnd }
}
