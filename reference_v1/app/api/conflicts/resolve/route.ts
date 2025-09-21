import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { resolveConflict, ResolutionStrategy } from '@/lib/conflict-detector';
import { Octokit } from '@octokit/rest';

export async function POST(request: NextRequest) {
  try {
    const {
      fileId,
      repositoryId,
      strategy,
      resolvedContent,
      commitMessage
    } = await request.json();

    if (!fileId || !repositoryId || !strategy || !resolvedContent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Supabaseからファイルとリポジトリ情報を取得
    const supabase = createClient();

    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const { data: repository, error: repoError } = await supabase
      .from('repositories')
      .select('*')
      .eq('id', repositoryId)
      .single();

    if (repoError || !repository) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      );
    }

    // GitHubに解決済みコンテンツをコミット
    const octokit = new Octokit({
      auth: repository.access_token,
    });

    let newSha: string;

    try {
      // ファイルをGitHubに保存
      const { data: commitData } = await octokit.repos.createOrUpdateFileContents({
        owner: repository.owner,
        repo: repository.name,
        path: file.path,
        message: commitMessage || `Resolve conflict in ${file.path} (${strategy})`,
        content: Buffer.from(resolvedContent).toString('base64'),
        sha: file.github_sha, // 既存ファイルの場合
        branch: repository.default_branch,
      });

      newSha = commitData.content?.sha || '';
    } catch (error: any) {
      console.error('GitHub commit error:', error);
      return NextResponse.json(
        { error: 'Failed to commit to GitHub' },
        { status: 500 }
      );
    }

    // Supabaseのファイル情報を更新
    const { error: updateError } = await supabase
      .from('files')
      .update({
        content: resolvedContent,
        github_sha: newSha,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update file in database' },
        { status: 500 }
      );
    }

    // 同期状態をブロードキャスト（成功）
    await supabase.channel(`sync-status-${repositoryId}`)
      .send({
        type: 'broadcast',
        event: 'sync-update',
        payload: {
          state: 'synced',
          lastSync: new Date().toISOString(),
          pendingChanges: 0,
        }
      });

    return NextResponse.json({
      success: true,
      newSha,
      strategy,
      message: 'Conflict resolved successfully',
    });

  } catch (error) {
    console.error('Conflict resolution error:', error);

    // エラー状態をブロードキャスト
    try {
      const supabase = createClient();
      const { repositoryId } = await request.json();

      await supabase.channel(`sync-status-${repositoryId}`)
        .send({
          type: 'broadcast',
          event: 'sync-update',
          payload: {
            state: 'error',
            error: 'Conflict resolution failed',
          }
        });
    } catch (broadcastError) {
      console.error('Broadcast error:', broadcastError);
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}