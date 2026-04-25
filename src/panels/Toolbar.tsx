import { serializeLayoutForPersistence, useStore } from '../store'
import type { LayoutState } from '../types'
import { AUTOSAVE_KEY } from '../utils/autosave'

function downloadJson(state: LayoutState) {
  const date = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = `layout-${date}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function Toolbar() {
  const activeTool = useStore((state) => state.activeTool)
  const setActiveTool = useStore((state) => state.setActiveTool)
  const setShowTableConfig = useStore((state) => state.setShowTableConfig)
  const replaceLayout = useStore((state) => state.replaceLayout)

  const handleSave = () => {
    downloadJson(serializeLayoutForPersistence(useStore.getState()))
  }

  const handleLoad = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = () => {
      const file = input.files?.[0]

      if (!file) {
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as LayoutState
          replaceLayout(data)
        } catch {
          alert('Invalid layout file.')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleFreshStart = () => {
    const confirmed = window.confirm(
      'Clear the current autosaved layout and start from a blank table?',
    )

    if (!confirmed) {
      return
    }

    localStorage.removeItem(AUTOSAVE_KEY)
    window.location.reload()
  }

  const handleToolChange = (tool: typeof activeTool) => {
    setActiveTool(tool)
    window.dispatchEvent(
      new CustomEvent('opticslayout:tool-change', {
        detail: tool,
      }),
    )
  }

  const toolButton = (id: typeof activeTool, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => handleToolChange(id)}
      className={`rounded border px-2 py-1 text-[10px] transition-colors ${
        activeTool === id
          ? 'border-[#7eb8f7] bg-[#2a3a4a] text-[#7eb8f7]'
          : 'border-[#334] bg-[#1a1a2a] text-[#667] hover:text-[#aaa]'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex h-10 flex-shrink-0 items-center gap-2 border-b border-[#334] bg-[#1a1a2e] px-3">
      <span className="mr-2 text-sm font-bold text-[#7eb8f7]">OpticsLayout</span>

      {toolButton('select', 'Select')}
      {toolButton('draw', 'Draw')}
      {toolButton('beam', 'Beam')}

      <span className="ml-2 text-[10px] text-[#556]">
        {activeTool === 'select'
          ? 'Place, inspect, move, rotate, and delete'
          : activeTool === 'draw'
            ? 'Draw a rectangle to create a custom component'
            : 'Click to add beam points, then double-click to finish'}
      </span>

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => setShowTableConfig(true)}
        className="rounded border border-[#334] bg-[#1a1a2a] px-2 py-1 text-[10px] text-[#667] hover:text-[#aaa]"
      >
        Table
      </button>
      <button
        type="button"
        onClick={handleLoad}
        className="rounded border border-[#334] bg-[#1a1a2a] px-2 py-1 text-[10px] text-[#667] hover:text-[#aaa]"
      >
        Load
      </button>
      <button
        type="button"
        onClick={handleFreshStart}
        className="rounded border border-[#5a3840] bg-[#22151a] px-2 py-1 text-[10px] text-[#d08b96] hover:bg-[#2b1b21]"
      >
        Fresh Start
      </button>
      <button
        type="button"
        onClick={handleSave}
        className="rounded border border-[#4a7a8a] bg-[#2a3a4a] px-2 py-1 text-[10px] text-[#7eb8f7] hover:bg-[#3a4a5a]"
      >
        Save JSON
      </button>
    </div>
  )
}
