import { FileTreeItem } from '@/lib/github'
import { TreeNode } from './types'

/**
 * アイテムを新しいパスに移動
 */
export function moveItems(
  fileTree: FileTreeItem[],
  activeNode: TreeNode,
  newBasePath: string
): FileTreeItem[] {
  const newFileTree = [...fileTree]
  const itemsToUpdate = newFileTree.filter(
    (item) =>
      item.path === activeNode.fullPath ||
      item.path.startsWith(activeNode.fullPath + '/')
  )

  itemsToUpdate.forEach((item) => {
    const relativePath = item.path.substring(activeNode.fullPath.length)
    item.path = newBasePath + relativePath
  })

  return newFileTree.sort((a, b) => a.path.localeCompare(b.path))
}

/**
 * パスから親ディレクトリを取得
 * @returns 親ディレクトリのパス。ルートの場合は空文字列、パスが空の場合はnull
 */
export function getParentDir(path: string): string | null {
  if (!path) return null
  return path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : ''
}

/**
 * 指定ディレクトリ内にアイテムが存在するかチェック
 */
export function hasItemsInDirectory(
  fileTree: FileTreeItem[],
  dirPath: string
): boolean {
  return fileTree.some((item) => item.path.startsWith(dirPath + '/'))
}

/**
 * 指定パス配下にディレクトリが存在するかチェック
 */
export function hasDirectoriesInPath(
  emptyDirs: Set<string>,
  parentPath: string
): boolean {
  return Array.from(emptyDirs).some((dir) => dir.startsWith(parentPath + '/'))
}

// ==================== 将来の拡張用（GitHub API連携） ====================

/**
 * TODO: GitHub上でファイルを作成
 */
export async function createFile(
  token: string,
  repo: string,
  path: string,
  content: string
): Promise<void> {
  // 実装予定
  throw new Error('Not implemented yet')
}

/**
 * TODO: GitHub上でディレクトリを作成（.gitkeepを追加）
 */
export async function createDirectory(
  token: string,
  repo: string,
  path: string
): Promise<void> {
  // 実装予定
  throw new Error('Not implemented yet')
}

/**
 * TODO: GitHub上でアイテムを削除
 */
export async function deleteItems(
  token: string,
  repo: string,
  paths: string[]
): Promise<void> {
  // 実装予定
  throw new Error('Not implemented yet')
}

/**
 * TODO: GitHub上でアイテムをリネーム
 */
export async function renameItem(
  token: string,
  repo: string,
  oldPath: string,
  newPath: string
): Promise<void> {
  // 実装予定
  throw new Error('Not implemented yet')
}

/**
 * TODO: GitHub上でファイル内容を更新
 */
export async function updateFileContent(
  token: string,
  repo: string,
  path: string,
  content: string
): Promise<void> {
  // 実装予定
  throw new Error('Not implemented yet')
}
