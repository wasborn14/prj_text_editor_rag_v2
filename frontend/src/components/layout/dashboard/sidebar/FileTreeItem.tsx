import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  FolderOpen,
  Folder,
  File,
  ChevronDown,
  ChevronRight,
  GripVertical,
} from 'lucide-react'
import { SortableItemProps } from '@/lib/fileTree/types'

/**
 * ファイルツリーの個別アイテムコンポーネント
 * ドラッグ&ドロップ可能なアイテム
 */
export function FileTreeItem({
  node,
  isExpanded,
  isSelected,
  onToggle,
  onItemClick,
  isDragOver,
  isInDragOverDirectory,
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: node.fullPath,
    })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isDir = node.type === 'dir'
  const isRootNode = node.level === -1

  const commonClasses = `group flex items-center gap-1.5 px-2 py-1.5 text-[15px] transition-colors ${
    isRootNode ? 'cursor-default' : 'cursor-pointer'
  } ${
    isSelected
      ? 'bg-blue-100 dark:bg-blue-900/50'
      : isDragOver && isDir
      ? 'bg-blue-500/20 dark:bg-blue-500/30 rounded'
      : isInDragOverDirectory
      ? 'bg-blue-500/10 dark:bg-blue-500/20'
      : isRootNode
      ? ''
      : 'hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
  }`

  const paddingStyle = { paddingLeft: isRootNode ? '8px' : `${node.level * 16 + 8}px` }

  const renderContent = () => (
    <>
      {isDir && !isRootNode ? (
        <button onClick={onToggle} className="flex-shrink-0" type="button">
          {isExpanded ? (
            <ChevronDown className="h-[18px] w-[18px] text-gray-500" />
          ) : (
            <ChevronRight className="h-[18px] w-[18px] text-gray-500" />
          )}
        </button>
      ) : !isDir ? (
        <span className="w-[18px]" />
      ) : null}

      {isDir ? (
        isExpanded ? (
          <FolderOpen className="h-[18px] w-[18px] text-blue-500" />
        ) : (
          <Folder className="h-[18px] w-[18px] text-blue-500" />
        )
      ) : (
        <File className="h-[18px] w-[18px] text-gray-400" />
      )}

      <span className="truncate text-gray-900 dark:text-gray-100">{node.name}</span>
    </>
  )

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={commonClasses}
        style={paddingStyle}
        onClick={isRootNode ? undefined : onItemClick}
      >
        {!isRootNode && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            type="button"
          >
            <GripVertical className="h-[18px] w-[18px] text-gray-400" />
          </button>
        )}
        {renderContent()}
      </div>
    </div>
  )
}
