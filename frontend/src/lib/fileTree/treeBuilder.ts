import { FileTreeItem } from '@/lib/github'
import { TreeNode } from './types'

/**
 * ノードをソート（ディレクトリ優先、アルファベット順）
 */
export function sortNodes(nodes: TreeNode[]): TreeNode[] {
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

/**
 * TreeNodeを作成
 */
export function createTreeNode(
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

/**
 * ノードをツリーに追加
 */
export function addNodeToTree(
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

/**
 * ファイルツリーから階層構造を構築
 */
export function buildTreeStructure(
  fileTree: FileTreeItem[],
  emptyDirs: Set<string>
): TreeNode[] {
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

/**
 * 階層ツリーをフラット配列に変換（展開状態を考慮）
 */
export function flattenTree(
  nodes: TreeNode[],
  expanded: Set<string>
): TreeNode[] {
  const result: TreeNode[] = []

  function traverse(nodes: TreeNode[]) {
    nodes.forEach((node) => {
      result.push(node)
      if (
        node.type === 'dir' &&
        expanded.has(node.fullPath) &&
        node.children.length > 0
      ) {
        traverse(node.children)
      }
    })
  }

  traverse(nodes)
  return result
}
