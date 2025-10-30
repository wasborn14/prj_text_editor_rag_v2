'use client'

import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { MermaidNodeView } from './MermaidNodeView'

/**
 * MermaidノードをDOMにマウントして管理する
 */
export function useMermaidNodes() {
  useEffect(() => {
    const mountMermaidNodes = () => {
      const nodes = document.querySelectorAll('.mermaid-node-wrapper:not(.mounted)')

      nodes.forEach((node) => {
        const element = node as HTMLElement
        const code = element.getAttribute('data-code') || ''

        // Find the TipTap editor instance from the DOM
        const getEditorView = () => {
          let parent = element.parentElement
          while (parent) {
            // @ts-expect-error - accessing ProseMirror view
            if (parent.pmViewDesc || parent.__vue__) {
              // @ts-expect-error - accessing ProseMirror view
              return parent.pmViewDesc?.editorView || null
            }
            parent = parent.parentElement
          }
          return null
        }

        // Mount React component
        const root = createRoot(element)
        root.render(
          <MermaidNodeView
            code={code}
            onUpdate={(newCode) => {
              element.setAttribute('data-code', newCode)

              // Try to update TipTap editor
              const editorView = getEditorView()
              if (editorView) {
                // Trigger a transaction to update the node
                const { state, dispatch } = editorView
                const pos = editorView.posAtDOM(element, 0)

                if (pos !== null && pos >= 0) {
                  const node = state.doc.nodeAt(pos)
                  if (node && node.type.name === 'mermaid') {
                    const tr = state.tr.setNodeMarkup(pos, null, { code: newCode })
                    dispatch(tr)
                  }
                }
              }
            }}
          />
        )

        element.classList.add('mounted')
      })
    }

    // Initial mount
    mountMermaidNodes()

    // Observe DOM changes
    const observer = new MutationObserver(() => {
      mountMermaidNodes()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [])
}
