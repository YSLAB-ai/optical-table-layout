import { useMemo, useState } from 'react'

import { useStore } from '../store'
import {
  buildImportedComponent,
  findExistingImportedComponent,
  parseProductUrl,
  type ImportSupplier,
} from '../utils/vendorImport'

interface Props {
  onClose: () => void
}

export default function ProductLinkImportModal({ onClose }: Props) {
  const addComponent = useStore((state) => state.addComponent)
  const components = useStore((state) => state.components)

  const [url, setUrl] = useState('')
  const [supplier, setSupplier] = useState<ImportSupplier>('Custom')
  const [partNumber, setPartNumber] = useState('')
  const [name, setName] = useState('')
  const [widthMm, setWidthMm] = useState('25')
  const [heightMm, setHeightMm] = useState('25')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')

  const parsed = useMemo(() => parseProductUrl(url), [url])
  const duplicate = useMemo(
    () => findExistingImportedComponent(components, supplier, partNumber),
    [components, partNumber, supplier],
  )

  const applyDetectedValues = () => {
    if (!parsed) {
      return
    }

    if (parsed.supplier) {
      setSupplier(parsed.supplier)
    }

    if (parsed.partNumber) {
      setPartNumber(parsed.partNumber)
      setName((current) => current || parsed.partNumber)
    }
  }

  const handleImport = () => {
    const width = Number.parseFloat(widthMm)
    const height = Number.parseFloat(heightMm)
    const priceDollars = Number.parseFloat(price)

    if (!partNumber.trim() || !name.trim()) {
      return
    }

    if (!(width > 0) || !(height > 0)) {
      return
    }

    if (duplicate) {
      return
    }

    addComponent(
      buildImportedComponent(
        {
          supplier,
          partNumber,
          name,
          widthMm: width,
          heightMm: height,
          priceCents: Number.isFinite(priceDollars)
            ? Math.round(priceDollars * 100)
            : 0,
          url: parsed?.normalizedUrl ?? url.trim(),
          notes,
        },
        components,
      ),
    )

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border border-[#445] bg-[#1e1e2e] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-[#7eb8f7]">Import Product Link</h2>
            <p className="mt-1 text-[10px] text-[#667]">
              Paste a Thorlabs, Newport, Coherent, or Light Conversion product URL.
              Vendor and part number can be detected now; dimensions and price still
              need confirmation.
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

        <div className="mb-4 space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-[#667]">
            Product URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://vendor.example/product/..."
              className="w-full rounded border border-[#556] bg-[#2a2a3a] px-3 py-2 text-xs text-white focus:border-[#7eb8f7] focus:outline-none"
            />
            <button
              type="button"
              onClick={applyDetectedValues}
              disabled={!parsed}
              className="rounded border border-[#4a7a8a] bg-[#2a3a4a] px-3 py-2 text-[10px] text-[#7eb8f7] disabled:cursor-not-allowed disabled:border-[#334] disabled:bg-[#171724] disabled:text-[#556]"
            >
              Detect
            </button>
          </div>
          <div className="text-[10px] text-[#556]">
            {parsed
              ? `Detected vendor: ${parsed.supplier ?? 'Unknown'} · Part number: ${parsed.partNumber || 'Not found in URL'}`
              : 'Enter a valid URL to enable vendor detection.'}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <Field label="Supplier">
            <select
              value={supplier}
              onChange={(event) => setSupplier(event.target.value as ImportSupplier)}
              className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-2 text-xs text-white focus:border-[#7eb8f7] focus:outline-none"
            >
              <option value="Custom">Custom</option>
              <option value="Thorlabs">Thorlabs</option>
              <option value="Newport">Newport</option>
              <option value="Coherent">Coherent</option>
              <option value="Light Conversion">Light Conversion</option>
            </select>
          </Field>

          <Field label="Part Number">
            <input
              type="text"
              value={partNumber}
              onChange={(event) => setPartNumber(event.target.value.toUpperCase())}
              className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-2 text-xs text-white focus:border-[#7eb8f7] focus:outline-none"
            />
          </Field>

          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-2 text-xs text-white focus:border-[#7eb8f7] focus:outline-none"
            />
          </Field>

          <Field label="Price">
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="USD"
              className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-2 text-xs text-white focus:border-[#7eb8f7] focus:outline-none"
            />
          </Field>

          <Field label="Width">
            <input
              type="number"
              min="0"
              step="0.1"
              value={widthMm}
              onChange={(event) => setWidthMm(event.target.value)}
              className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-2 text-xs text-white focus:border-[#7eb8f7] focus:outline-none"
            />
          </Field>

          <Field label="Height">
            <input
              type="number"
              min="0"
              step="0.1"
              value={heightMm}
              onChange={(event) => setHeightMm(event.target.value)}
              className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-2 text-xs text-white focus:border-[#7eb8f7] focus:outline-none"
            />
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Optional notes or any manually copied specs"
            className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-2 text-xs text-white focus:border-[#7eb8f7] focus:outline-none"
          />
        </Field>

        {duplicate ? (
          <div className="mt-4 rounded border border-[#5a3840] bg-[#22151a] px-3 py-2 text-[10px] text-[#d08b96]">
            A component with this supplier and part number is already in the library.
          </div>
        ) : null}

        <div className="mt-4 rounded border border-[#334] bg-[#171724] px-3 py-2 text-[10px] text-[#667]">
          Automatic price/dimension extraction needs a server-side importer or synced
          catalog. This modal gives you a link-assisted manual import path now.
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
            onClick={handleImport}
            disabled={
              !partNumber.trim() ||
              !name.trim() ||
              !(Number.parseFloat(widthMm) > 0) ||
              !(Number.parseFloat(heightMm) > 0) ||
              Boolean(duplicate)
            }
            className="rounded border border-[#7eb8f7] bg-[#2a3a4a] px-4 py-2 text-xs text-[#7eb8f7] transition-colors disabled:cursor-not-allowed disabled:border-[#334] disabled:bg-[#171724] disabled:text-[#556]"
          >
            Add To Library
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-[#667]">
        {label}
      </span>
      {children}
    </label>
  )
}
