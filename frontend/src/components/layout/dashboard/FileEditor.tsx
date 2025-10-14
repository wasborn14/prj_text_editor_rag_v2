'use client'

import React from 'react'
import { EditorRoot, EditorContent } from 'novel'
import StarterKit from '@tiptap/starter-kit'
import '@/styles/novel.css'

const DUMMY_CONTENT = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Welcome to File Editor' }]
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Select a file from the file tree to start editing.' }]
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Features' }]
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: 'Markdown editing with Novel editor' }]
          }]
        },
        {
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: 'Type "/" for slash commands' }]
          }]
        },
        {
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: 'Real-time GitHub sync' }]
          }]
        }
      ]
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Getting Started' }]
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Click on any ' },
        { type: 'text', text: '.md', marks: [{ type: 'code' }] },
        { type: 'text', text: ' file in the file tree to open it here.' }
      ]
    }
  ]
}

export function FileEditor() {
  return (
    <div className="flex-1 h-full overflow-auto bg-white dark:bg-gray-900">
      <EditorRoot>
        <EditorContent
          extensions={[StarterKit]}
          initialContent={DUMMY_CONTENT}
          className="min-h-full p-8 max-w-4xl mx-auto"
        />
      </EditorRoot>
    </div>
  )
}
