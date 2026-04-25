import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'

import type { Assembly, Component } from '../types'
import AssemblyEditorModal from '../modals/AssemblyEditorModal'
import DrawComponentModal from '../modals/DrawComponentModal'
import ProductLinkImportModal from '../modals/ProductLinkImportModal'
import { useStore } from '../store'
import { buildDrawnComponent } from '../utils/canvasTools'
import { getPopularShelfItems, rankCatalogSearchResults } from '../utils/catalog'
import {
  loadPublishedCatalogIndex,
  mergePublishedCatalogSearchSources,
} from '../utils/catalogIndex'
import ComponentItem from './ComponentItem'

function matchesComponentQuery(component: Component, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return [
    component.partNumber,
    component.name,
    component.supplier,
    component.category,
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery)
}

function matchesAssemblyQuery(assembly: Assembly, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return assembly.name.toLowerCase().includes(normalizedQuery)
}

export default function ComponentLibrary() {
  const components = useStore((state) => state.components)
  const assemblies = useStore((state) => state.assemblies)
  const addComponent = useStore((state) => state.addComponent)
  const [search, setSearch] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showNewPartModal, setShowNewPartModal] = useState(false)
  const [editingAssemblyId, setEditingAssemblyId] = useState<string | null>(null)
  const [remoteCatalogComponents, setRemoteCatalogComponents] = useState<Component[]>(
    [],
  )
  const [catalogIndexStatus, setCatalogIndexStatus] = useState<
    'idle' | 'loading' | 'loaded' | 'error'
  >('idle')
  const hasRequestedCatalogIndex = useRef(false)
  const isMounted = useRef(true)
  const [openSections, setOpenSections] = useState({
    popularThorlabs: false,
    popularNewport: false,
    custom: false,
    assemblies: true,
  })
  const deferredSearch = useDeferredValue(search)
  const query = deferredSearch.trim()
  const isSearching = query.length > 0

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!isSearching || hasRequestedCatalogIndex.current) {
      return
    }

    hasRequestedCatalogIndex.current = true

    void loadPublishedCatalogIndex()
      .then((payload) => {
        if (!isMounted.current) {
          return
        }

        setRemoteCatalogComponents(payload.components)
        setCatalogIndexStatus('loaded')
      })
      .catch(() => {
        if (!isMounted.current) {
          return
        }

        setCatalogIndexStatus('error')
      })
  }, [isSearching])

  const {
    catalogComponents,
    catalogResults,
    myComponents,
    filteredAssemblies,
    popularThorlabs,
    popularNewport,
  } = useMemo(() => {
    const builtInVendorCatalogComponents = components.filter(
      (component) => component.isBuiltIn && component.supplier !== 'Custom',
    )
    const userLibraryComponents = components.filter(
      (component) => !component.isBuiltIn,
    )

    return {
      catalogComponents: builtInVendorCatalogComponents,
      catalogResults: isSearching
        ? rankCatalogSearchResults(
            mergePublishedCatalogSearchSources(
              builtInVendorCatalogComponents,
              remoteCatalogComponents,
            ),
            query,
          )
        : [],
      myComponents: isSearching
        ? userLibraryComponents.filter((component) =>
            matchesComponentQuery(component, query),
          )
        : userLibraryComponents,
      filteredAssemblies: isSearching
        ? assemblies.filter((assembly) => matchesAssemblyQuery(assembly, query))
        : assemblies,
      popularThorlabs: getPopularShelfItems(
        builtInVendorCatalogComponents,
        'Thorlabs',
      ),
      popularNewport: getPopularShelfItems(
        builtInVendorCatalogComponents,
        'Newport',
      ),
    }
  }, [assemblies, components, isSearching, query, remoteCatalogComponents])

  const isSectionOpen = (
    key: keyof typeof openSections,
    count: number,
  ): boolean => {
    if (isSearching) {
      return count > 0
    }

    return openSections[key]
  }

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  return (
    <div className="flex h-full flex-col">
      {showImportModal ? (
        <ProductLinkImportModal onClose={() => setShowImportModal(false)} />
      ) : null}
      {showNewPartModal ? (
        <DrawComponentModal
          initialWidthMm={25}
          initialHeightMm={25}
          title="Create Library Component"
          description="Add a reusable custom part to My Components without placing it on the table yet."
          onClose={() => setShowNewPartModal(false)}
          onSave={(input) => {
            addComponent(
              buildDrawnComponent({
                id: crypto.randomUUID(),
                name: input.name,
                partNumber: input.partNumber,
                widthMm: input.widthMm,
                heightMm: input.heightMm,
                color: input.color,
                priceCents: input.priceCents,
                notes: input.notes,
              }),
            )
            setSearch('')
            setOpenSections((current) => ({
              ...current,
              custom: true,
            }))
            setShowNewPartModal(false)
          }}
        />
      ) : null}
      {editingAssemblyId !== null ? (
        <AssemblyEditorModal
          assemblyId={editingAssemblyId || undefined}
          onClose={() => setEditingAssemblyId(null)}
        />
      ) : null}
      <div className="flex-shrink-0 border-b border-[#222] px-2 py-1.5 text-[10px] uppercase tracking-wider text-[#667]">
        Component Library
      </div>
      <div className="border-b border-[#222] px-2 py-2">
        <input
          type="search"
          value={search}
          onChange={(event) => {
            const nextValue = event.target.value

            if (
              nextValue.trim() &&
              !hasRequestedCatalogIndex.current &&
              catalogIndexStatus === 'idle'
            ) {
              setCatalogIndexStatus('loading')
            }

            setSearch(nextValue)
          }}
          placeholder="Search full catalog by part, name, vendor, or category"
          className="w-full rounded border border-[#334] bg-[#151524] px-2 py-1.5 text-[10px] text-[#d0d6ea] placeholder:text-[#556] focus:border-[#7eb8f7] focus:outline-none"
        />
        <div className="mt-1 text-[9px] text-[#556]">
          {isSearching
            ? `${catalogResults.length} catalog matches`
            : `${catalogComponents.length} published catalog items`}
        </div>
        {isSearching && catalogIndexStatus === 'loading' ? (
          <div className="mt-1 text-[9px] text-[#667]">
            Loading full catalog index...
          </div>
        ) : null}
        {isSearching && catalogIndexStatus === 'error' ? (
          <div className="mt-1 text-[9px] text-[#8f7a7a]">
            Full catalog index unavailable right now. Showing local catalog only.
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setShowImportModal(true)}
          className="mt-2 w-full rounded border border-[#4a7a8a] bg-[#2a3a4a] px-2 py-1.5 text-[10px] text-[#7eb8f7] transition-colors hover:bg-[#3a4a5a]"
        >
          Import Product Link
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isSearching ? (
          <SearchResultsSection components={catalogResults} />
        ) : (
          <>
            <LibrarySection
              title="Popular Thorlabs"
              count={popularThorlabs.length}
              open={isSectionOpen('popularThorlabs', popularThorlabs.length)}
              onToggle={() => toggleSection('popularThorlabs')}
            >
              <ComponentList components={popularThorlabs} />
            </LibrarySection>
            <LibrarySection
              title="Popular Newport"
              count={popularNewport.length}
              open={isSectionOpen('popularNewport', popularNewport.length)}
              onToggle={() => toggleSection('popularNewport')}
            >
              <ComponentList components={popularNewport} />
            </LibrarySection>
          </>
        )}

        <LibrarySection
          title="My Components"
          count={myComponents.length}
          open={isSectionOpen('custom', myComponents.length)}
          onToggle={() => toggleSection('custom')}
          action={
            <button
              type="button"
              onClick={() => setShowNewPartModal(true)}
              className="rounded border border-[#3b536e] bg-[#1b2738] px-2 py-0.5 text-[9px] text-[#7eb8f7]"
            >
              New Part
            </button>
          }
        >
          {myComponents.length === 0 ? (
            <div className="px-3 py-2 text-[10px] italic text-[#445]">
              {isSearching
                ? 'No matching library components'
                : 'No library components yet'}
            </div>
          ) : (
            <ComponentList components={myComponents} />
          )}
        </LibrarySection>

        <LibrarySection
          title="My Assemblies"
          count={filteredAssemblies.length}
          open={isSectionOpen('assemblies', filteredAssemblies.length)}
          onToggle={() => toggleSection('assemblies')}
          action={
            <button
              type="button"
              onClick={() => setEditingAssemblyId('')}
              className="rounded border border-[#3b536e] bg-[#1b2738] px-2 py-0.5 text-[9px] text-[#7eb8f7]"
            >
              New Assembly
            </button>
          }
        >
          {filteredAssemblies.length === 0 ? (
            <div className="px-3 py-2 text-[10px] italic text-[#445]">
              {isSearching ? 'No matching assemblies' : 'No assemblies yet'}
            </div>
          ) : (
            filteredAssemblies.map((assembly) => (
              <div
                key={assembly.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('assemblyId', assembly.id)
                  event.dataTransfer.setData('assemblyName', assembly.name)
                  event.dataTransfer.effectAllowed = 'copy'
                }}
                className="group flex cursor-grab items-center gap-2 border-b border-[#202637] px-3 py-2 text-[10px] hover:bg-[#202838]"
              >
                <div className="flex h-3 w-3 items-center justify-center rounded-sm border border-[#6ba36b] bg-[#213226] text-[8px] text-[#88c988]">
                  A
                </div>
                <span className="flex-1 truncate text-[#b8c6e2] group-hover:text-white">
                  {assembly.name}
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setEditingAssemblyId(assembly.id)
                  }}
                  className="rounded border border-[#334] bg-[#151b28] px-2 py-0.5 text-[9px] text-[#7b8aa8]"
                >
                  Edit
                </button>
              </div>
            ))
          )}
        </LibrarySection>
      </div>
    </div>
  )
}

