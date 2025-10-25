import { useState, useEffect, useRef } from 'react'
import type { NovelEditor } from '@/types/prosemirror'
import { SLASH_COMMANDS, executeSlashCommand } from '@/lib/editor/slashCommands'

interface SlashCommandMenuProps {
  editor: NovelEditor
  onClose: () => void
  showMenu: boolean
}

export function SlashCommandMenu({ editor, onClose, showMenu }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const search = ''
  const isComposingRef = useRef(false)

  const filteredCommands = SLASH_COMMANDS.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (!showMenu) return

    // IME変換状態を追跡
    const handleCompositionStart = () => {
      isComposingRef.current = true
    }
    const handleCompositionEnd = () => {
      isComposingRef.current = false
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // IME変換中はキーイベントを処理しない
      if (isComposingRef.current) {
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()

        if (filteredCommands[selectedIndex]) {
          executeSlashCommand(editor, filteredCommands[selectedIndex], onClose)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('compositionstart', handleCompositionStart)
    window.addEventListener('compositionend', handleCompositionEnd)
    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.removeEventListener('compositionstart', handleCompositionStart)
      window.removeEventListener('compositionend', handleCompositionEnd)
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [selectedIndex, filteredCommands, editor, onClose, showMenu])

  return (
    <div className="absolute z-50 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
      <div className="max-h-64 overflow-y-auto py-1">
        {filteredCommands.map((cmd, index) => (
          <button
            key={cmd.id}
            onClick={() => {
              executeSlashCommand(editor, cmd, onClose)
            }}
            className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 ${
              index === selectedIndex ? 'bg-gray-100' : ''
            }`}
          >
            <span className="font-bold text-gray-600 w-8">{cmd.icon}</span>
            <span>{cmd.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
