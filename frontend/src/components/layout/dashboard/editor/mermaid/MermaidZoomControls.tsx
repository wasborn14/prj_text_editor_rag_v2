'use client'

import { ZoomIn, ZoomOut } from 'lucide-react'

interface MermaidZoomControlsProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  minZoom: number
  maxZoom: number
}

export function MermaidZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  minZoom,
  maxZoom,
}: MermaidZoomControlsProps) {
  return (
    <div className="mermaid-zoom-controls">
      <button
        className="zoom-btn"
        onClick={onZoomOut}
        title="縮小"
        disabled={zoom <= minZoom}
        aria-label="縮小"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <button
        className="zoom-btn"
        onClick={onZoomIn}
        title="拡大"
        disabled={zoom >= maxZoom}
        aria-label="拡大"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
    </div>
  )
}
