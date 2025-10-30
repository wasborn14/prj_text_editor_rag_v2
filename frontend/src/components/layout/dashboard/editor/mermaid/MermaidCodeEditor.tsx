'use client'

import { memo } from 'react'

interface MermaidCodeEditorProps {
  code: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}

/**
 * Mermaidコードエディタコンポーネント
 */
export const MermaidCodeEditor = memo(function MermaidCodeEditor({
  code,
  onChange,
}: MermaidCodeEditorProps) {
  return (
    <div className="mermaid-editor" contentEditable={false}>
      <textarea
        value={code}
        onChange={onChange}
        placeholder="Mermaidコードを入力してください..."
        spellCheck={false}
        className="mermaid-textarea"
        contentEditable={true}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        aria-label="Mermaidコードエディタ"
      />
    </div>
  )
})
