import { useEffect, useRef } from 'react'
import type { ViewMode } from '@/components/layout/dashboard/editor/mermaid/MermaidModeToggle'

interface UseMermaidAutoZoomOptions {
  code: string
  viewMode: ViewMode
  minZoom: number
  maxZoom: number
  onZoomChange: (zoom: number) => void
}

const CONTAINER_PADDING = 48
const SVG_RENDER_DELAY = 100

/**
 * SVGサイズを検出してコンテナに収まるズーム率を自動計算するカスタムフック
 */
export function useMermaidAutoZoom({
  code,
  viewMode,
  minZoom,
  maxZoom,
  onZoomChange,
}: UseMermaidAutoZoomOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previewWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (viewMode !== 'preview') return

    const calculateFitZoom = () => {
      const container = containerRef.current
      const svgElement = previewWrapperRef.current?.querySelector(
        '.mermaid-preview svg'
      ) as SVGSVGElement | null

      if (!container || !svgElement) return

      const containerWidth = container.clientWidth - CONTAINER_PADDING
      const containerHeight = container.clientHeight - CONTAINER_PADDING
      const svgWidth = svgElement.width.baseVal.value
      const svgHeight = svgElement.height.baseVal.value

      if (svgWidth === 0 || svgHeight === 0) return

      const widthRatio = containerWidth / svgWidth
      const heightRatio = containerHeight / svgHeight
      const fitZoom = Math.min(widthRatio, heightRatio, 1) * 100

      const clampedZoom = Math.max(minZoom, Math.min(fitZoom, maxZoom))
      onZoomChange(Math.round(clampedZoom))
    }

    const timer = setTimeout(calculateFitZoom, SVG_RENDER_DELAY)
    return () => clearTimeout(timer)
  }, [code, viewMode, minZoom, maxZoom, onZoomChange])

  return { containerRef, previewWrapperRef }
}
