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
  Loader2,
} from 'lucide-react'
import { SortableItemProps } from '@/lib/fileTree/types'
import { RenameInput } from '@/components/layout/dashboard/common/RenameInput'
import { useLongPress } from '@/hooks/useLongPress'

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
  isRenaming = false,
  isRenameProcessing = false,
  onContextMenu,
  onRenameConfirm,
  onRenameCancel,
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: node.fullPath,
    })

  const isDir = node.type === 'dir'
  const isRootNode = node.level === -1

  // 長押し処理（ルートノード以外のみ）
  const longPress = useLongPress({
    onLongPress: (e) => {
      if (!isRootNode && onContextMenu) {
        onContextMenu(e)
      }
    },
    delay: 500,
    threshold: 10,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isRootNode && onContextMenu) {
      onContextMenu(e)
    }
  }

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

  const renderContent = () => {
    return (
    <>
      {isDir && !isRootNode ? (
        <button onClick={onToggle} className="flex-shrink-0" type="button">
          {isExpanded ? (
            <ChevronDown className="h-[18px] w-[18px] text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronRight className="h-[18px] w-[18px] text-gray-500 dark:text-gray-400" />
          )}
        </button>
      ) : !isDir ? (
        <span className="w-[18px]" />
      ) : null}

      <span className="flex-shrink-0">
        {isDir ? (
          isExpanded ? (
            <FolderOpen className="h-[18px] w-[18px] text-blue-500 dark:text-gray-400" />
          ) : (
            <Folder className="h-[18px] w-[18px] text-blue-500 dark:text-gray-400" />
          )
        ) : (
          <File className="h-[18px] w-[18px] text-gray-400 dark:text-gray-500" />
        )}
      </span>

      {isRenaming && onRenameConfirm && onRenameCancel ? (
        isRenameProcessing ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500 dark:text-blue-400 flex-shrink-0" />
            <span className="text-sm text-gray-500 dark:text-gray-400 truncate">変更中...</span>
          </div>
        ) : (
          <RenameInput
            initialValue={node.name}
            onConfirm={onRenameConfirm}
            onCancel={onRenameCancel}
            isMobile={typeof window !== 'undefined' && window.innerWidth < 768}
          />
        )
      ) : (
        <span className="truncate text-gray-900 dark:text-gray-100">{node.name}</span>
      )}
    </>
    )
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={commonClasses}
        style={paddingStyle}
        onClick={isRootNode ? undefined : onItemClick}
        onContextMenu={handleContextMenu}
        {...(isRootNode ? {} : longPress.handlers)}
      >
        {!isRootNode && (
          isRenaming ? (
            <span className="w-[18px] flex-shrink-0" />
          ) : (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
              type="button"
            >
              <GripVertical className="h-[18px] w-[18px] text-gray-400" />
            </button>
          )
        )}
        {renderContent()}
      </div>
    </div>
  )
}
