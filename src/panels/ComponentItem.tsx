import type { DragEvent } from 'react'

import type { Component } from '../types'

interface Props {
  component: Component
  showVendorBadge?: boolean
  showSearchMeta?: boolean
}

export default function ComponentItem({
  component,
  showVendorBadge = false,
  showSearchMeta = false,
}: Props) {
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('componentId', component.id)
    event.dataTransfer.setData('componentJson', JSON.stringify(component))
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`group flex cursor-grab select-none gap-2 px-3 hover:bg-[#2a2a3a] active:cursor-grabbing ${
        showSearchMeta ? 'items-start py-2' : 'items-center py-1.5'
      }`}
      title={`${component.name} - $${(component.priceCents / 100).toFixed(2)}`}
    >
      <div
        className="h-3 w-3 flex-shrink-0 rounded-sm border border-white/10"
        style={{ background: component.color }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[10px] text-[#aaa] group-hover:text-[#ccc]">
            {component.partNumber}
          </span>
          {showVendorBadge ? (
            <span className="rounded border border-[#314766] bg-[#182130] px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-[#8fb5dc]">
              {component.supplier}
            </span>
          ) : null}
        </div>
        <div
          className={`mt-0.5 truncate ${
            showSearchMeta ? 'text-[9px] text-[#9ba7c2]' : 'text-[9px] text-[#556]'
          }`}
        >
          {component.name}
        </div>
        {showSearchMeta ? (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[8px] uppercase tracking-wider text-[#5f6e8b]">
            <span>{component.category}</span>
            <span>
              {component.widthMm} x {component.heightMm} mm
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
