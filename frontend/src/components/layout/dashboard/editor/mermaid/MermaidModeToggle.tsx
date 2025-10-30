'use client'

import { Eye, Code } from 'lucide-react'

export type ViewMode = 'code' | 'preview'

interface MermaidModeToggleProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function MermaidModeToggle({ viewMode, onViewModeChange }: MermaidModeToggleProps) {
  const handleToggle = () => {
    onViewModeChange(viewMode === 'preview' ? 'code' : 'preview')
  }

  const isPreview = viewMode === 'preview'

  return (
    <div className="mermaid-mode-toggle">
      <button
        className="mode-btn"
        onClick={handleToggle}
        title={isPreview ? 'コード表示' : 'プレビュー表示'}
        aria-label={isPreview ? 'コードを表示' : 'プレビューを表示'}
      >
        {isPreview ? <Code className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        <span>{isPreview ? 'コード' : 'プレビュー'}</span>
      </button>
    </div>
  )
}
