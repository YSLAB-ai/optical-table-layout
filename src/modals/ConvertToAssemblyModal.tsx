import { useState } from 'react'

interface Props {
  defaultName: string
  onCancel: () => void
  onConfirm: (name: string) => void
}

export default function ConvertToAssemblyModal({
  defaultName,
  onCancel,
  onConfirm,
}: Props) {
  const [name, setName] = useState(defaultName)
  const trimmedName = name.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-[#445] bg-[#1e1e2e] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-[#88c988]">Make Assembly</h2>
            <p className="mt-1 text-[10px] text-[#667]">
              Replace the stacked components on this hole with one reusable
              assembly placement.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-[#334] bg-[#171724] px-2 py-1 text-[10px] text-[#8895ad]"
          >
            Close
          </button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-[#667]">
            Assembly Name
          </span>
          <input
            aria-label="Assembly Name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded border border-[#556] bg-[#2a2a3a] px-3 py-2 text-xs text-white focus:border-[#88c988] focus:outline-none"
          />
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-[#445] bg-[#2a2a3a] px-4 py-2 text-xs text-[#aaa] transition-colors hover:bg-[#3a3a4a]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(trimmedName)}
            disabled={!trimmedName}
            className="rounded border border-[#4a6a4a] bg-[#213226] px-4 py-2 text-xs text-[#88c988] transition-colors hover:bg-[#28402f] disabled:cursor-not-allowed disabled:border-[#334] disabled:bg-[#171724] disabled:text-[#556]"
          >
            Make Assembly
          </button>
        </div>
      </div>
    </div>
  )
}
