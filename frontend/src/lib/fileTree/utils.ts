import { TreeNode } from './types'

/**
 * ドラッグオーバーディレクトリかどうかを判定
 */
export function isNodeInDragOverDirectory(
  node: TreeNode,
  overId: string | null,
  overNode: TreeNode | undefined
): boolean {
  if (!overId || overNode?.type !== 'dir') return false
  return node.fullPath === overId || node.fullPath.startsWith(overId + '/')
}
