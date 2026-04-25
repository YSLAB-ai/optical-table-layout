import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { useStore } from '../store'
import { buildCatalogKey } from '../utils/catalog'
import ComponentLibrary from './ComponentLibrary'

function resetStore() {
  useStore.setState({
    ...useStore.getInitialState(),
    assemblies: [],
    placements: [],
    selectedId: null,
    selectedType: null,
    showBomDrawer: false,
  })
}

describe('ComponentLibrary', () => {
  beforeEach(() => {
    resetStore()
    vi.unstubAllGlobals()
  })

  it('shows only curated popular Thorlabs and Newport shelves by default', () => {
    render(<ComponentLibrary />)

    expect(
      screen.getByRole('button', { name: /popular thorlabs/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /popular newport/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /my components/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /my assemblies/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^coherent$/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /light conversion/i }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('RS1')).not.toBeInTheDocument()
    expect(screen.queryByText('SP-1')).not.toBeInTheDocument()
  })

  it('switches to one unified result list with vendor badges when searching', () => {
    render(<ComponentLibrary />)

    fireEvent.change(screen.getByPlaceholderText(/search full catalog/i), {
      target: { value: 'MONACO' },
    })

    expect(screen.getByText('Catalog Results')).toBeInTheDocument()
    expect(screen.getByText('MONACO')).toBeInTheDocument()
    expect(screen.getByText('Coherent')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /popular thorlabs/i }),
    ).not.toBeInTheDocument()
  })

  it('shows remote-only published catalog hits when the lazy index loads during search', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          publishedAt: '2026-04-03T12:00:00.000Z',
          components: [
            {
              id: 'snapshot-thorlabs-km200',
              partNumber: 'KM200',
              name: '2" Kinematic Mirror Mount',
              supplier: 'Thorlabs',
              category: 'Mirror Mounts',
              widthMm: 64,
              heightMm: 64,
              anchorOffsetX: 0,
              anchorOffsetY: 0,
              color: '#2a1a3a',
              url: 'https://www.thorlabs.com/thorproduct.cfm?partnumber=KM200',
              priceCents: 0,
              notes: '',
              specs: {},
              source: {
                kind: 'snapshot',
                vendor: 'Thorlabs',
              },
              reviewStatus: 'needs_review',
              isBuiltIn: true,
            },
          ],
        }),
      }),
    )

    render(<ComponentLibrary />)

    fireEvent.change(screen.getByPlaceholderText(/search full catalog/i), {
      target: { value: 'KM200' },
    })

    expect(await screen.findByText('KM200')).toBeInTheDocument()
  })

  it('adds a custom part to My Components without placing it on the table', () => {
    render(<ComponentLibrary />)

    fireEvent.click(screen.getByRole('button', { name: /new part/i }))
    fireEvent.change(screen.getByLabelText(/^name$/i), {
      target: { value: 'Beam Dump' },
    })
    fireEvent.change(screen.getByLabelText(/part number/i), {
      target: { value: 'BD-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save component/i }))

    expect(
      useStore
        .getState()
        .components.some((component) => component.partNumber === 'BD-1'),
    ).toBe(true)
    expect(useStore.getState().placements).toHaveLength(0)
  })

  it('shows imported vendor parts inside My Components', () => {
    useStore.setState({
      components: [
        ...useStore.getState().components,
        {
          id: 'import-thorlabs-km200-custom',
          partNumber: 'KM200-CUSTOM',
          name: 'Imported KM200 Variant',
          supplier: 'Thorlabs',
          category: 'Mirror Mounts',
          widthMm: 64,
          heightMm: 64,
          anchorOffsetX: 0,
          anchorOffsetY: 0,
          color: '#2a1a3a',
          url: 'https://www.thorlabs.com/newgrouppage9.cfm?pn=KM200-CUSTOM',
          priceCents: 12345,
          notes: 'Imported from product link.',
          specs: {},
          source: {
            kind: 'imported',
            vendor: 'Thorlabs',
            catalogKey: buildCatalogKey('Thorlabs', 'KM200-CUSTOM'),
          },
          reviewStatus: 'needs_review',
          isBuiltIn: false,
        },
      ],
    })

    render(<ComponentLibrary />)

    fireEvent.click(screen.getByRole('button', { name: /my components/i }))

    expect(screen.getByText('KM200-CUSTOM')).toBeInTheDocument()
  })

  it('creates a new assembly from an existing component', () => {
    render(<ComponentLibrary />)

    fireEvent.click(screen.getByRole('button', { name: /new assembly/i }))

    fireEvent.change(screen.getByLabelText(/assembly name/i), {
      target: { value: 'Mirror Station' },
    })

    fireEvent.change(screen.getByLabelText(/add component/i), {
      target: { value: 'tl-km100' },
    })
    fireEvent.click(screen.getByRole('button', { name: /add item/i }))
    fireEvent.click(screen.getByRole('button', { name: /save assembly/i }))

    expect(screen.getByText('Mirror Station')).toBeInTheDocument()
    expect(useStore.getState().assemblies).toHaveLength(1)
    expect(useStore.getState().assemblies[0]).toMatchObject({
      name: 'Mirror Station',
      items: [{ type: 'component', refId: 'tl-km100', quantity: 1 }],
    })
  })
})
