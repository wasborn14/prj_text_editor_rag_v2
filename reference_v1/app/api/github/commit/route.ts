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

    const { fileId, content, message } = await request.json();

    if (!fileId || content === undefined) {
      return NextResponse.json(
        { error: 'File ID and content are required' },
        { status: 400 }
      );
    }

    // Get file information
    const { data: file } = await adminSupabase
      .from('files')
      .select('*, repository:repositories(*)')
      .eq('id', fileId)
      .single();

    if (!file || !file.repository) {
      return NextResponse.json(
        { error: 'File or repository not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (file.repository.user_id !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get GitHub access token
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

    // Update file on GitHub
    const commitMessage = message || `Update ${file.path}`;

    let commitResult;
    if (file.github_sha) {
      // Update existing file
      commitResult = await githubClient.updateFile(
        file.repository.owner,
        file.repository.name,
        file.path,
        content,
        commitMessage,
        file.github_sha,
        file.repository.default_branch
      );
    } else {
      // Create new file
      commitResult = await githubClient.createFile(
        file.repository.owner,
        file.repository.name,
        file.path,
        content,
        commitMessage,
        file.repository.default_branch
      );
    }

    // Update file record in database with new SHA
    const { error: updateError } = await adminSupabase
      .from('files')
      .update({
        content: content,
        github_sha: commitResult.content?.sha || file.github_sha,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId);

    if (updateError) {
      console.error('Failed to update file record:', updateError);
      // GitHub commit succeeded but database update failed
      // This is a warning, not a fatal error
    }

    return NextResponse.json({
      success: true,
      commit: commitResult.commit,
      sha: commitResult.content?.sha || file.github_sha,
    });
  } catch (error: any) {
    console.error('Failed to commit to GitHub:', error);

    // Handle specific GitHub API errors
    if (error.status === 409) {
      return NextResponse.json(
        { error: 'Conflict: File has been modified by another user' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to commit to GitHub' },
      { status: 500 }
    );
  }
}