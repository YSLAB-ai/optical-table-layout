import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ConvertToAssemblyModal from './ConvertToAssemblyModal'

describe('ConvertToAssemblyModal', () => {
  it('submits a trimmed assembly name from the rename-first modal', () => {
    const handleConfirm = vi.fn()

    render(
      <ConvertToAssemblyModal
        defaultName="Assembly 3"
        onCancel={() => {}}
        onConfirm={handleConfirm}
      />,
    )

    fireEvent.change(screen.getByLabelText(/assembly name/i), {
      target: { value: '  Mirror Stack  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /make assembly/i }))

    expect(handleConfirm).toHaveBeenCalledWith('Mirror Stack')
  })

  it('disables confirmation for a blank name', () => {
    const handleConfirm = vi.fn()

    render(
      <ConvertToAssemblyModal
        defaultName="Assembly 3"
        onCancel={() => {}}
        onConfirm={handleConfirm}
      />,
    )

    fireEvent.change(screen.getByLabelText(/assembly name/i), {
      target: { value: '   ' },
    })

    expect(screen.getByRole('button', { name: /make assembly/i })).toBeDisabled()
  })
})
