import type { LayoutState } from '../types'

export const AUTOSAVE_KEY = 'opticsLayout_autosave'

export function saveLayout(state: LayoutState): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage quota and serialization failures.
  }
}

export function loadLayout(): LayoutState | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY)

    if (!raw) {
      return null
    }

    return JSON.parse(raw) as LayoutState
  } catch {
    return null
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function debouncedSave(state: LayoutState): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => saveLayout(state), 500)
}
