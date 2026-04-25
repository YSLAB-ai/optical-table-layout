import { useState } from 'react'

import type { Component } from '../types'
import ComponentItem from './ComponentItem'

interface Props {
  title: string
  components: Component[]
  defaultOpen?: boolean
}

export default function CatalogSection({
  title,
  components,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-1 border-b border-[#222] px-2 py-1.5 text-[10px] uppercase tracking-wider text-[#aaa] transition-colors hover:bg-[#1a1a2a] hover:text-[#ccc]"
      >
        <span>{open ? 'v' : '>'}</span>
        <span className="flex-1 text-left">{title}</span>
        <span className="text-[#445]">{components.length}</span>
      </button>
      {open ? (
        <div>
          {components.map((component) => (
            <ComponentItem key={component.id} component={component} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
