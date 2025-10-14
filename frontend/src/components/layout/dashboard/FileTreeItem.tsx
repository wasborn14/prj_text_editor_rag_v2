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

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`group flex items-center gap-1 px-2 py-1 text-sm transition-colors cursor-pointer ${
          isSelected
            ? 'bg-blue-100 dark:bg-blue-900/50'
            : isDragOver && isDir
            ? 'bg-blue-500/20 dark:bg-blue-500/30 rounded'
            : isInDragOverDirectory
            ? 'bg-blue-500/10 dark:bg-blue-500/20'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
        }`}
        style={{ paddingLeft: `${node.level * 16 + 8}px` }}
        onClick={onItemClick}
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          type="button"
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </button>

        {isDir ? (
          <button onClick={onToggle} className="flex-shrink-0" type="button">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {isDir ? (
          isExpanded ? (
            <FolderOpen className="h-4 w-4 text-blue-500" />
          ) : (
            <Folder className="h-4 w-4 text-blue-500" />
          )
        ) : (
          <File className="h-4 w-4 text-gray-400" />
        )}

        <span className="truncate text-gray-900 dark:text-gray-100">{node.name}</span>
      </div>
    </div>
  )
}
