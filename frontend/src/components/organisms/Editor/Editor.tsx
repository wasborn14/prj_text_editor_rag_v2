'use client'

import React from 'react'
import { EditorTabs } from './EditorTabs'
import { EditorContent } from './EditorContent'
interface EditorProps {
  className?: string
}

export const Editor = ({ className = '' }: EditorProps) => {

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      <EditorTabs />
      <div className="flex-1 overflow-hidden">
        <EditorContent />
      </div>
    </div>
  )
}