/**
 * Mermaidレンダリングエラーをユーザーフレンドリーなメッセージに変換
 */
export function getMermaidErrorMessage(err: unknown): string {
  const errorMessage = err instanceof Error ? err.message : String(err)

  if (errorMessage.includes('Parse error')) {
    return getParseErrorMessage(errorMessage)
  }

  if (errorMessage.includes('Syntax error')) {
    return '構文エラー: ダイアグラムの記述を確認してください'
  }

  if (errorMessage.includes('Lexical error')) {
    return getLexicalErrorMessage(errorMessage)
  }

  return 'ダイアグラムの描画に失敗しました'
}

/**
 * Parse errorメッセージを抽出
 */
function getParseErrorMessage(errorMessage: string): string {
  const lineNumber = extractLineNumber(errorMessage)
  return `構文エラー（${lineNumber}行目付近）: Mermaidの構文を確認してください`
}

/**
 * Lexical errorメッセージを抽出
 */
function getLexicalErrorMessage(errorMessage: string): string {
  const lineNumber = extractLineNumber(errorMessage)
  return `字句エラー（${lineNumber}行目付近）: 特殊文字の記述を確認してください`
}

/**
 * エラーメッセージから行番号を抽出
 */
function extractLineNumber(errorMessage: string): string {
  const match = errorMessage.match(/line (\d+)/)
  return match ? match[1] : '不明'
}
