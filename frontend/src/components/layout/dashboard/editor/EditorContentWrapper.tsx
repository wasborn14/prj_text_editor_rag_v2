import { useEffect } from 'react'
import { useEditor } from 'novel'
import { SlashCommandMenu } from './SlashCommandMenu'
import { TableToolbar } from './TableToolbar'

interface EditorContentWrapperProps {
  showMenu: boolean
  setShowMenu: (show: boolean) => void
  menuPosition: { top: number; left: number }
  setMenuPosition: (pos: { top: number; left: number }) => void
  showTableToolbar: boolean
  setShowTableToolbar: (show: boolean) => void
  tableToolbarPosition: { top: number; left: number }
  setTableToolbarPosition: (pos: { top: number; left: number }) => void
}

export function EditorContentWrapper({
  showMenu,
  setShowMenu,
  menuPosition,
  setMenuPosition,
  showTableToolbar,
  setShowTableToolbar,
  tableToolbarPosition,
  setTableToolbarPosition
}: EditorContentWrapperProps) {
  const { editor } = useEditor()

  useEffect(() => {
    if (!editor) return

    const slashMenuExt = editor.extensionManager.extensions.find(
      ext => ext.name === 'slashMenu'
    )
    if (slashMenuExt) {
      slashMenuExt.storage.menuOpen = showMenu
    }
  }, [editor, showMenu])

  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      const { $from, from } = editor.state.selection
      const nodeStart = $from.start()
      const text = editor.state.doc.textBetween(Math.max(0, from - 1), from)
      const textFromStart = editor.state.doc.textBetween(nodeStart, from)

      // スラッシュコマンドチェック
      if (text === '/' && textFromStart === '/') {
        const { view } = editor
        const coords = view.coordsAtPos(from)

        setMenuPosition({
          top: coords.bottom + window.scrollY + 5,
          left: coords.left + window.scrollX
        })
        setShowMenu(true)
      } else {
        setShowMenu(false)
      }

      // テーブルチェック
      const { selection, doc } = editor.state
      const resolvedPos = doc.resolve(selection.from)
      let inTable = false
      let tablePos = null

      for (let i = resolvedPos.depth; i > 0; i--) {
        const node = resolvedPos.node(i)
        if (node.type.name === 'table') {
          inTable = true
          tablePos = resolvedPos.start(i)
          break
        }
      }

      if (inTable && tablePos !== null) {
        const { view } = editor
        const tableCoords = view.coordsAtPos(tablePos)

        setTableToolbarPosition({
          top: tableCoords.top + window.scrollY - 40,
          left: tableCoords.left + window.scrollX
        })
        setShowTableToolbar(true)
      } else {
        setShowTableToolbar(false)
      }
    }

    editor.on('update', handleUpdate)
    editor.on('selectionUpdate', handleUpdate)

    return () => {
      editor.off('update', handleUpdate)
      editor.off('selectionUpdate', handleUpdate)
    }
  }, [editor, setMenuPosition, setShowMenu, setShowTableToolbar, setTableToolbarPosition])

  return (
    <>
      {showMenu && editor && (
        <div
          style={{
            position: 'fixed',
            top: menuPosition.top,
            left: menuPosition.left,
            zIndex: 9999
          }}
        >
          <SlashCommandMenu
            editor={editor}
            onClose={() => setShowMenu(false)}
            showMenu={showMenu}
          />
        </div>
      )}
      {showTableToolbar && editor && (
        <div
          style={{
            position: 'fixed',
            top: tableToolbarPosition.top,
            left: tableToolbarPosition.left,
            zIndex: 9999
          }}
        >
          <TableToolbar
            editor={editor}
            onClose={() => setShowTableToolbar(false)}
          />
        </div>
      )}
    </>
  )
}
