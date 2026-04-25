import type { InspectionNode, PlacementSummary } from '../utils/assembly'

interface Props {
  summary: PlacementSummary
  x: number
  y: number
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function Tree({ nodes, depth = 0 }: { nodes: InspectionNode[]; depth?: number }) {
  return (
    <div className={depth === 0 ? 'mt-2 space-y-1' : 'mt-1 space-y-1 border-l border-[#2f3a52] pl-2'}>
      {nodes.map((node) => (
        <div key={`${node.type}-${node.refId}-${depth}`} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-[10px]">
            <div className="min-w-0">
              <span className="text-[#d0d6ea]">{node.name}</span>
              {node.partNumber ? (
                <span className="ml-1 text-[#6f7f9f]">{node.partNumber}</span>
              ) : null}
            </div>
            <span className="text-[#7eb8f7]">x{node.quantity}</span>
          </div>
          {node.children.length > 0 ? (
            <Tree nodes={node.children} depth={depth + 1} />
          ) : null}
        </div>
      ))}
    </div>
  )
}

export default function HoverCard({ summary, x, y }: Props) {
  return (
    <div
      className="pointer-events-none absolute z-20 w-72 rounded border border-[#32405c] bg-[#111827]/95 px-3 py-2 text-[10px] text-[#aac] shadow-2xl backdrop-blur"
      style={{ left: x, top: y }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-[#e3ebff]">{summary.name}</div>
          <div className="text-[#7eb8f7]">
            {summary.kind === 'assembly' ? 'Assembly' : summary.partNumber}
          </div>
        </div>
        <div className="text-right text-[#88c988]">
          {formatPrice(summary.totalCents)}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-[#8fa1c5]">
        <div>
          {summary.widthMm} x {summary.heightMm} mm
        </div>
        <div>{summary.supplier}</div>
      </div>

      {summary.kind === 'assembly' ? (
        <Tree nodes={summary.inspection.children} />
      ) : summary.notes ? (
        <div className="mt-2 text-[#7485a9]">{summary.notes}</div>
      ) : null}
    </div>
  )
}
