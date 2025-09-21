import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { detectConflict, ConflictType } from '@/lib/conflict-detector';
import { Octokit } from '@octokit/rest';

export async function POST(request: NextRequest) {
  try {
    const { fileId, repositoryId } = await request.json();

    if (!fileId || !repositoryId) {
      return NextResponse.json(
        { error: 'fileId and repositoryId are required' },
        { status: 400 }
      );
    }

    // Supabaseからファイル情報を取得
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

    // リポジトリ情報を取得
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

    // GitHubからリモートファイル情報を取得
    const octokit = new Octokit({
      auth: repository.access_token,
    });

    let remoteFile;
    try {
      const { data } = await octokit.repos.getContent({
        owner: repository.owner,
        repo: repository.name,
        path: file.path,
        ref: repository.default_branch,
      });

      if ('sha' in data && 'content' in data && data.type === 'file') {
        remoteFile = {
          sha: data.sha,
          content: Buffer.from(data.content, 'base64').toString('utf-8'),
        };
      } else {
        throw new Error('File is a directory or not accessible');
      }
    } catch (error: any) {
      if (error.status === 404) {
        // リモートファイルが存在しない場合
        remoteFile = null;
      } else {
        throw error;
      }
    }

    // 競合検出
    const conflictResult = detectConflict({
      local_sha: file.github_sha || 'new-file',
      remote_sha: remoteFile?.sha || 'deleted-file',
      base_sha: file.github_sha, // 最後の同期時のSHA
    });

    // 競合の詳細情報を構築
    const response = {
      conflictResult,
      localContent: file.content,
      remoteContent: remoteFile?.content || null,
      filePath: file.path,
      localSha: file.github_sha,
      remoteSha: remoteFile?.sha || null,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Conflict detection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}