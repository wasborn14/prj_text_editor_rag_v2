import { FileTreeItem } from '@/lib/github'
import { TreeNode } from './types'

/**
 * 自然順ソート用の比較関数
 * 数値部分を数値として比較し、それ以外は文字列として比較
 * 例: 1.md < 2.md < 9.md < 10.md < 11.md
 */
function naturalCompare(a: string, b: string): number {
  const regex = /(\d+)|(\D+)/g
  const aParts = a.match(regex) || []
  const bParts = b.match(regex) || []

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || ''
    const bPart = bParts[i] || ''

    // 両方が数値の場合は数値として比較
    const aNum = parseInt(aPart, 10)
    const bNum = parseInt(bPart, 10)

    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) {
        return aNum - bNum
      }
    } else {
      // 文字列として比較
      const comparison = aPart.localeCompare(bPart, 'en', { sensitivity: 'base' })
      if (comparison !== 0) {
        return comparison
      }
    }
  }

  return 0
}

/**
 * ノードをソート（ディレクトリ優先、自然順ソート）
 */
export function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'dir' ? -1 : 1
      }
      return naturalCompare(a.name, b.name)
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
 * @param fileTree ファイルツリー
 * @param emptyDirs 空のディレクトリ
 * @param rootNodeName ルートノードの表示名（省略時はルートノードを作成しない）
 */
export function buildTreeStructure(
  fileTree: FileTreeItem[],
  emptyDirs: Set<string>,
  rootNodeName?: string
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

  const sortedRoot = sortNodes(root)

  // ルートノード名が指定されている場合、仮想ルートノードでラップ
  if (rootNodeName) {
    const virtualRoot: TreeNode = {
      name: rootNodeName,
      fullPath: '',
      type: 'dir',
      level: -1,
      children: sortedRoot,
    }
    return [virtualRoot]
  }

  return sortedRoot
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
