'use client'

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import '@/styles/FileTreePanelNew.css'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverEvent,
  DragMoveEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  FolderOpen,
  Folder,
  File,
  ChevronDown,
  ChevronRight,
  Loader2,
  GripVertical,
} from 'lucide-react'
import { Repository, FileTreeItem } from '@/lib/github'

// ==================== Types ====================

interface FileTreePanelNewProps {
  selectedRepo: Repository | null
  fileTree: FileTreeItem[]
  treeLoading: boolean
  expandedDirs: Set<string>
  error: string | null
  onToggleDirectory: (path: string) => void
  useDummyData?: boolean
}

interface TreeNode {
  name: string
  fullPath: string
  type: 'file' | 'dir'
  level: number
  children: TreeNode[]
}

interface SortableItemProps {
  node: TreeNode
  isExpanded: boolean
  onToggle: () => void
  isDragOver?: boolean
  isInDragOverDirectory?: boolean
}

// ==================== Constants ====================

// スクロール用に大量のダミーデータを生成
const generateDummyFiles = (): FileTreeItem[] => {
  const files: FileTreeItem[] = []
  let shaCounter = 1

  // 10個のディレクトリを作成
  for (let i = 1; i <= 10; i++) {
    // 各ディレクトリに10個のファイルを追加
    for (let j = 1; j <= 10; j++) {
      files.push({
        path: `dir${i}/file${i}-${j}.txt`,
        type: 'file',
        sha: String(shaCounter++),
        url: '',
      })
    }
  }

  // ルートにもいくつかファイルを追加
  for (let i = 1; i <= 5; i++) {
    files.push({
      path: `root${i}.txt`,
      type: 'file',
      sha: String(shaCounter++),
      url: '',
    })
  }

  return files
}

const DUMMY_FILE_TREE: FileTreeItem[] = generateDummyFiles()

// ==================== Helper Functions ====================

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'dir' ? -1 : 1
      }
      return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
    })
    .map((node) => ({
      ...node,
      children: sortNodes(node.children),
    }))
}

function createTreeNode(
  parts: string[],
  index: number,
  isFile: boolean
): TreeNode {
  return {
    name: parts[index],
    fullPath: parts.slice(0, index + 1).join('/'),
    type: isFile ? 'file' : 'dir',
    level: index,
    children: [],
  }
}

function addNodeToTree(
  node: TreeNode,
  parts: string[],
  index: number,
  root: TreeNode[],
  map: Map<string, TreeNode>
) {
  if (index === 0) {
    root.push(node)
  } else {
    const parentPath = parts.slice(0, index).join('/')
    const parent = map.get(parentPath)
    if (parent) {
      parent.children.push(node)
    }
  }
}

function buildTreeStructure(fileTree: FileTreeItem[], emptyDirs: Set<string>): TreeNode[] {
  const root: TreeNode[] = []
  const map = new Map<string, TreeNode>()

  // ファイルからディレクトリ構造を構築
  fileTree.forEach((item) => {
    const parts = item.path.split('/')

    for (let i = 0; i < parts.length; i++) {
      const currentPath = parts.slice(0, i + 1).join('/')

      if (!map.has(currentPath)) {
        const isFile = i === parts.length - 1 && item.type === 'file'
        const node = createTreeNode(parts, i, isFile)

        map.set(currentPath, node)
        addNodeToTree(node, parts, i, root, map)
      }
    }
  })

  // 空のディレクトリを追加
  emptyDirs.forEach((dirPath) => {
    if (!map.has(dirPath)) {
      const parts = dirPath.split('/')
      const node = createTreeNode(parts, parts.length - 1, false)

      map.set(dirPath, node)
      addNodeToTree(node, parts, parts.length - 1, root, map)
    }
  })

  return sortNodes(root)
}

function flattenTree(nodes: TreeNode[], expanded: Set<string>): TreeNode[] {
  const result: TreeNode[] = []

  function traverse(nodes: TreeNode[]) {
    nodes.forEach((node) => {
      result.push(node)
      if (node.type === 'dir' && expanded.has(node.fullPath) && node.children.length > 0) {
        traverse(node.children)
      }
    })
  }

  traverse(nodes)
  return result
}

function moveItems(
  fileTree: FileTreeItem[],
  activeNode: TreeNode,
  newBasePath: string
): FileTreeItem[] {
  const newFileTree = [...fileTree]
  const itemsToUpdate = newFileTree.filter(
    (item) =>
      item.path === activeNode.fullPath || item.path.startsWith(activeNode.fullPath + '/')
  )

  itemsToUpdate.forEach((item) => {
    const relativePath = item.path.substring(activeNode.fullPath.length)
    item.path = newBasePath + relativePath
  })

  return newFileTree.sort((a, b) => a.path.localeCompare(b.path))
}

