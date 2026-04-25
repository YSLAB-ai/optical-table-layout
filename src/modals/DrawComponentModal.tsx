import { useState, type ReactNode } from 'react'

interface Props {
  initialWidthMm: number
  initialHeightMm: number
  title?: string
  description?: string
  onClose: () => void
  onSave: (input: {
    name: string
    partNumber: string
    widthMm: number
    heightMm: number
    priceCents: number
    notes: string
    color: string
  }) => void
}

export default function DrawComponentModal({
  initialWidthMm,
  initialHeightMm,
  title = 'Create Custom Component',
  description = 'Confirm the part details for the rectangle you just drew.',
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState('')
  const [partNumber, setPartNumber] = useState('CUSTOM')
  const [widthMm, setWidthMm] = useState(initialWidthMm.toFixed(1))
  const [heightMm, setHeightMm] = useState(initialHeightMm.toFixed(1))
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [color, setColor] = useState('#3f5878')

  const handleSave = () => {
    const width = Number.parseFloat(widthMm)
    const height = Number.parseFloat(heightMm)
    const priceDollars = Number.parseFloat(price)

    if (!name.trim() || !partNumber.trim() || !(width > 0) || !(height > 0)) {
      return
    }

    onSave({
      name: name.trim(),
      partNumber: partNumber.trim(),
      widthMm: width,
      heightMm: height,
      priceCents: Number.isFinite(priceDollars)
        ? Math.round(priceDollars * 100)
        : 0,
      notes: notes.trim(),
      color,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border border-[#445] bg-[#1e1e2e] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-[#7eb8f7]">
              {title}
            </h2>
            <p className="mt-1 text-[10px] text-[#667]">
              {description}
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

        <div className="grid grid-cols-2 gap-4">
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-2 text-xs text-white focus:border-[#7eb8f7] focus:outline-none"
            />
          </Field>
          <Field label="Part Number">
            <input
              type="text"
              value={partNumber}
              onChange={(event) => setPartNumber(event.target.value)}
              className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-2 text-xs text-white focus:border-[#7eb8f7] focus:outline-none"
            />
          </Field>
          <Field label="Width (mm)">
            <input
              type="number"
              min="0"
              step="0.1"
              value={widthMm}
              onChange={(event) => setWidthMm(event.target.value)}
              className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-2 text-xs text-white focus:border-[#7eb8f7] focus:outline-none"
            />
          </Field>
          <Field label="Height (mm)">
            <input
              type="number"
              min="0"
              step="0.1"
              value={heightMm}
              onChange={(event) => setHeightMm(event.target.value)}
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
              className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-2 text-xs text-white focus:border-[#7eb8f7] focus:outline-none"
            />
          </Field>
          <Field label="Color">
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-10 w-full rounded border border-[#556] bg-[#2a2a3a] px-1 py-1"
            />
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-2 text-xs text-white focus:border-[#7eb8f7] focus:outline-none"
          />
        </Field>

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
            className="rounded border border-[#7eb8f7] bg-[#2a3a4a] px-4 py-2 text-xs text-[#7eb8f7]"
          >
            Save Component
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
  children: ReactNode
  label: string
}) {
  return (
    <label className="mt-4 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-[#667]">
        {label}
      </span>
      {children}
    </label>
  )
}
