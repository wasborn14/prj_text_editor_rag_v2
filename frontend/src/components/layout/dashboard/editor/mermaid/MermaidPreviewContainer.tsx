'use client'

import { memo, forwardRef } from 'react'
import { MermaidPreview } from './MermaidPreview'

interface MermaidPreviewContainerProps {
  code: string
  zoom: number
  previewWrapperRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Mermaidプレビューコンテナコンポーネント
 */
export const MermaidPreviewContainer = memo(
  forwardRef<HTMLDivElement, MermaidPreviewContainerProps>(function MermaidPreviewContainer(
    { code, zoom, previewWrapperRef },
    containerRef
  ) {
    return (
      <div className="mermaid-preview-container" ref={containerRef}>
        <div
          ref={previewWrapperRef}
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
        >
          <MermaidPreview code={code} />
        </div>
      </div>
    )
  })
)
