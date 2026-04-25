import { useMemo, useState } from 'react'

import { useStore } from '../store'
import type { Assembly, AssemblyItem } from '../types'

interface Props {
  assemblyId?: string | null
  onClose: () => void
}

export default function AssemblyEditorModal({ assemblyId, onClose }: Props) {
  const components = useStore((state) => state.components)
  const assemblies = useStore((state) => state.assemblies)
  const addAssembly = useStore((state) => state.addAssembly)
  const updateAssembly = useStore((state) => state.updateAssembly)

  const existingAssembly = useMemo(
    () => assemblies.find((assembly) => assembly.id === assemblyId) ?? null,
    [assemblies, assemblyId],
  )

  const [name, setName] = useState(existingAssembly?.name ?? '')
  const [items, setItems] = useState<AssemblyItem[]>(existingAssembly?.items ?? [])
  const [selectedComponentId, setSelectedComponentId] = useState(
    components[0]?.id ?? '',
  )
  const [selectedAssemblyId, setSelectedAssemblyId] = useState(
    assemblies.find((assembly) => assembly.id !== assemblyId)?.id ?? '',
  )

  const availableAssemblies = assemblies.filter(
    (assembly) => assembly.id !== assemblyId,
  )

  const addItem = (item: AssemblyItem) => {
    setItems((current) => [...current, item])
  }

  const handleSave = () => {
    if (!name.trim() || items.length === 0) {
      return
    }

    const nextAssembly: Assembly = {
      id: existingAssembly?.id ?? crypto.randomUUID(),
      name: name.trim(),
      notes: existingAssembly?.notes ?? '',
      items,
    }

    if (existingAssembly) {
      updateAssembly(existingAssembly.id, nextAssembly)
    } else {
      addAssembly(nextAssembly)
    }

    onClose()
  }

  const resolveItemName = (item: AssemblyItem): string => {
    if (item.type === 'component') {
      return (
        components.find((component) => component.id === item.refId)?.name ??
        item.refId
      )
    }

    return (
      assemblies.find((assembly) => assembly.id === item.refId)?.name ?? item.refId
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-[#445] bg-[#1e1e2e] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-[#7eb8f7]">
              {existingAssembly ? 'Edit Assembly' : 'New Assembly'}
            </h2>
            <p className="mt-1 text-[10px] text-[#667]">
              Combine components and sub-assemblies into one reusable placeable unit.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[#334] bg-[#171724] px-2 py-1 text-[10px] text-[#8895ad]"
          >
            Close
          </button>
        </div>

        <label className="mb-4 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-[#667]">
            Assembly Name
          </span>
          <input
            aria-label="Assembly Name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded border border-[#556] bg-[#2a2a3a] px-3 py-2 text-xs text-white focus:border-[#7eb8f7] focus:outline-none"
          />
        </label>

        <div className="grid grid-cols-1 gap-4 border-b border-[#2a3245] pb-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[#667]">
                Add Component
              </span>
              <select
                aria-label="Add Component"
                value={selectedComponentId}
                onChange={(event) => setSelectedComponentId(event.target.value)}
                className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-2 text-xs text-white focus:border-[#7eb8f7] focus:outline-none"
              >
                {components.map((component) => (
                  <option key={component.id} value={component.id}>
                    {component.partNumber} - {component.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() =>
                selectedComponentId
                  ? addItem({
                      type: 'component',
                      refId: selectedComponentId,
                      quantity: 1,
                    })
                  : undefined
              }
              className="rounded border border-[#4a7a8a] bg-[#2a3a4a] px-3 py-2 text-[10px] text-[#7eb8f7]"
            >
              Add Item
            </button>
          </div>

          <div className="space-y-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[#667]">
                Add Sub-Assembly
              </span>
              <select
                aria-label="Add Sub-Assembly"
                value={selectedAssemblyId}
                onChange={(event) => setSelectedAssemblyId(event.target.value)}
                className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-2 text-xs text-white focus:border-[#7eb8f7] focus:outline-none"
              >
                <option value="">None</option>
                {availableAssemblies.map((assembly) => (
                  <option key={assembly.id} value={assembly.id}>
                    {assembly.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() =>
                selectedAssemblyId
                  ? addItem({
                      type: 'assembly',
                      refId: selectedAssemblyId,
                      quantity: 1,
                    })
                  : undefined
              }
              disabled={!selectedAssemblyId}
              className="rounded border border-[#4a6a4a] bg-[#213226] px-3 py-2 text-[10px] text-[#88c988] disabled:cursor-not-allowed disabled:border-[#334] disabled:bg-[#171724] disabled:text-[#556]"
            >
              Add Sub-Assembly
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-[#667]">
            Items
          </div>
          {items.length === 0 ? (
            <div className="rounded border border-dashed border-[#334] px-3 py-3 text-[10px] italic text-[#556]">
              Add at least one component or sub-assembly.
            </div>
          ) : (
            items.map((item, index) => (
              <div
                key={`${item.type}-${item.refId}-${index}`}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded border border-[#2a3245] bg-[#151b28] px-3 py-2 text-[10px]"
              >
                <div className="min-w-0 text-[#d0d6ea]">
                  {item.type === 'assembly' ? '[ASM] ' : ''}
                  {resolveItemName(item)}
                </div>
                <input
                  aria-label={`Quantity ${index + 1}`}
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((candidate, candidateIndex) =>
                        candidateIndex === index
                          ? {
                              ...candidate,
                              quantity:
                                Math.max(
                                  1,
                                  Number.parseInt(event.target.value, 10) || 1,
                                ),
                            }
                          : candidate,
                      ),
                    )
                  }
                  className="w-16 rounded border border-[#556] bg-[#2a2a3a] px-2 py-1 text-xs text-white focus:border-[#7eb8f7] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setItems((current) =>
                      current.filter((_, candidateIndex) => candidateIndex !== index),
                    )
                  }
                  className="rounded border border-[#5a3840] bg-[#22151a] px-2 py-1 text-[10px] text-[#d08b96]"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[#445] bg-[#2a2a3a] px-4 py-2 text-xs text-[#aaa] transition-colors hover:bg-[#3a3a4a]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || items.length === 0}
            className="rounded border border-[#7eb8f7] bg-[#2a3a4a] px-4 py-2 text-xs text-[#7eb8f7] transition-colors disabled:cursor-not-allowed disabled:border-[#334] disabled:bg-[#171724] disabled:text-[#556]"
          >
            Save Assembly
          </button>
        </div>
      </div>
    </div>
  )
}
