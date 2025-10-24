import type { NovelEditor } from '@/types/prosemirror'

export interface SlashCommand {
  id: string
  label: string
  icon: string
  action: (editor: NovelEditor) => void
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'h1',
    label: 'Heading 1',
    icon: 'H1',
    action: (editor) => editor.chain().focus().setHeading({ level: 1 }).run()
  },
  {
    id: 'h2',
    label: 'Heading 2',
    icon: 'H2',
    action: (editor) => editor.chain().focus().setHeading({ level: 2 }).run()
  },
  {
    id: 'h3',
    label: 'Heading 3',
    icon: 'H3',
    action: (editor) => editor.chain().focus().setHeading({ level: 3 }).run()
  },
  {
    id: 'paragraph',
    label: 'Text',
    icon: '¶',
    action: (editor) => editor.chain().focus().setParagraph().run()
  },
  {
    id: 'bullet',
    label: 'Bullet List',
    icon: '•',
    action: (editor) => editor.chain().focus().toggleBulletList().run()
  },
  {
    id: 'number',
    label: 'Numbered List',
    icon: '1.',
    action: (editor) => editor.chain().focus().toggleOrderedList().run()
  },
  {
    id: 'quote',
    label: 'Quote',
    icon: '"',
    action: (editor) => editor.chain().focus().toggleBlockquote().run()
  },
  {
    id: 'code',
    label: 'Code Block',
    icon: '</>',
    action: (editor) => editor.chain().focus().setCodeBlock().run()
  },
  {
    id: 'table',
    label: 'Table',
    icon: '⊞',
    action: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }
]

export const executeSlashCommand = (editor: NovelEditor, command: SlashCommand, onClose: () => void) => {
  const { from } = editor.state.selection
  editor.chain().focus().deleteRange({ from: from - 1, to: from }).run()
  editor.chain().focus().run()
  command.action(editor)
  onClose()
}
