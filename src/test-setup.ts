import '@testing-library/jest-dom'
import { createElement, type ReactNode } from 'react'
import { vi } from 'vitest'

vi.mock('konva/lib/Core', () => ({}))
vi.mock('react-konva', () => ({
  Stage: ({ children }: { children: ReactNode }) =>
    createElement('div', { 'data-testid': 'stage' }, children),
  Layer: ({ children }: { children: ReactNode }) =>
    createElement('div', { 'data-testid': 'layer' }, children),
  Rect: () => createElement('div', { 'data-testid': 'rect' }),
  Circle: () => createElement('div', { 'data-testid': 'circle' }),
  Line: () => createElement('div', { 'data-testid': 'line' }),
  Text: () => createElement('div', { 'data-testid': 'text' }),
  Group: ({ children }: { children: ReactNode }) =>
    createElement('div', { 'data-testid': 'group' }, children),
  Arrow: () => createElement('div', { 'data-testid': 'arrow' }),
}))

if (typeof globalThis.localStorage?.clear !== 'function') {
  let store = new Map<string, string>()

  const storage: Storage = {
    get length() {
      return store.size
    },
    clear() {
      store = new Map<string, string>()
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
  }

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  })
}