function ComponentList({ components }: { components: Component[] }) {
  return (
    <div>
      {components.map((component) => (
        <ComponentItem key={component.id} component={component} />
      ))}
    </div>
  )
}

function SearchResultsSection({ components }: { components: Component[] }) {
  return (
    <div className="border-b border-[#222]">
      <div className="flex items-center gap-2 bg-[#161622] px-2 py-1 text-[9px] uppercase tracking-widest text-[#556]">
        <span className="flex-1">Catalog Results</span>
        <span className="text-[#445]">{components.length}</span>
      </div>
      {components.length === 0 ? (
        <div className="px-3 py-3 text-[10px] italic text-[#556]">
          No catalog items matched your search.
        </div>
      ) : (
        components.map((component) => (
          <ComponentItem
            key={component.id}
            component={component}
            showVendorBadge
            showSearchMeta
          />
        ))
      )}
    </div>
  )
}

interface LibrarySectionProps {
  title: string
  count: number
  open: boolean
  onToggle: () => void
  hidden?: boolean
  action?: React.ReactNode
  children: React.ReactNode
}

function LibrarySection({
  title,
  count,
  open,
  onToggle,
  hidden = false,
  action,
  children,
}: LibrarySectionProps) {
  if (hidden) {
    return null
  }

  return (
    <div className="border-b border-[#222]">
      <div className="flex items-center gap-2 bg-[#161622] px-2 py-1 text-[9px] uppercase tracking-widest text-[#556]">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-[#1b2333] hover:text-[#7b8aa8]"
        >
          <span>{open ? 'v' : '>'}</span>
          <span className="flex-1 truncate">{title}</span>
          <span className="text-[#445]">{count}</span>
        </button>
        {action}
      </div>
      {open ? children : null}
    </div>
  )
}
