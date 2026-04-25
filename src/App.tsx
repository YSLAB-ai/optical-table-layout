import { useEffect } from 'react'

import TableCanvas from './canvas/TableCanvas'
import TableConfigModal from './modals/TableConfigModal'
import BomStrip from './panels/BomStrip'
import ComponentLibrary from './panels/ComponentLibrary'
import PropertiesPanel from './panels/PropertiesPanel'
import Toolbar from './panels/Toolbar'
import {
  hasPublishedCatalogHydrationTargets,
  useStore,
} from './store'
import { loadPublishedCatalogIndex } from './utils/catalogIndex'

export default function App() {
  const showTableConfig = useStore((state) => state.showTableConfig)
  const components = useStore((state) => state.components)
  const deleteSelected = useStore((state) => state.deleteSelected)
  const hydratePublishedCatalogIndex = useStore(
    (state) => state.hydratePublishedCatalogIndex,
  )
  const needsPublishedCatalogHydration =
    hasPublishedCatalogHydrationTargets(components)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()

      if (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target?.isContentEditable
      ) {
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        deleteSelected()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelected])

  useEffect(() => {
    if (!needsPublishedCatalogHydration) {
      return undefined
    }

    let cancelled = false

    void loadPublishedCatalogIndex()
      .then((payload) => {
        if (!cancelled) {
          hydratePublishedCatalogIndex(payload.components)
        }
      })
      .catch(() => {
        // Keep the current saved catalog-linked components if the published index is unavailable.
      })

    return () => {
      cancelled = true
    }
  }, [hydratePublishedCatalogIndex, needsPublishedCatalogHydration])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {showTableConfig ? <TableConfigModal /> : null}

      <Toolbar />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="w-56 flex-shrink-0 overflow-y-auto border-r border-[#334] bg-[#1e1e2e]">
          <ComponentLibrary />
        </div>

        <div className="min-w-0 flex-1 overflow-hidden bg-[#0d0d1a]">
          <TableCanvas />
        </div>

        <div className="w-56 flex-shrink-0 overflow-y-auto border-l border-[#334] bg-[#1e1e2e]">
          <PropertiesPanel />
        </div>
      </div>

      <BomStrip />
    </div>
  )
}
