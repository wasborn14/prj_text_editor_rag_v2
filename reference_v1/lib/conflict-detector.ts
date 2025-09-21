// 競合検出アルゴリズム

export interface ConflictDetection {
  local_sha: string;      // Supabase内のSHA
  remote_sha: string;     // GitHubの最新SHA
  base_sha?: string;      // 最後の同期時のSHA
}

export enum ConflictType {
  NO_CONFLICT = 'no_conflict',           // 競合なし（同一）
  FAST_FORWARD = 'fast_forward',         // 単純な更新（ローカル未変更）
  LOCAL_AHEAD = 'local_ahead',           // ローカルが先行
  CONFLICT = 'conflict'                  // 競合あり（両方変更）
}

export interface ConflictResult {
  type: ConflictType;
  requiresResolution: boolean;
  canAutoMerge: boolean;
  description: string;
}

/**
 * SHA比較による競合検出
 */
export function detectConflict(detection: ConflictDetection): ConflictResult {
  const { local_sha, remote_sha, base_sha } = detection;

  // SHA同一 = 競合なし
  if (local_sha === remote_sha) {
    return {
      type: ConflictType.NO_CONFLICT,
      requiresResolution: false,
      canAutoMerge: true,
      description: 'Files are identical',
    };
  }

  // ベースSHAがない場合（初回同期など）
  if (!base_sha) {
    return {
      type: ConflictType.CONFLICT,
      requiresResolution: true,
      canAutoMerge: false,
      description: 'No base SHA available, manual resolution required',
    };
  }

  // ローカル未変更、リモート変更 = Fast Forward
  if (local_sha === base_sha && remote_sha !== base_sha) {
    return {
      type: ConflictType.FAST_FORWARD,
      requiresResolution: false,
      canAutoMerge: true,
      description: 'Remote has new changes, can fast-forward',
    };
  }

  // ローカル変更、リモート未変更 = ローカル先行
  if (local_sha !== base_sha && remote_sha === base_sha) {
    return {
      type: ConflictType.LOCAL_AHEAD,
      requiresResolution: false,
      canAutoMerge: false,
      description: 'Local has uncommitted changes',
    };
  }

  // 両方変更 = 競合
  return {
    type: ConflictType.CONFLICT,
    requiresResolution: true,
    canAutoMerge: false,
    description: 'Both local and remote have changes, conflict detected',
  };
}

/**
 * ファイルリストの競合状態をチェック
 */
export function detectBulkConflicts(
  files: Array<{
    path: string;
    local_sha: string;
    remote_sha: string;
    base_sha?: string;
  }>
): Map<string, ConflictResult> {
  const results = new Map<string, ConflictResult>();

  for (const file of files) {
    const result = detectConflict({
      local_sha: file.local_sha,
      remote_sha: file.remote_sha,
      base_sha: file.base_sha,
    });

    results.set(file.path, result);
  }

  return results;
}

/**
 * 競合解決戦略
 */
export enum ResolutionStrategy {
  ACCEPT_LOCAL = 'accept_local',     // ローカルを採用
  ACCEPT_REMOTE = 'accept_remote',   // リモートを採用
  MANUAL_MERGE = 'manual_merge',     // 手動マージ
}

/**
 * 競合解決の適用
 */
export async function resolveConflict(
  filePath: string,
  strategy: ResolutionStrategy,
  localContent?: string,
  remoteContent?: string,
  manualContent?: string
): Promise<{
  resolved: boolean;
  content: string;
  sha?: string;
}> {
  switch (strategy) {
    case ResolutionStrategy.ACCEPT_LOCAL:
      if (!localContent) {
        throw new Error('Local content required for ACCEPT_LOCAL strategy');
      }
      return {
        resolved: true,
        content: localContent,
      };

    case ResolutionStrategy.ACCEPT_REMOTE:
      if (!remoteContent) {
        throw new Error('Remote content required for ACCEPT_REMOTE strategy');
      }
      return {
        resolved: true,
        content: remoteContent,
      };

    case ResolutionStrategy.MANUAL_MERGE:
      if (!manualContent) {
        throw new Error('Manual content required for MANUAL_MERGE strategy');
      }
      return {
        resolved: true,
        content: manualContent,
      };

    default:
      throw new Error(`Unknown resolution strategy: ${strategy}`);
  }
}

/**
 * 競合マーカーを生成（Git形式）
 */
export function generateConflictMarkers(
  localContent: string,
  remoteContent: string,
  filePath: string
): string {
  const lines = [];

  lines.push('<<<<<<< LOCAL');
  lines.push(localContent);
  lines.push('=======');
  lines.push(remoteContent);
  lines.push(`>>>>>>> REMOTE (${filePath})`);

  return lines.join('\n');
}

/**
 * 競合マーカーを解析
 */
export function parseConflictMarkers(content: string): {
  hasConflicts: boolean;
  conflicts: Array<{
    startLine: number;
    endLine: number;
    local: string;
    remote: string;
  }>;
} {
  const lines = content.split('\n');
  const conflicts = [];
  let inConflict = false;
  let currentConflict: any = null;
  let section: 'local' | 'remote' | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('<<<<<<< ')) {
      inConflict = true;
      section = 'local';
      currentConflict = {
        startLine: i,
        local: [],
        remote: [],
      };
    } else if (line === '=======') {
      section = 'remote';
    } else if (line.startsWith('>>>>>>> ')) {
      if (currentConflict) {
        currentConflict.endLine = i;
        currentConflict.local = currentConflict.local.join('\n');
        currentConflict.remote = currentConflict.remote.join('\n');
        conflicts.push(currentConflict);
      }
      inConflict = false;
      currentConflict = null;
      section = null;
    } else if (inConflict && currentConflict) {
      if (section === 'local') {
        currentConflict.local.push(line);
      } else if (section === 'remote') {
        currentConflict.remote.push(line);
      }
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
  };
}