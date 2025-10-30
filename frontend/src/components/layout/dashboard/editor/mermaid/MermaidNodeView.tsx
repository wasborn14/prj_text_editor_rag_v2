'use client'

import { useState, useEffect, useCallback } from 'react'
import { MermaidCodeEditor } from './MermaidCodeEditor'
import { MermaidPreviewContainer } from './MermaidPreviewContainer'
import { MermaidZoomControls } from './MermaidZoomControls'
import { MermaidModeToggle, type ViewMode } from './MermaidModeToggle'
import { useMermaidZoom } from '@/hooks/mermaid/useMermaidZoom'
import { useMermaidAutoZoom } from '@/hooks/mermaid/useMermaidAutoZoom'

interface MermaidNodeViewProps {
  code: string
  onUpdate: (code: string) => void
}

const ZOOM_CONFIG = {
  MIN: 10,
  MAX: 200,
  STEP: 10,
  DEFAULT: 50,
} as const

export function MermaidNodeView({ code: initialCode, onUpdate }: MermaidNodeViewProps) {
  const [code, setCode] = useState(initialCode)
  const [viewMode, setViewMode] = useState<ViewMode>('preview')

  const { zoom, setZoom, handleZoomIn, handleZoomOut } = useMermaidZoom({
    defaultZoom: ZOOM_CONFIG.DEFAULT,
    minZoom: ZOOM_CONFIG.MIN,
    maxZoom: ZOOM_CONFIG.MAX,
    zoomStep: ZOOM_CONFIG.STEP,
  })

  const { containerRef, previewWrapperRef } = useMermaidAutoZoom({
    code,
    viewMode,
    minZoom: ZOOM_CONFIG.MIN,
    maxZoom: ZOOM_CONFIG.MAX,
    onZoomChange: setZoom,
  })

  useEffect(() => {
    setCode(initialCode)
  }, [initialCode])

  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newCode = e.target.value
      setCode(newCode)
      onUpdate(newCode)
    },
    [onUpdate]
  )

  return (
    <div className="mermaid-node-view" contentEditable={false}>
      <div className="mermaid-header">
        <MermaidZoomControls
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          minZoom={ZOOM_CONFIG.MIN}
          maxZoom={ZOOM_CONFIG.MAX}
        />
        <MermaidModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      <div className={`mermaid-content ${viewMode === 'code' ? 'code-only' : 'preview-only'}`}>
        {viewMode === 'code' && <MermaidCodeEditor code={code} onChange={handleCodeChange} />}

        {viewMode === 'preview' && (
          <MermaidPreviewContainer
            code={code}
            zoom={zoom}
            ref={containerRef}
            previewWrapperRef={previewWrapperRef}
          />
        )}
      </div>
    </div>
  )
}
