import { useStore } from '../store'
import {
  canConvertHoleStackToAssembly,
  resolvePlacementSummary,
  summarizeHoleComponentStack,
} from '../utils/assembly'

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function Row({
  label,
  value,
  valueClass = 'text-[#ccc]',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[#667]">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  )
}

export default function PropertiesPanel() {
  const selectedId = useStore((state) => state.selectedId)
  const selectedType = useStore((state) => state.selectedType)
  const placements = useStore((state) => state.placements)
  const beamPaths = useStore((state) => state.beamPaths)
  const components = useStore((state) => state.components)
  const assemblies = useStore((state) => state.assemblies)
  const table = useStore((state) => state.table)
  const rotatePlacement = useStore((state) => state.rotatePlacement)
  const deleteSelected = useStore((state) => state.deleteSelected)
  const updateBeamPath = useStore((state) => state.updateBeamPath)
  const convertHoleStackToAssembly = useStore(
    (state) => state.convertHoleStackToAssembly,
  )

  if (!selectedId) {
    return (
      <div className="p-3">
        <p className="mb-3 text-[10px] uppercase tracking-wider text-[#667]">
          Properties
        </p>
        <p className="text-[10px] italic text-[#445]">Select a component</p>
        <div className="mt-4 border-t border-[#222] pt-3">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-[#667]">
            Table
          </p>
          <div className="space-y-1 text-[10px] text-[#556]">
            <div>
              {table.widthMm} x {table.heightMm} mm
            </div>
            <div>Spacing: {table.holeSpacingMm} mm</div>
          </div>
        </div>
      </div>
    )
  }

  if (selectedType === 'beam') {
    const beam = beamPaths.find((candidate) => candidate.id === selectedId)

    if (!beam) {
      return null
    }

    return (
      <div className="overflow-y-auto p-3">
        <p className="mb-3 text-[10px] uppercase tracking-wider text-[#667]">
          Properties
        </p>
        <p className="mb-1 text-[11px] font-semibold text-[#7eb8f7]">
          {beam.label || 'Beam Path'}
        </p>
        <div className="space-y-2 text-[10px]">
          <div className="flex flex-col gap-1">
            <span className="text-[#667]">Label</span>
            <input
              type="text"
              value={beam.label}
              onChange={(event) =>
                updateBeamPath(beam.id, { label: event.target.value })
              }
              className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-1 text-[10px] text-white focus:border-[#7eb8f7] focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[#667]">Wavelength</span>
            <input
              type="number"
              value={beam.wavelengthNm}
              onChange={(event) =>
                updateBeamPath(beam.id, {
                  wavelengthNm: Number.parseFloat(event.target.value) || 0,
                })
              }
              className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-1 text-[10px] text-white focus:border-[#7eb8f7] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[#667]">Color</span>
              <input
                type="color"
                value={beam.color}
                onChange={(event) =>
                  updateBeamPath(beam.id, { color: event.target.value })
                }
                className="h-8 w-full rounded border border-[#556] bg-[#2a2a3a] px-1 py-1"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[#667]">Line Style</span>
              <select
                value={beam.lineStyle}
                onChange={(event) =>
                  updateBeamPath(beam.id, {
                    lineStyle: event.target.value as 'solid' | 'dashed',
                  })
                }
                className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-1 text-[10px] text-white focus:border-[#7eb8f7] focus:outline-none"
              >
                <option value="solid">solid</option>
                <option value="dashed">dashed</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[#667]">Polarization</span>
            <input
              type="text"
              value={beam.polarization}
              onChange={(event) =>
                updateBeamPath(beam.id, { polarization: event.target.value })
              }
              className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-1 text-[10px] text-white focus:border-[#7eb8f7] focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[#667]">Power (mW)</span>
            <input
              type="number"
              value={beam.powerMw ?? ''}
              onChange={(event) =>
                updateBeamPath(beam.id, {
                  powerMw:
                    event.target.value === ''
                      ? null
                      : Number.parseFloat(event.target.value) || 0,
                })
              }
              className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-1 text-[10px] text-white focus:border-[#7eb8f7] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={deleteSelected}
            className="mt-3 w-full rounded border border-[#5a3840] bg-[#22151a] px-2 py-1.5 text-[10px] text-[#d08b96] hover:bg-[#2b1b21]"
          >
            Delete Beam
          </button>
        </div>
      </div>
    )
  }

  const placement = placements.find((candidate) => candidate.id === selectedId)

  if (!placement) {
    return null
  }

  const summary = resolvePlacementSummary(placement, components, assemblies)
  const stackedHoleItems =
    summary?.kind === 'component'
      ? summarizeHoleComponentStack(placement.id, placements, components)
      : []
  const canMakeAssembly =
    summary?.kind === 'component' &&
    canConvertHoleStackToAssembly(placements, placement.id)

  if (!summary) {
    return null
  }

  return (
    <div className="overflow-y-auto p-3">
      <p className="mb-3 text-[10px] uppercase tracking-wider text-[#667]">
        Properties
      </p>

      <p className="mb-1 text-[11px] font-semibold text-[#7eb8f7]">
        {summary.name}
      </p>
      <p className="mb-3 text-[10px] text-[#556]">
        {summary.kind === 'assembly' ? 'Assembly' : summary.partNumber} ·{' '}
        {summary.supplier}
      </p>

      <div className="space-y-2 text-[10px]">
        <Row label="Width" value={`${summary.widthMm} mm`} />
        <Row label="Height" value={`${summary.heightMm} mm`} />
        <Row
          label="Position"
          value={`(${placement.x.toFixed(1)}, ${placement.y.toFixed(1)}) mm`}
        />
        {placement.holeCol !== undefined ? (
          <Row
            label="Hole"
            value={`Col ${placement.holeCol}, Row ${placement.holeRow}`}
          />
        ) : null}

        <div className="flex flex-col gap-1">
          <span className="text-[#667]">Rotation</span>
          <input
            type="number"
            value={placement.rotation}
            onChange={(event) =>
              rotatePlacement(
                placement.id,
                Number.parseFloat(event.target.value) || 0,
              )
            }
            className="w-full rounded border border-[#556] bg-[#2a2a3a] px-2 py-1 text-[10px] text-white focus:border-[#7eb8f7] focus:outline-none"
          />
        </div>

        <Row
          label="Price"
          value={formatPrice(summary.totalCents)}
          valueClass="text-[#88c988]"
        />

        {canMakeAssembly ? (
          <div className="rounded border border-[#32405c] bg-[#171f2f] px-2 py-2 text-[10px] text-[#94a4c6]">
            <div className="mb-1 font-semibold text-[#cfe0ff]">
              Components On This Hole
            </div>
            <div className="space-y-1">
              {stackedHoleItems.map((item) => (
                <div
                  key={item.refId}
                  className="flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[#c6d4f0]">
                      {item.partNumber}
                    </div>
                    <div className="truncate text-[#7b8aa8]">{item.name}</div>
                  </div>
                  <span className="text-[#7eb8f7]">x{item.quantity}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const nextName = window.prompt(
                  'Assembly name',
                  `Assembly ${assemblies.length + 1}`,
                )

                if (!nextName || !nextName.trim()) {
                  return
                }

                convertHoleStackToAssembly(placement.id, nextName)
              }}
              className="mt-3 w-full rounded border border-[#4a6a4a] bg-[#213226] px-2 py-1.5 text-[10px] text-[#88c988] hover:bg-[#28402f]"
            >
              Make Assembly
            </button>
          </div>
        ) : null}

        {summary.kind === 'assembly' ? (
          <div className="rounded border border-[#32405c] bg-[#171f2f] px-2 py-2 text-[10px] text-[#94a4c6]">
            <div className="mb-1 font-semibold text-[#cfe0ff]">Assembly Contents</div>
            <div className="space-y-1">
              {summary.inspection.children.map((item) => (
                <div key={`${item.type}-${item.refId}`} className="flex justify-between gap-2">
                  <span className="truncate text-[#c6d4f0]">{item.name}</span>
                  <span className="text-[#7eb8f7]">x{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {summary.kind === 'component' && summary.inspection.refId && summary.kind === 'component' ? (
          <div className="rounded border border-[#27324a] bg-[#151b28] px-2 py-1.5 text-[10px] text-[#7b8aa8]">
            Category: {components.find((candidate) => candidate.id === placement.refId)?.category ?? 'Other'}
          </div>
        ) : null}

        {summary.kind === 'component' &&
        components.find((candidate) => candidate.id === placement.refId)?.url ? (
          <div>
            <a
              href={
                components.find((candidate) => candidate.id === placement.refId)
                  ?.url
              }
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-[#7eb8f7] underline"
            >
              {summary.supplier} link
            </a>
          </div>
        ) : null}

        {summary.notes ? (
          <div className="mt-2 italic text-[#556]">{summary.notes}</div>
        ) : null}

        <button
          type="button"
          onClick={deleteSelected}
          className="mt-3 w-full rounded border border-[#5a3840] bg-[#22151a] px-2 py-1.5 text-[10px] text-[#d08b96] hover:bg-[#2b1b21]"
        >
          {summary.kind === 'assembly' ? 'Delete Placement' : 'Delete Component'}
        </button>
      </div>
    </div>
  )
}
