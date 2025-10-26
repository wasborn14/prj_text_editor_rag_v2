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
  selectedFilePath: string | null
  setLocalFileTree: (tree: FileTreeItem[]) => void
  setExpandedDirs: (updater: (prev: Set<string>) => Set<string>) => void
  setIsRenameProcessing: (processing: boolean) => void
  setRenamingPath: (path: string | null) => void
  setSelectedFile: (path: string | null) => void
  saveExpandedFolders: (folders: string[]) => void
  saveLastOpenedFile: (filePath: string | null) => Promise<void>
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
  selectedFilePath,
  setLocalFileTree,
  setExpandedDirs,
  setIsRenameProcessing,
  setRenamingPath,
  setSelectedFile,
  saveExpandedFolders,
  saveLastOpenedFile,
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

        // 展開ディレクトリを更新（ディレクトリリネーム時）
        let updatedExpandedDirs = expandedDirs
        if (node.type === 'dir' && expandedDirs.has(oldPath)) {
          const newExpandedDirsSet = updateExpandedDirsAfterRename(expandedDirs, oldPath, newPath)
          setExpandedDirs(() => newExpandedDirsSet)
          updatedExpandedDirs = newExpandedDirsSet

          // Supabaseに保存
          saveExpandedFolders(Array.from(newExpandedDirsSet))
        }

        // 現在開いているファイルパスを更新（リネームしたファイル/ディレクトリ配下の場合）
        if (selectedFilePath) {
          let newSelectedPath: string | null = null

          if (selectedFilePath === oldPath) {
            // リネームしたファイル自体が開かれている場合
            newSelectedPath = newPath
          } else if (selectedFilePath.startsWith(oldPath + '/')) {
            // リネームしたディレクトリ配下のファイルが開かれている場合
            newSelectedPath = selectedFilePath.replace(oldPath, newPath)
          }

          if (newSelectedPath) {
            setSelectedFile(newSelectedPath)
            await saveLastOpenedFile(newSelectedPath)
          }
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
      selectedFilePath,
      setLocalFileTree,
      setExpandedDirs,
      setIsRenameProcessing,
      setRenamingPath,
      setSelectedFile,
      saveExpandedFolders,
      saveLastOpenedFile,
    ]
  )

  return { handleRenameConfirm }
}