function getParentDir(path: string): string | null {
  return path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : null
}

function hasItemsInDirectory(fileTree: FileTreeItem[], dirPath: string): boolean {
  return fileTree.some((item) => item.path.startsWith(dirPath + '/'))
}

function hasDirectoriesInPath(emptyDirs: Set<string>, parentPath: string): boolean {
  return Array.from(emptyDirs).some((dir) => dir.startsWith(parentPath + '/'))
}

function updateEmptyDirectories(
  prev: Set<string>,
  activeNode: TreeNode,
  newBasePath: string,
  sourceDir: string | null,
  updatedFileTree: FileTreeItem[]
): Set<string> {
  const newEmptyDirs = new Set(prev)

  // ディレクトリ移動の処理
  if (activeNode.type === 'dir') {
    newEmptyDirs.delete(activeNode.fullPath)

    if (!hasItemsInDirectory(updatedFileTree, newBasePath)) {
      newEmptyDirs.add(newBasePath)
    }
  }

  // 元のディレクトリが空になったかチェック
  if (sourceDir) {
    const hasItems = hasItemsInDirectory(updatedFileTree, sourceDir)
    const hasDirs = hasDirectoriesInPath(newEmptyDirs, sourceDir)

    if (!hasItems && !hasDirs) {
      newEmptyDirs.add(sourceDir)
    }
  }

  // 移動先のディレクトリは空ではない
  const targetDir = getParentDir(newBasePath)
  if (targetDir) {
    newEmptyDirs.delete(targetDir)
  }

  return newEmptyDirs
}

// ==================== Components ====================

