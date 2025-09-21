import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { GitHubClient } from '@/lib/github';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const { name, description, isPrivate } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Repository name is required' },
        { status: 400 }
      );
    }

    // Get user authentication
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
              // Cookie setting failed
            }
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Get user ID from cookies if SSR auth fails
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

    // Get GitHub access token
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    // Create repository
    const githubClient = new GitHubClient(profile.github_access_token);
    const newRepo = await githubClient.createRepository(name, description, isPrivate);

    // Save to database
    const repositoryId = crypto.randomUUID();
    const { error: insertError } = await adminSupabase
      .from('repositories')
      .insert({
        id: repositoryId,
        user_id: userId,
        github_repo_id: newRepo.id,
        owner: newRepo.fullName.split('/')[0],
        name: newRepo.name,
        full_name: newRepo.fullName,
        default_branch: newRepo.defaultBranch,
        is_active: false,
      });

    if (insertError) {
      console.error('Failed to save repository to database:', insertError);
      // Repository was created on GitHub but failed to save to DB
      // Could implement cleanup logic here
    }

    return NextResponse.json({
      success: true,
      repository: {
        id: repositoryId,
        githubRepoId: newRepo.id,
        name: newRepo.name,
        fullName: newRepo.fullName,
        description: newRepo.description,
        private: newRepo.private,
        htmlUrl: newRepo.htmlUrl,
        defaultBranch: newRepo.defaultBranch,
      }
    });

  } catch (error: any) {
    console.error('Failed to create repository:', error);

    // Handle specific GitHub API errors
    if (error.status === 422 && error.message?.includes('name already exists')) {
      return NextResponse.json(
        { error: 'Repository name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create repository' },
      { status: 500 }
    );
  }
}