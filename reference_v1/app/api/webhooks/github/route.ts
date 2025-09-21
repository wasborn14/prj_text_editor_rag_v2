import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Octokit } from 'octokit';

// Webhook署名を検証
function verifyGitHubSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  // タイミング攻撃を防ぐため、crypto.timingSafeEqualを使用
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  } catch {
    return false;
  }
}

// Supabase管理クライアントを作成
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// リポジトリ情報を取得
async function getRepository(githubRepoId: number) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('repositories')
    .select('*')
    .eq('github_repo_id', githubRepoId)
    .single();

  if (error || !data) {
    throw new Error(`Repository not found: ${githubRepoId}`);
  }

  return data;
}

// 変更されたファイルを同期
async function syncChangedFiles(
  repository: any,
  changedFiles: string[],
  owner: string,
  repo: string
) {
  const supabase = createAdminClient();

  // GitHubアクセストークンを取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('github_access_token')
    .eq('id', repository.user_id)
    .single();

  if (!profile?.github_access_token) {
    throw new Error('GitHub access token not found');
  }

  const octokit = new Octokit({
    auth: profile.github_access_token,
  });

  // バッチ処理で効率化
  const batchSize = 10;
  const results = [];

  for (let i = 0; i < changedFiles.length; i += batchSize) {
    const batch = changedFiles.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (filePath) => {
        try {
          // GitHubからファイル内容を取得
          const { data: fileData } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: filePath,
            ref: repository.default_branch || 'main',
          });

          if ('content' in fileData && fileData.type === 'file') {
            // Base64デコード
            const content = Buffer.from(fileData.content, 'base64').toString('utf-8');

            // Supabaseのファイルを更新
            const { error } = await supabase
              .from('files')
              .upsert({
                repository_id: repository.id,
                path: filePath,
                name: fileData.name,
                type: 'file',
                content: content,
                github_sha: fileData.sha,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'repository_id,path',
              });

            if (error) {
              console.error(`Failed to sync file ${filePath}:`, error);
              return { path: filePath, status: 'error', error };
            }

            return { path: filePath, status: 'synced' };
          }

          return { path: filePath, status: 'skipped', reason: 'Not a file' };
        } catch (error) {
          console.error(`Error syncing file ${filePath}:`, error);
          return { path: filePath, status: 'error', error };
        }
      })
    );

    results.push(...batchResults);
  }

  return results;
}

// Webhookエンドポイント
export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.text();
    const payload = JSON.parse(body);

    // 署名検証
    const signature = request.headers.get('x-hub-signature-256');
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('GITHUB_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // 署名を検証
    if (!verifyGitHubSignature(body, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // イベントタイプを確認
    const event = request.headers.get('x-github-event');

    // pushイベントのみ処理
    if (event !== 'push') {
      return NextResponse.json({
        message: `Ignoring event: ${event}`,
      });
    }

    // リポジトリ情報を取得
    const repository = await getRepository(payload.repository.id);
    const defaultBranch = repository.default_branch || 'main';

    // デフォルトブランチへのpushのみ処理
    if (payload.ref !== `refs/heads/${defaultBranch}`) {
      return NextResponse.json({
        message: `Ignoring push to non-default branch: ${payload.ref}`,
      });
    }

    console.log(`Processing push to ${defaultBranch} branch of ${payload.repository.full_name}`);

    // 変更されたファイルを収集
    const changedFiles = new Set<string>();

    for (const commit of payload.commits) {
      // 追加されたファイル
      for (const file of commit.added || []) {
        changedFiles.add(file);
      }
      // 修正されたファイル
      for (const file of commit.modified || []) {
        changedFiles.add(file);
      }
      // 削除されたファイル（後で処理）
      for (const file of commit.removed || []) {
        // TODO: ファイル削除処理を実装
        console.log(`File removed: ${file}`);
      }
    }

    // ファイルを同期
    const syncResults = await syncChangedFiles(
      repository,
      Array.from(changedFiles),
      payload.repository.owner.login,
      payload.repository.name
    );

    // 同期結果を集計
    const syncedCount = syncResults.filter(r => r.status === 'synced').length;
    const errorCount = syncResults.filter(r => r.status === 'error').length;

    console.log(`Sync completed: ${syncedCount} synced, ${errorCount} errors`);

    // リアルタイム通知（将来実装）
    // TODO: Supabase Realtimeでクライアントに通知

    return NextResponse.json({
      message: 'Webhook processed successfully',
      event,
      repository: payload.repository.full_name,
      branch: defaultBranch,
      commits: payload.commits.length,
      syncResults: {
        total: syncResults.length,
        synced: syncedCount,
        errors: errorCount,
      },
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// WebhookのGETリクエスト（ヘルスチェック用）
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'GitHub webhook endpoint is ready',
    timestamp: new Date().toISOString(),
  });
}