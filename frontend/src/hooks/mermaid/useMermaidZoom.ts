import { useState, useCallback } from 'react'

interface UseMermaidZoomOptions {
  defaultZoom: number
  minZoom: number
  maxZoom: number
  zoomStep: number
}

/**
 * Mermaidズーム機能を管理するカスタムフック
 */
export function useMermaidZoom({ defaultZoom, minZoom, maxZoom, zoomStep }: UseMermaidZoomOptions) {
  const [zoom, setZoom] = useState(defaultZoom)

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + zoomStep, maxZoom))
  }, [zoomStep, maxZoom])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - zoomStep, minZoom))
  }, [zoomStep, minZoom])

  return {
    zoom,
    setZoom,
    handleZoomIn,
    handleZoomOut,
  }
}
