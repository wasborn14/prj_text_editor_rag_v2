import { useEffect, useState, useCallback } from 'react'
import mermaid from 'mermaid'
import { getMermaidConfig } from '@/lib/editor/mermaidConfig'

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

  // Mermaid初期化（テーマ変更を検知して再初期化）
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
      const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`
      const { svg: renderedSvg } = await mermaid.render(id, diagramCode)
      setSvg(renderedSvg)
      setError('')
    } catch (err) {
      console.error('Mermaid rendering error:', err)
      setError('ダイアグラムの描画に失敗しました')
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
