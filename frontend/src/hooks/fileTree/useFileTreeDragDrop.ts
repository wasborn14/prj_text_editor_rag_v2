import { useState, useCallback, useRef, useEffect } from 'react'
import { useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import type { DragStartEvent, DragOverEvent, DragEndEvent, DragMoveEvent } from '@dnd-kit/core'
import { useQueryClient } from '@tanstack/react-query'
import { FileTreeItem, Repository, GitHubClient } from '@/lib/github'
import {
  TreeNode,
  DragDropHandlers,
  AUTO_EXPAND_DELAY_MS,
  AUTO_SCROLL_THRESHOLD_PX,
  AUTO_SCROLL_SPEED_DIVISOR,
  SCROLL_INTERVAL_MS,
  moveItems,
  getParentDir,
  hasItemsInDirectory,
  hasDirectoriesInPath,
} from '@/lib/fileTree'

interface UseFileTreeDragDropProps {
  flatTree: TreeNode[]
  fileTree: FileTreeItem[]
  selectedPaths: Set<string>
  emptyDirectories: Set<string>
  localExpandedDirs: Set<string>
  repository: Repository | null
  githubToken: string | null
  setFileTree: (fileTree: FileTreeItem[]) => void
  setEmptyDirectories: (updater: (prev: Set<string>) => Set<string>) => void
  setLocalExpandedDirs: (updater: (prev: Set<string>) => Set<string>) => void
  setSelectedPaths: (updater: (prev: Set<string>) => Set<string>) => void
}

/**
 * ファイルツリーのドラッグ&ドロップ機能を管理するカスタムフック
 * - ドラッグ開始/終了/移動の処理
 * - 自動スクロール
 * - ディレクトリ自動展開
 */
export function useFileTreeDragDrop({
  flatTree,
  fileTree,
  selectedPaths,
  localExpandedDirs,
  repository,
  githubToken,
  setFileTree,
  setEmptyDirectories,
  setLocalExpandedDirs,
  setSelectedPaths,
}: UseFileTreeDragDropProps): DragDropHandlers {
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastHoveredDirRef = useRef<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // タイマーのクリーンアップ
  const clearAllTimers = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    lastHoveredDirRef.current = null
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
    }, SCROLL_INTERVAL_MS)
  }, [])

  const stopAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
  }, [])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const draggedPath = event.active.id as string
      setActiveId(draggedPath)

      // ドラッグされたアイテムが選択に含まれていない場合、そのアイテムだけを選択
      if (!selectedPaths.has(draggedPath)) {
        setSelectedPaths(() => new Set([draggedPath]))
      }
    },
    [selectedPaths, setSelectedPaths]
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const overId = event.over?.id as string | null
      setOverId(overId)

      // ホバー中のディレクトリ自動展開
      if (!overId || !activeId) {
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current)
          hoverTimerRef.current = null
        }
        lastHoveredDirRef.current = null
        return
      }

      const overNode = flatTree.find((n) => n.fullPath === overId)
      const isClosedDirectory = overNode?.type === 'dir' && !localExpandedDirs.has(overId)

      if (isClosedDirectory && lastHoveredDirRef.current !== overId) {
        // 既存のタイマーをクリア
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current)
        }

        lastHoveredDirRef.current = overId

        // 指定時間後に展開
        hoverTimerRef.current = setTimeout(() => {
          setLocalExpandedDirs((prev) => new Set(prev).add(overId))
          hoverTimerRef.current = null
        }, AUTO_EXPAND_DELAY_MS)
      } else if (!isClosedDirectory) {
        if (hoverTimerRef.current) {
          clearTimeout(hoverTimerRef.current)
          hoverTimerRef.current = null
        }
        lastHoveredDirRef.current = null
      }
    },
    [flatTree, localExpandedDirs, activeId, setLocalExpandedDirs]
  )

  // ドラッグ中の自動スクロール処理
  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const activatorEvent = event.activatorEvent as MouseEvent | TouchEvent

      // マウスまたはタッチイベントからY座標を取得
      const pointerY =
        'clientY' in activatorEvent
          ? activatorEvent.clientY
          : activatorEvent.touches?.[0]?.clientY

      if (!pointerY) return

      const topDistance = pointerY - rect.top
      const bottomDistance = rect.bottom - pointerY

      if (topDistance < AUTO_SCROLL_THRESHOLD_PX && topDistance > 0) {
        // 上スクロール（端に近いほど速く）
        const speed = -Math.max(
          1,
          (AUTO_SCROLL_THRESHOLD_PX - topDistance) / AUTO_SCROLL_SPEED_DIVISOR
        )
        startAutoScroll(speed)
      } else if (bottomDistance < AUTO_SCROLL_THRESHOLD_PX && bottomDistance > 0) {
        // 下スクロール（端に近いほど速く）
        const speed = Math.max(
          1,
          (AUTO_SCROLL_THRESHOLD_PX - bottomDistance) / AUTO_SCROLL_SPEED_DIVISOR
        )
        startAutoScroll(speed)
      } else {
        stopAutoScroll()
      }
    },
    [startAutoScroll, stopAutoScroll]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      setActiveId(null)
      setOverId(null)
      clearAllTimers()

      if (!over || active.id === over.id) return

      const overNode = flatTree.find((node) => node.fullPath === over.id)
      if (!overNode) return

      // 移動対象のアイテムを取得（選択されているアイテム全て）
      const itemsToMove = Array.from(selectedPaths)
        .map((path) => flatTree.find((node) => node.fullPath === path))
        .filter((node): node is TreeNode => node !== undefined)

      if (itemsToMove.length === 0) return

      // 移動先のディレクトリを決定
      const targetDir =
        overNode.type === 'dir' ? overNode.fullPath : getParentDir(overNode.fullPath)

      // 移動対象のアイテムのパスをセットに格納（高速検索用）
      const selectedPathsSet = new Set(itemsToMove.map(item => item.fullPath))

      // 自分自身または選択されたディレクトリへの移動を防ぐ
      for (const item of itemsToMove) {
        // 1. 自分自身への移動を防ぐ
        if (item.fullPath === targetDir) {
          return
        }

        // 2. 自分自身の子孫への移動を防ぐ
        if (item.type === 'dir' && targetDir?.startsWith(item.fullPath + '/')) {
          return
        }

        // 3. 選択されたディレクトリの中への移動を防ぐ
        if (targetDir && selectedPathsSet.has(targetDir)) {
          return
        }

        // 4. 選択されたディレクトリの子孫への移動を防ぐ
        for (const selectedPath of selectedPathsSet) {
          if (targetDir?.startsWith(selectedPath + '/')) {
            return
          }
        }
      }

      // 各アイテムを移動
      let updatedFileTree = fileTree
      const movedPaths = new Map<string, string>() // 元のパス -> 新しいパス

      // すべてのアイテムを移動
      itemsToMove.forEach((item) => {
        const newBasePath = targetDir ? `${targetDir}/${item.name}` : item.name
        movedPaths.set(item.fullPath, newBasePath)
        updatedFileTree = moveItems(updatedFileTree, item, newBasePath)
      })

      setFileTree(updatedFileTree)

      // 展開状態を更新（移動したディレクトリとその子孫）
      setLocalExpandedDirs((prev) => {
        const newExpanded = new Set(prev)

        itemsToMove.forEach((item) => {
          if (item.type === 'dir') {
            const newBasePath = movedPaths.get(item.fullPath)!

            // 元のパスが開いていた場合、新しいパスで開く
            if (newExpanded.has(item.fullPath)) {
              newExpanded.delete(item.fullPath)
              newExpanded.add(newBasePath)
            }

            // 子ディレクトリも更新
            Array.from(newExpanded).forEach((expandedPath) => {
              if (expandedPath.startsWith(item.fullPath + '/')) {
                newExpanded.delete(expandedPath)
                const relativePath = expandedPath.substring(item.fullPath.length)
                newExpanded.add(newBasePath + relativePath)
              }
            })
          }
        })

        return newExpanded
      })

      // 空のディレクトリ情報を更新
      setEmptyDirectories((prev) => {
        const newEmptyDirs = new Set(prev)

        itemsToMove.forEach((item) => {
          const newBasePath = movedPaths.get(item.fullPath)!
          const sourceDir = getParentDir(item.fullPath)

          // ディレクトリ移動の処理
          if (item.type === 'dir') {
            newEmptyDirs.delete(item.fullPath)

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
          if (targetDir) {
            newEmptyDirs.delete(targetDir)
          }
        })

        return newEmptyDirs
      })

      // 選択状態を新しいパスに更新
      setSelectedPaths((prev) => {
        const newSelected = new Set<string>()
        Array.from(prev).forEach((oldPath) => {
          const newPath = movedPaths.get(oldPath)
          if (newPath) {
            newSelected.add(newPath)
          }
        })
        return newSelected
      })

      // GitHub同期
      if (repository && githubToken && movedPaths.size > 0) {
        ;(async () => {
          try {
            const [owner, repoName] = repository.full_name.split('/')
            const client = new GitHubClient(githubToken)

            // 移動情報を配列に変換
            const moves = Array.from(movedPaths).map(([oldPath, newPath]) => ({
              oldPath,
              newPath,
            }))

            const movedItems = Array.from(movedPaths.keys()).join(', ')
            await client.moveFiles(owner, repoName, moves, fileTree, `Move: ${movedItems}`)
          } catch (error) {
            console.error('[GitHub Sync] Failed to sync file move:', error)
            // エラー時は最新のGitHub状態を取得
            await queryClient.invalidateQueries({
              queryKey: ['fileTree', repository.full_name],
              exact: true,
              refetchType: 'active',
            })
          }
        })()
      }
    },
    [
      flatTree,
      fileTree,
      selectedPaths,
      repository,
      githubToken,
      queryClient,
      clearAllTimers,
      setFileTree,
      setEmptyDirectories,
      setLocalExpandedDirs,
      setSelectedPaths,
    ]
  )

  // コンポーネントアンマウント時にすべてのタイマーをクリア
  useEffect(() => {
    return () => clearAllTimers()
  }, [clearAllTimers])

  return {
    activeId,
    overId,
    handleDragStart,
    handleDragOver,
    handleDragMove,
    handleDragEnd,
    clearAllTimers,
    sensors,
    containerRef,
  }
}
