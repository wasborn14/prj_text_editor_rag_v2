import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server Component で呼ばれた場合は無視
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Service role client でファイル一覧を取得
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ユーザーのリポジトリ一覧を取得
    const { data: repositories, error: repoError } = await adminSupabase
      .from('repositories')
      .select('*')
      .eq('user_id', user.id);

    if (repoError) {
      return NextResponse.json(
        { error: 'Failed to fetch repositories', details: repoError },
        { status: 500 }
      );
    }

    // 各リポジトリのファイル一覧を取得
    const repositoryFiles = await Promise.all(
      (repositories || []).map(async (repo) => {
        const { data: files, error: filesError } = await adminSupabase
          .from('files')
          .select('*')
          .eq('repository_id', repo.id)
          .order('path');

        return {
          repository: repo,
          files: files || [],
          filesError
        };
      })
    );

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      repositories: repositories || [],
      repositoryFiles,
      totalFiles: repositoryFiles.reduce((acc, repo) => acc + repo.files.length, 0)
    });
  } catch (error) {
    console.error('Debug files error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}