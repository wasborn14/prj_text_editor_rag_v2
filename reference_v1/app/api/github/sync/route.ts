import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { GitHubClient } from '@/lib/github';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    // First try with SSR client for user identification
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
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // If SSR auth fails, try extracting user ID from cookies directly
    let userId = user?.id;

    if (!userId) {
      const allCookies = cookieStore.getAll();
      const authCookie = allCookies.find(cookie =>
        cookie.name.includes('supabase-auth-token') ||
        cookie.name.includes('sb-') && cookie.name.includes('auth-token')
      );

      if (authCookie) {
        try {
          const parsed = JSON.parse(authCookie.value);
          userId = parsed.user?.id;
        } catch (e) {
          // Cookie parsing failed
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use service role client for database access
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // リクエストボディから設定を取得
    const body = await request.json().catch(() => ({}));
    let { repositoryId, checkOnly = false } = body;

    // repositoryIdが指定されていない場合、アクティブなリポジトリを取得
    if (!repositoryId) {
      const { data: activeRepo } = await adminSupabase
        .from('repositories')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      repositoryId = activeRepo?.id;
    }

    if (!repositoryId) {
      return NextResponse.json(
        { error: 'Repository ID is required' },
        { status: 400 }
      );
    }

    const { data: repository } = await adminSupabase
      .from('repositories')
      .select('*')
      .eq('id', repositoryId)
      .eq('user_id', userId)
      .single();

    if (!repository) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      );
    }

    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('github_access_token')
      .eq('id', userId)
      .single();

    if (!profile?.github_access_token) {
      return NextResponse.json(
        { error: 'GitHub access token not found' },
        { status: 400 }
      );
    }

    const githubClient = new GitHubClient(profile.github_access_token);

    const result = await githubClient.syncRepoToSupabase(
      repository.owner,
      repository.name,
      repositoryId,
      undefined, // onProgress callback
      checkOnly
    );

    // checkOnlyの場合はlast_synced_atを更新しない
    if (!checkOnly) {
      const { error: updateError } = await adminSupabase
        .from('repositories')
        .update({
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', repositoryId);

      if (updateError) {
        console.error('Failed to update last_synced_at:', updateError);
      }
    }

    return NextResponse.json({
      ...result,
    });
  } catch (error) {
    console.error('Failed to sync repository:', error);
    return NextResponse.json(
      { error: 'Failed to sync repository' },
      { status: 500 }
    );
  }
}