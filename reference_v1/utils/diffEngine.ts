/**
 * Diff engine utilities for comparing text content
 */

export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  lineNumber?: number;
}

/**
 * Creates a simple line-by-line diff between two text contents
 */
export function createSimpleDiff(original: string, suggested: string): DiffLine[] {
  const originalLines = original.split('\n');
  const suggestedLines = suggested.split('\n');
  const diff: DiffLine[] = [];

  const maxLines = Math.max(originalLines.length, suggestedLines.length);

  for (let i = 0; i < maxLines; i++) {
    const origLine = originalLines[i];
    const suggLine = suggestedLines[i];

    if (origLine === suggLine) {
      if (origLine !== undefined) {
        diff.push({ type: 'unchanged', content: origLine, lineNumber: i + 1 });
      }
    } else {
      if (origLine !== undefined && suggLine === undefined) {
        diff.push({ type: 'removed', content: origLine, lineNumber: i + 1 });
      } else if (origLine === undefined && suggLine !== undefined) {
        diff.push({ type: 'added', content: suggLine, lineNumber: i + 1 });
      } else if (origLine !== suggLine) {
        if (origLine) diff.push({ type: 'removed', content: origLine, lineNumber: i + 1 });
        if (suggLine) diff.push({ type: 'added', content: suggLine, lineNumber: i + 1 });
      }
    }
  }

  return diff;
}

/**
 * Creates a more advanced diff using Longest Common Subsequence (LCS) algorithm
 */
export function createLCSDiff(original: string, suggested: string): DiffLine[] {
  const originalLines = original.split('\n');
  const suggestedLines = suggested.split('\n');

  const lcs = computeLCS(originalLines, suggestedLines);
  return buildDiffFromLCS(originalLines, suggestedLines, lcs);
}

/**
 * Computes Longest Common Subsequence between two arrays of lines
 */
function computeLCS(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

/**
 * Builds diff from LCS matrix
 */
function buildDiffFromLCS(a: string[], b: string[], lcs: number[][]): DiffLine[] {
  const diff: DiffLine[] = [];
  let i = a.length;
  let j = b.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      diff.unshift({ type: 'unchanged', content: a[i - 1], lineNumber: i });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      diff.unshift({ type: 'added', content: b[j - 1], lineNumber: j });
      j--;
    } else if (i > 0 && (j === 0 || lcs[i][j - 1] < lcs[i - 1][j])) {
      diff.unshift({ type: 'removed', content: a[i - 1], lineNumber: i });
      i--;
    }
  }

  return diff;
}

/**
 * Applies diff changes to create the final content
 */
export function applyDiff(diff: DiffLine[]): string {
  return diff
    .filter(line => line.type !== 'removed')
    .map(line => line.content)
    .join('\n');
}

/**
 * Gets statistics about the diff
 */
export interface DiffStats {
  linesAdded: number;
  linesRemoved: number;
  linesChanged: number;
  totalLines: number;
}

export function getDiffStats(diff: DiffLine[]): DiffStats {
  const stats: DiffStats = {
    linesAdded: 0,
    linesRemoved: 0,
    linesChanged: 0,
    totalLines: diff.length
  };

  for (const line of diff) {
    switch (line.type) {
      case 'added':
        stats.linesAdded++;
        break;
      case 'removed':
        stats.linesRemoved++;
        break;
    }
  }

  stats.linesChanged = stats.linesAdded + stats.linesRemoved;
  return stats;
}