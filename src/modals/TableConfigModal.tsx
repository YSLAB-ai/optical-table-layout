import { useState } from 'react'

import { useStore } from '../store'
import { TABLE_PRESETS, type TableConfig } from '../types'

type NumericField = Exclude<keyof TableConfig, 'units'>
const MM_PER_INCH = 25.4

const NUMERIC_FIELDS: Array<{ key: NumericField; label: string; unit: string }> = [
  { key: 'widthMm', label: 'Table Width', unit: 'mm' },
  { key: 'heightMm', label: 'Table Height', unit: 'mm' },
  { key: 'holeSpacingMm', label: 'Hole Spacing', unit: 'mm' },
  { key: 'holeDiameterMm', label: 'Hole Diameter', unit: 'mm' },
  { key: 'borderMarginMm', label: 'Border Margin', unit: 'mm' },
]

export default function TableConfigModal() {
  const table = useStore((state) => state.table)
  const setTable = useStore((state) => state.setTable)
  const setShowTableConfig = useStore((state) => state.setShowTableConfig)
  const [local, setLocal] = useState<TableConfig>(table)

  const toDisplayValue = (valueMm: number) =>
    local.units === 'in' ? valueMm / MM_PER_INCH : valueMm

  const fromDisplayValue = (value: number) =>
    local.units === 'in' ? value * MM_PER_INCH : value

  const apply = () => {
    setTable(local)
    setShowTableConfig(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-[#445] bg-[#1e1e2e] p-6 shadow-2xl">
        <h2 className="mb-4 text-sm font-bold text-[#7eb8f7]">Table Configuration</h2>

        <div className="mb-4">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-[#667]">Presets</p>
          <div className="flex flex-wrap gap-2">
            {TABLE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setLocal({ ...preset.config })}
                className="rounded border border-[#4a7a8a] bg-[#2a3a4a] px-2 py-1 text-[10px] text-[#7eb8f7] transition-colors hover:bg-[#3a4a5a]"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4">
          {NUMERIC_FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-[#667]">
                {field.label}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step={local.units === 'in' ? '0.001' : '0.1'}
                  value={Number(toDisplayValue(local[field.key]).toFixed(3))}
                  onChange={(event) =>
                    setLocal((current) => ({
                      ...current,
                      [field.key]: fromDisplayValue(
                        Number.parseFloat(event.target.value) || 0,
                      ),
                    }))
                  }
                  className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-1 text-xs text-white focus:border-[#7eb8f7] focus:outline-none"
                />
                <span className="text-xs text-[#556]">
                  {local.units === 'in' ? 'in' : field.unit}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-6 flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider text-[#667]">Units</span>
          {(['mm', 'in'] as const).map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => setLocal((current) => ({ ...current, units: unit }))}
              className={`rounded border px-3 py-1 text-xs transition-colors ${
                local.units === unit
                  ? 'border-[#7eb8f7] bg-[#2a3a4a] text-[#7eb8f7]'
                  : 'border-[#334] bg-[#1a1a2a] text-[#667]'
              }`}
            >
              {unit}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowTableConfig(false)}
            className="rounded border border-[#445] bg-[#2a2a3a] px-4 py-2 text-xs text-[#aaa] transition-colors hover:bg-[#3a3a4a]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            className="rounded border border-[#7eb8f7] bg-[#2a3a4a] px-4 py-2 text-xs text-[#7eb8f7] transition-colors hover:bg-[#3a4a5a]"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
