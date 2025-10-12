'use client'

import React from 'react'
import { EditorTab } from './EditorTab'
import { useEditorStore } from '@/stores/editorStore'

interface EditorTabsProps {
  className?: string
}

export const EditorTabs = ({ className = '' }: EditorTabsProps) => {
  const {
    openTabs,
    activeTabId,
    setActiveTab,
    closeTab
  } = useEditorStore()

  return (
    <div className={`flex bg-gray-100 border-b-2 border-gray-300 overflow-x-auto min-h-[40px] ${className}`}>
      {openTabs.map((tab) => (
        <EditorTab
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          onSelect={() => setActiveTab(tab.id)}
          onClose={() => closeTab(tab.id)}
        />
      ))}

      {/* Empty space to fill the rest of the tab bar */}
      <div className="flex-1 bg-gray-100" />
    </div>
  )
}