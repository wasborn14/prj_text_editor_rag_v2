/**
 * Mermaidコードをサニタイズして特殊文字によるパースエラーを防ぐ
 */
export function sanitizeMermaidCode(code: string): string {
  try {
    let sanitized = code

    sanitized = replaceBrTags(sanitized)
    sanitized = sanitizeNodeLabels(sanitized)
    sanitized = sanitizeEdgeLabels(sanitized)

    return sanitized
  } catch {
    // サニタイズ失敗時は元のコードを使用
    return code
  }
}

/**
 * <br/>タグを改行文字に置換
 */
function replaceBrTags(code: string): string {
  return code.replace(/<br\s*\/?>/gi, '\\n')
}

/**
 * ノードラベル内の特殊文字をクォートで囲む
 * フォーマット: nodeId[label] または nodeId[/path]
 */
function sanitizeNodeLabels(code: string): string {
  return code.replace(/(\w+)\[([^\]]+)\]/g, (match, nodeId, label) => {
    if (isQuoted(label)) {
      return match
    }

    if (hasSpecialChars(label)) {
      const escapedLabel = escapeQuotes(label)
      return `${nodeId}["${escapedLabel}"]`
    }

    return match
  })
}

/**
 * エッジラベルの特殊文字を処理
 * フォーマット: -->|label| または ---|label|
 */
function sanitizeEdgeLabels(code: string): string {
  return code.replace(/(-->|---)\|([^\|]+)\|/g, (match, arrow, label) => {
    if (isQuoted(label)) {
      return match
    }

    if (hasSpecialChars(label)) {
      const escapedLabel = escapeQuotes(label)
      return `${arrow}|"${escapedLabel}"|`
    }

    return match
  })
}

/**
 * ラベルがすでにクォートで囲まれているかチェック
 */
function isQuoted(label: string): boolean {
  return (
    (label.startsWith('"') && label.endsWith('"')) ||
    (label.startsWith("'") && label.endsWith("'"))
  )
}

/**
 * 特殊文字を含むかチェック
 */
function hasSpecialChars(label: string): boolean {
  return /[\/\{\}\[\]<>,"]/.test(label)
}

/**
 * ダブルクォートをエスケープ
 */
function escapeQuotes(label: string): string {
  return label.replace(/"/g, '#quot;')
}
