import { FileTreeItem } from '@/lib/github'

/**
 * スクロール用に大量のダミーデータを生成
 */
export const generateDummyFiles = (): FileTreeItem[] => {
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

/** ダミーファイルツリー */
export const DUMMY_FILE_TREE: FileTreeItem[] = generateDummyFiles()

/** ダミー空ディレクトリ */
export const DUMMY_EMPTY_DIRS = new Set([
  'dir1',
  'dir2',
  'dir3',
  'dir4',
  'dir5',
  'dir6',
  'dir7',
  'dir8',
  'dir9',
  'dir10',
])
