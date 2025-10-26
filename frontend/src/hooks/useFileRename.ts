import { useCallback } from 'react'
import { toast } from 'sonner'
import { GitHubClient, FileTreeItem } from '@/lib/github'
import {
  validateNewName,
  getParentPath,
  getFileName,
  updateFileTreeAfterRename,
  updateExpandedDirsAfterRename,
} from '@/lib/fileTree/validation'
import { TreeNode } from '@/lib/fileTree/types'

interface UseFileRenameParams {
  selectedRepo: { full_name: string } | null
  githubToken: string | null
  localFileTree: FileTreeItem[]
  flatTree: TreeNode[]
  expandedDirs: Set<string>
  setLocalFileTree: (tree: FileTreeItem[]) => void
  setExpandedDirs: (updater: (prev: Set<string>) => Set<string>) => void
  setIsRenameProcessing: (processing: boolean) => void
  setRenamingPath: (path: string | null) => void
}

interface UseFileRenameReturn {
  handleRenameConfirm: (oldPath: string, newName: string) => Promise<void>
}

/**
 * ファイル/ディレクトリのリネーム処理を管理するカスタムフック
 */
export function useFileRename({
  selectedRepo,
  githubToken,
  localFileTree,
  flatTree,
  expandedDirs,
  setLocalFileTree,
  setExpandedDirs,
  setIsRenameProcessing,
  setRenamingPath,
}: UseFileRenameParams): UseFileRenameReturn {
  const handleRenameConfirm = useCallback(
    async (oldPath: string, newName: string) => {
      if (!oldPath || !selectedRepo || !githubToken) {
        setRenamingPath(null)
        return
      }

      // バリデーション
      const validation = validateNewName(newName, oldPath, localFileTree)
      if (!validation.valid) {
        toast.error(validation.error)
        return
      }

      // 新しいパスを構築
      const parentPath = getParentPath(oldPath)
      const newPath = parentPath ? `${parentPath}/${newName}` : newName

      // 変更がない場合はキャンセル
      if (newPath === oldPath) {
        setRenamingPath(null)
        return
      }

      const node = flatTree.find((n) => n.fullPath === oldPath)
      if (!node) {
        setRenamingPath(null)
        return
      }

      setIsRenameProcessing(true)
      toast.loading('名前を変更しています...', { id: 'rename-toast' })

      try {
        const client = new GitHubClient(githubToken)
        const [owner, repo] = selectedRepo.full_name.split('/')

        await client.renameFileOrDirectory(
          owner,
          repo,
          oldPath,
          newPath,
          node.type === 'dir',
          localFileTree
        )

        // ローカル状態を更新
        const updatedTree = updateFileTreeAfterRename(localFileTree, oldPath, newPath)
        setLocalFileTree(updatedTree)

        // 展開ディレクトリも更新
        if (node.type === 'dir' && expandedDirs.has(oldPath)) {
          setExpandedDirs((prev) => updateExpandedDirsAfterRename(prev, oldPath, newPath))
        }

        toast.success(`"${getFileName(oldPath)}" を "${newName}" に変更しました`, {
          id: 'rename-toast',
        })
        setRenamingPath(null)
      } catch (error) {
        console.error('Rename failed:', error)
        toast.error(
          `名称変更に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
          { id: 'rename-toast' }
        )
      } finally {
        setIsRenameProcessing(false)
      }
    },
    [
      selectedRepo,
      githubToken,
      localFileTree,
      flatTree,
      expandedDirs,
      setLocalFileTree,
      setExpandedDirs,
      setIsRenameProcessing,
      setRenamingPath,
    ]
  )

  return { handleRenameConfirm }
}
