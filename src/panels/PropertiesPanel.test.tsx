import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { useStore } from '../store'
import PropertiesPanel from './PropertiesPanel'

function resetStore() {
  useStore.setState({
    ...useStore.getInitialState(),
    placements: [],
    beamPaths: [],
    assemblies: [],
    selectedId: null,
    selectedType: null,
    showBomDrawer: false,
  })
}

describe('PropertiesPanel stacked-hole workflow', () => {
  beforeEach(() => {
    resetStore()
  })

  it('shows stacked-hole components and a visible make assembly action', () => {
    const firstComponent = useStore.getState().components[0]
    const secondComponent = useStore.getState().components[1]

    expect(firstComponent).toBeDefined()
    expect(secondComponent).toBeDefined()

    useStore.setState({
      placements: [
        {
          id: 'p1',
          type: 'component',
          refId: firstComponent!.id,
          x: 25,
          y: 25,
          holeCol: 0,
          holeRow: 0,
          rotation: 0,
          label: firstComponent!.partNumber,
        },
        {
          id: 'p2',
          type: 'component',
          refId: firstComponent!.id,
          x: 25,
          y: 25,
          holeCol: 0,
          holeRow: 0,
          rotation: 0,
          label: firstComponent!.partNumber,
        },
        {
          id: 'p3',
          type: 'component',
          refId: secondComponent!.id,
          x: 25,
          y: 25,
          holeCol: 0,
          holeRow: 0,
          rotation: 0,
          label: secondComponent!.partNumber,
        },
      ],
      selectedId: 'p1',
      selectedType: 'placement',
    })

    render(<PropertiesPanel />)

    expect(screen.getByText(/components on this hole/i)).toBeInTheDocument()
    expect(
      screen.getAllByText(new RegExp(firstComponent!.partNumber, 'i')).length,
    ).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/x2/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /make assembly/i }),
    ).toBeInTheDocument()
  })
})