function SortableItem({
  node,
  isExpanded,
  onToggle,
  isDragOver,
  isInDragOverDirectory
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
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
        className={`group flex items-center gap-1 px-2 py-1 text-sm transition-colors ${
          isDragOver && isDir
            ? 'bg-blue-500/20 dark:bg-blue-500/30 rounded'
            : isInDragOverDirectory
            ? 'bg-blue-500/10 dark:bg-blue-500/20'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
        }`}
        style={{ paddingLeft: `${node.level * 16 + 8}px` }}
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

// ==================== Main Component ====================

export function FileTreePanelNew({
  selectedRepo,
  fileTree: propFileTree,
  treeLoading,
  error,
  useDummyData = true,
}: FileTreePanelNewProps) {
  const [fileTree, setFileTree] = useState<FileTreeItem[]>(
    useDummyData ? DUMMY_FILE_TREE : propFileTree
  )
  const [emptyDirectories, setEmptyDirectories] = useState<Set<string>>(
    new Set(['dir1', 'dir2', 'dir3', 'dir4', 'dir5', 'dir6', 'dir7', 'dir8', 'dir9', 'dir10'])
  )
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [localExpandedDirs, setLocalExpandedDirs] = useState<Set<string>>(
    new Set(['dir1', 'dir2', 'dir3', 'dir4', 'dir5', 'dir6', 'dir7', 'dir8', 'dir9', 'dir10'])
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const tree = useMemo(
    () => buildTreeStructure(fileTree, emptyDirectories),
    [fileTree, emptyDirectories]
  )
  const flatTree = useMemo(() => flattenTree(tree, localExpandedDirs), [tree, localExpandedDirs])

  const handleToggle = useCallback((path: string) => {
    setLocalExpandedDirs((prev) => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(path)) {
        newExpanded.delete(path)
      } else {
        newExpanded.add(path)
      }
      return newExpanded
    })
  }, [])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over?.id as string | null)
  }, [])

  // 自動スクロール用のヘルパー関数
  const startAutoScroll = useCallback((speed: number) => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
    }
    scrollIntervalRef.current = setInterval(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop += speed
      }
    }, 16) // 60fps
  }, [])

  const stopAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
  }, [])

  // ドラッグ中の自動スクロール処理
  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const activatorEvent = event.activatorEvent as MouseEvent | TouchEvent

      // マウスまたはタッチイベントからY座標を取得
      const pointerY = 'clientY' in activatorEvent
        ? activatorEvent.clientY
        : activatorEvent.touches?.[0]?.clientY

      if (!pointerY) return

      const threshold = 50
      const topDistance = pointerY - rect.top
      const bottomDistance = rect.bottom - pointerY

      if (topDistance < threshold && topDistance > 0) {
        // 上スクロール（端に近いほど速く）
        const speed = -Math.max(1, (threshold - topDistance) / 5)
        startAutoScroll(speed)
      } else if (bottomDistance < threshold && bottomDistance > 0) {
        // 下スクロール（端に近いほど速く）
        const speed = Math.max(1, (threshold - bottomDistance) / 5)
        startAutoScroll(speed)
      } else {
        stopAutoScroll()
      }
    },
    [startAutoScroll, stopAutoScroll]
  )

  // コンポーネントアンマウント時にスクロールを停止
  useEffect(() => {
    return () => stopAutoScroll()
  }, [stopAutoScroll])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      setActiveId(null)
      setOverId(null)
      stopAutoScroll() // ドラッグ終了時にスクロールを停止

      if (!over || active.id === over.id) return

      const activeNode = flatTree.find((node) => node.fullPath === active.id)
      const overNode = flatTree.find((node) => node.fullPath === over.id)

      if (!activeNode || !overNode) return

      // 自分自身の子孫への移動を防ぐ
      if (activeNode.type === 'dir' && overNode.fullPath.startsWith(activeNode.fullPath + '/')) {
        return
      }

      // 移動先のパスを計算
      const activeName = activeNode.name
      const newBasePath = overNode.type === 'dir'
        ? `${overNode.fullPath}/${activeName}`
        : (() => {
            const overDir = getParentDir(overNode.fullPath)
            return overDir ? `${overDir}/${activeName}` : activeName
          })()

      const sourceDir = getParentDir(activeNode.fullPath)

      // ディレクトリが開いていた場合、移動後も開いた状態を維持
      if (activeNode.type === 'dir') {
        setLocalExpandedDirs((prev) => {
          const newExpanded = new Set(prev)

          // 元のパスが開いていた場合、新しいパスで開く
          if (newExpanded.has(activeNode.fullPath)) {
            newExpanded.delete(activeNode.fullPath)
            newExpanded.add(newBasePath)
          }

          // 子ディレクトリも更新
          Array.from(newExpanded).forEach((expandedPath) => {
            if (expandedPath.startsWith(activeNode.fullPath + '/')) {
              newExpanded.delete(expandedPath)
              const relativePath = expandedPath.substring(activeNode.fullPath.length)
              newExpanded.add(newBasePath + relativePath)
            }
          })

          return newExpanded
        })
      }

      // ファイルツリーを更新
      const updatedFileTree = moveItems(fileTree, activeNode, newBasePath)
      setFileTree(updatedFileTree)

      // 空のディレクトリ情報を更新
      setEmptyDirectories((prev) =>
        updateEmptyDirectories(prev, activeNode, newBasePath, sourceDir, updatedFileTree)
      )
    },
    [flatTree, fileTree, stopAutoScroll]
  )

  const activeNode = useMemo(
    () => flatTree.find((node) => node.fullPath === activeId),
    [flatTree, activeId]
  )

  const overNode = useMemo(
    () => flatTree.find((n) => n.fullPath === overId),
    [flatTree, overId]
  )

  return (
    <div
      ref={containerRef}
      className="file-tree-container w-80 flex-shrink-0 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">ファイル一覧</h2>
        {useDummyData && (
          <span className="text-xs text-orange-500 font-medium">ダミーデータ</span>
        )}
      </div>

      {!selectedRepo && !useDummyData && (
        <p className="text-sm text-gray-500 dark:text-gray-400">リポジトリを選択してください</p>
      )}

      {selectedRepo && treeLoading && !useDummyData && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          読み込み中...
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={flatTree.map((node) => node.fullPath)}
          strategy={verticalListSortingStrategy}
        >
          {(useDummyData || (selectedRepo && !treeLoading && fileTree.length > 0)) && (
            <div className="space-y-0.5">
              {flatTree.map((node) => {
                const isInDragOverDir =
                  overNode?.type === 'dir' &&
                  overId !== null &&
                  (node.fullPath === overId || node.fullPath.startsWith(overId + '/'))

                return (
                  <SortableItem
                    key={node.fullPath}
                    node={node}
                    isExpanded={localExpandedDirs.has(node.fullPath)}
                    onToggle={() => handleToggle(node.fullPath)}
                    isDragOver={overId === node.fullPath}
                    isInDragOverDirectory={isInDragOverDir}
                  />
                )
              })}
            </div>
          )}
        </SortableContext>

        <DragOverlay>
          {activeNode && (
            <div className="flex items-center gap-2 rounded bg-white px-2 py-1 shadow-lg dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
              {activeNode.type === 'dir' ? (
                <FolderOpen className="h-4 w-4 text-blue-500" />
              ) : (
                <File className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {activeNode.name}
              </span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {!useDummyData &&
        selectedRepo &&
        !treeLoading &&
        fileTree.length === 0 &&
        !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ファイルが見つかりませんでした
          </p>
        )}
    </div>
  )
}
