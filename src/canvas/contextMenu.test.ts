import { describe, expect, it } from 'vitest'

import { isSecondaryContextMenuGesture } from './contextMenu'

describe('isSecondaryContextMenuGesture', () => {
  it('treats button 2 as a secondary click', () => {
    expect(isSecondaryContextMenuGesture({ button: 2 })).toBe(true)
  })

  it('treats buttons 2 as a secondary click fallback', () => {
    expect(isSecondaryContextMenuGesture({ buttons: 2 })).toBe(true)
  })

  it('treats ctrl-click as a secondary click on macOS', () => {
    expect(isSecondaryContextMenuGesture({ button: 0, ctrlKey: true })).toBe(true)
  })

  it('does not treat an ordinary primary click as secondary', () => {
    expect(
      isSecondaryContextMenuGesture({ button: 0, buttons: 1, ctrlKey: false }),
    ).toBe(false)
  })
})
