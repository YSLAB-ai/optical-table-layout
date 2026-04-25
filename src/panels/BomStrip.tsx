import { useStore } from '../store'
import { findPlacementOverlaps } from '../utils/collisions'
import { computeBom, grandTotalCents } from '../utils/bom'
import {
  buildBeamsCsv,
  buildBomCsv,
  serializeLayoutSvg,
} from '../utils/export'

function downloadText(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function downloadDataUrl(filename: string, dataUrl: string) {
  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = filename
  anchor.click()
}

export default function BomStrip() {
  const placements = useStore((state) => state.placements)
  const components = useStore((state) => state.components)
  const assemblies = useStore((state) => state.assemblies)
  const beamPaths = useStore((state) => state.beamPaths)
  const table = useStore((state) => state.table)
  const exportStagePng = useStore((state) => state.exportStagePng)
  const showBomDrawer = useStore((state) => state.showBomDrawer)
  const setShowBomDrawer = useStore((state) => state.setShowBomDrawer)
  const lines = computeBom(placements, components, assemblies)
  const totalQty = lines.reduce((sum, line) => sum + line.quantity, 0)
  const totalCents = grandTotalCents(lines)
  const overlaps = findPlacementOverlaps(placements, components, assemblies)

  const handleExportCsv = () => {
    downloadText('bom.csv', buildBomCsv(lines), 'text/csv;charset=utf-8')
    downloadText(
      'beams.csv',
      buildBeamsCsv(beamPaths),
      'text/csv;charset=utf-8',
    )
  }

  const handleExportSvg = () => {
    downloadText(
      'layout.svg',
      serializeLayoutSvg({
        table,
        placements,
        components,
        assemblies,
        beamPaths,
      }),
      'image/svg+xml;charset=utf-8',
    )
  }

  const handleExportPng = () => {
    const stageDataUrl = exportStagePng?.()

    if (stageDataUrl) {
      downloadDataUrl('layout.png', stageDataUrl)
      return
    }

    const canvas = document.querySelector<HTMLCanvasElement>(
      '.konvajs-content canvas',
    )

    if (canvas) {
      downloadDataUrl('layout.png', canvas.toDataURL('image/png'))
    }
  }

  if (placements.length === 0) {
    return (
      <div className="flex h-8 flex-shrink-0 items-center border-t border-[#334] bg-[#1a1a2a] px-3 text-[10px] text-[#445]">
        No components placed
      </div>
    )
  }

  return (
    <div className="flex-shrink-0 border-t border-[#334] bg-[#1a1a2a] text-[10px]">
      <div className="flex h-8 items-center gap-4 px-3">
        <button
          type="button"
          onClick={() => setShowBomDrawer(!showBomDrawer)}
          className="text-[#7eb8f7]"
        >
          BOM {showBomDrawer ? 'v' : '>'}
        </button>
        <span className="text-[#aaa]">
          {placements.length} placements · {totalQty} parts
        </span>
        <span className="font-semibold text-[#88c988]">
          Est. total: ${(totalCents / 100).toFixed(2)}
        </span>
        {overlaps.length > 0 ? (
          <span className="rounded border border-[#5a3840] bg-[#22151a] px-2 py-0.5 text-[9px] text-[#d08b96]">
            {overlaps.length} overlap{overlaps.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      {showBomDrawer ? (
        <div className="border-t border-[#293245] px-3 py-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded border border-[#4a7a8a] bg-[#2a3a4a] px-2 py-1 text-[10px] text-[#7eb8f7]"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleExportPng}
              className="rounded border border-[#4a7a8a] bg-[#2a3a4a] px-2 py-1 text-[10px] text-[#7eb8f7]"
            >
              Export PNG
            </button>
            <button
              type="button"
              onClick={handleExportSvg}
              className="rounded border border-[#4a7a8a] bg-[#2a3a4a] px-2 py-1 text-[10px] text-[#7eb8f7]"
            >
              Export SVG
            </button>
          </div>

          <div className="overflow-x-auto rounded border border-[#273142]">
            <table className="min-w-full border-collapse text-left text-[10px]">
              <thead className="bg-[#141b28] text-[#8091b2]">
                <tr>
                  <th className="px-2 py-2">Part #</th>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Supplier</th>
                  <th className="px-2 py-2">Qty</th>
                  <th className="px-2 py-2">Unit</th>
                  <th className="px-2 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr
                    key={line.componentId}
                    className="border-t border-[#222c3d] text-[#c6d4f0]"
                  >
                    <td className="px-2 py-2 text-[#7eb8f7]">{line.partNumber}</td>
                    <td className="px-2 py-2">{line.name}</td>
                    <td className="px-2 py-2 text-[#7b8aa8]">{line.supplier}</td>
                    <td className="px-2 py-2">{line.quantity}</td>
                    <td className="px-2 py-2">${(line.unitCents / 100).toFixed(2)}</td>
                    <td className="px-2 py-2 text-[#88c988]">
                      ${(line.totalCents / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
