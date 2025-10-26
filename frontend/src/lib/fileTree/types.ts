import { Repository } from '@/lib/github'
import type { DragStartEvent, DragOverEvent, DragMoveEvent, DragEndEvent, SensorDescriptor, SensorOptions } from '@dnd-kit/core'

/**
 * ツリー構造のノード
 */
export interface TreeNode {
  name: string
  fullPath: string
  type: 'file' | 'dir'
  level: number
  children: TreeNode[]
}

/**
 * FileTreePanelのプロパティ
 */
export interface FileTreePanelProps {
  selectedRepo: Repository | null
  treeLoading: boolean
  error: string | null
}

/**
 * SortableItemのプロパティ
 */
export interface SortableItemProps {
  node: TreeNode
  isExpanded: boolean
  isSelected: boolean
  onToggle: () => void
  onItemClick: (event: React.MouseEvent) => void
  isDragOver?: boolean
  isInDragOverDirectory?: boolean
  isRenaming?: boolean
  isRenameProcessing?: boolean
  onContextMenu?: (event: React.MouseEvent) => void
  onRenameConfirm?: (newName: string) => void
  onRenameCancel?: () => void
}

/**
 * ドラッグ&ドロップハンドラの戻り値
 */
export interface DragDropHandlers {
  activeId: string | null
  overId: string | null
  handleDragStart: (event: DragStartEvent) => void
  handleDragOver: (event: DragOverEvent) => void
  handleDragMove: (event: DragMoveEvent) => void
  handleDragEnd: (event: DragEndEvent) => void
  clearAllTimers: () => void
  sensors: SensorDescriptor<SensorOptions>[]
  containerRef: React.RefObject<HTMLDivElement | null>
}

/**
 * 選択機能ハンドラの戻り値
 */
export interface SelectionHandlers {
  selectedPaths: Set<string>
  lastSelectedPath: string | null
  handleItemClick: (path: string, event: React.MouseEvent) => void
  clearSelection: () => void
  setSelectedPaths: (updater: (prev: Set<string>) => Set<string>) => void
}
