import { FileTreeItem } from '@/lib/github'

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * 新しいファイル/ディレクトリ名のバリデーション
 */
export function validateNewName(
  newName: string,
  oldPath: string,
  fileTree: FileTreeItem[]
): ValidationResult {
  // 空文字チェック
  if (!newName.trim()) {
    return { valid: false, error: '名前を入力してください' }
  }

  // スラッシュチェック
  if (newName.includes('/')) {
    return { valid: false, error: '名前に「/」を含めることはできません' }
  }

  // . または .. チェック
  if (newName === '.' || newName === '..') {
    return { valid: false, error: '「.」または「..」は使用できません' }
  }

  // 同名チェック
  const parentPath = oldPath.includes('/')
    ? oldPath.substring(0, oldPath.lastIndexOf('/'))
    : ''

  const newPath = parentPath ? `${parentPath}/${newName}` : newName

  // 元のパスと同じ場合はOK（変更なし）
  if (newPath === oldPath) {
    return { valid: true }
  }

  const exists = fileTree.some(item => item.path === newPath)

  if (exists) {
    return { valid: false, error: 'その名前は既に使用されています' }
  }

  return { valid: true }
}

/**
 * ディレクトリ名変更時に影響を受けるパスを取得
 */
export function getAffectedPaths(
  oldPath: string,
  newPath: string,
  fileTree: FileTreeItem[]
): Array<{ oldPath: string; newPath: string }> {
  return fileTree
    .filter(item => item.path === oldPath || item.path.startsWith(oldPath + '/'))
    .map(item => ({
      oldPath: item.path,
      newPath: item.path.replace(oldPath, newPath)
    }))
}

/**
 * パスから親ディレクトリを取得
 */
export function getParentPath(path: string): string {
  if (!path.includes('/')) return ''
  return path.substring(0, path.lastIndexOf('/'))
}

/**
 * パスからファイル名/ディレクトリ名を取得
 */
export function getFileName(path: string): string {
  if (!path.includes('/')) return path
  return path.substring(path.lastIndexOf('/') + 1)
}

/**
 * リネーム後のファイルツリーを生成
 */
export function updateFileTreeAfterRename(
  fileTree: FileTreeItem[],
  oldPath: string,
  newPath: string
): FileTreeItem[] {
  return fileTree.map((item) => {
    if (item.path === oldPath) {
      return { ...item, path: newPath }
    }
    if (item.path.startsWith(oldPath + '/')) {
      return {
        ...item,
        path: item.path.replace(oldPath, newPath),
      }
    }
    return item
  })
}

/**
 * リネーム後の展開ディレクトリセットを生成
 */
export function updateExpandedDirsAfterRename(
  expandedDirs: Set<string>,
  oldPath: string,
  newPath: string
): Set<string> {
  return new Set(
    Array.from(expandedDirs).map((dir) =>
      dir === oldPath || dir.startsWith(oldPath + '/')
        ? dir.replace(oldPath, newPath)
        : dir
    )
  )
}
