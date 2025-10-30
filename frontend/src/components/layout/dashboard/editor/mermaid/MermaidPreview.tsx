'use client'

import { useMermaidRender } from '@/hooks/mermaid/useMermaidRender'

interface MermaidPreviewProps {
  code: string
}

export function MermaidPreview({ code }: MermaidPreviewProps) {
  const { svg, error } = useMermaidRender({ code })

  if (error) {
    return (
      <div className="mermaid-error">
        <p>{error}</p>
      </div>
    )
  }

  if (!code.trim()) {
    return (
      <div className="mermaid-empty">
        <p>Mermaidコードを入力すると、ここにプレビューが表示されます</p>
      </div>
    )
  }

  return <div className="mermaid-preview" dangerouslySetInnerHTML={{ __html: svg }} />
}
