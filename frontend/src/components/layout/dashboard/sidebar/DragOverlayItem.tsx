import { FolderOpen, File } from 'lucide-react'
import { TreeNode } from '@/lib/fileTree/types'

interface DragOverlayItemProps {
  node: TreeNode
}

export function DragOverlayItem({ node }: DragOverlayItemProps) {
  return (
    <div className="flex items-center gap-2 rounded bg-white px-2 py-1 shadow-lg dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
      {node.type === 'dir' ? (
        <FolderOpen className="h-4 w-4 text-blue-500" />
      ) : (
        <File className="h-4 w-4 text-gray-400" />
      )}
      <span className="text-sm text-gray-900 dark:text-gray-100">
        {node.name}
      </span>
    </div>
  )
}
