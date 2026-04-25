import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { useStore } from '../store'
import BomStrip from './BomStrip'

function resetStore() {
  useStore.setState({
    ...useStore.getInitialState(),
    assemblies: [],
    beamPaths: [],
    placements: [],
    selectedId: null,
    selectedType: null,
    showBomDrawer: false,
  })
}

describe('BomStrip', () => {
  beforeEach(() => {
    resetStore()
    vi.restoreAllMocks()
  })

  it('exports PNG from the registered stage exporter', () => {
    const createdAnchors: HTMLAnchorElement[] = []
    const originalCreateElement = document.createElement.bind(document)
    const exportStagePng = vi.fn(() => 'data:image/png;base64,stage-export')

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName)

      if (tagName === 'a') {
        ;(element as HTMLAnchorElement).click = vi.fn()
        createdAnchors.push(element as HTMLAnchorElement)
      }

      return element
    })

    useStore.setState({
      placements: [
        {
          id: 'placement-1',
          type: 'component',
          refId: useStore.getState().components[0]!.id,
          x: 25,
          y: 25,
          holeCol: 0,
          holeRow: 0,
          rotation: 0,
          label: useStore.getState().components[0]!.partNumber,
        },
      ],
      showBomDrawer: true,
      exportStagePng,
    })

    render(<BomStrip />)

    fireEvent.click(screen.getByRole('button', { name: /export png/i }))

    expect(exportStagePng).toHaveBeenCalledTimes(1)
    expect(createdAnchors.at(-1)?.download).toBe('layout.png')
    expect(createdAnchors.at(-1)?.href).toBe('data:image/png;base64,stage-export')
  })
})
