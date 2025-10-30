import { useEffect, useState, useCallback } from 'react'
import mermaid from 'mermaid'
import { getMermaidConfig } from '@/lib/editor/mermaid/mermaidConfig'
import { sanitizeMermaidCode } from '@/lib/editor/mermaid/mermaidSanitizer'
import { getMermaidErrorMessage } from '@/lib/editor/mermaid/mermaidErrorHandler'

interface UseMermaidRenderOptions {
  code: string
}

interface UseMermaidRenderResult {
  svg: string
  error: string
  isRendering: boolean
}

/**
 * Mermaidコードをレンダリングするカスタムフック
 */
export function useMermaidRender({ code }: UseMermaidRenderOptions): UseMermaidRenderResult {
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isRendering, setIsRendering] = useState(false)

  // Mermaid初期化
  useEffect(() => {
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark'
    mermaid.initialize(getMermaidConfig(isDarkMode))
  }, [])

  // レンダリング処理
  const renderDiagram = useCallback(async (diagramCode: string) => {
    if (!diagramCode.trim()) {
      setSvg('')
      setError('')
      return
    }

    setIsRendering(true)
    try {
      const sanitizedCode = sanitizeMermaidCode(diagramCode)
      const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`
      const { svg: renderedSvg } = await mermaid.render(id, sanitizedCode)
      setSvg(renderedSvg)
      setError('')
    } catch (err) {
      setError(getMermaidErrorMessage(err))
      setSvg('')
    } finally {
      setIsRendering(false)
    }
  }, [])

  // コード変更時にレンダリング
  useEffect(() => {
    renderDiagram(code)
  }, [code, renderDiagram])

  return { svg, error, isRendering }
}
