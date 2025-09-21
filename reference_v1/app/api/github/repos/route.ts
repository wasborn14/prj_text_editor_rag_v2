import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GitHubClient } from "@/lib/github";

export async function GET() {
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
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // If SSR auth fails, try extracting user ID from cookies directly
    let userId = user?.id;

    if (!userId) {
      const allCookies = cookieStore.getAll();
      const authCookie = allCookies.find(
        (cookie) =>
          cookie.name.includes("supabase-auth-token") ||
          (cookie.name.includes("sb-") && cookie.name.includes("auth-token"))
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
      console.error("No user ID found in request");
      return NextResponse.json(
        { error: "Unauthorized - No user ID found" },
        { status: 401 }
      );
    }

    // Use service role client for database access
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("github_access_token")
      .eq("id", userId)
      .single();

    if (!profile?.github_access_token) {
      console.error("GitHub access token not found for user:", userId);
      return NextResponse.json(
        {
          error:
            "GitHub access token not found - Please reconnect your GitHub account",
        },
        { status: 400 }
      );
    }

    console.log("GitHub access token found for user:", userId);

    const githubClient = new GitHubClient(profile.github_access_token);

    try {
      const repos = await githubClient.getUserRepos();
      return NextResponse.json({ repos });
    } catch (error: any) {
      // If token is invalid (401), try to refresh it from current session
      if (error.status === 401) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.provider_token) {
            // Update profile with fresh token
            await adminSupabase
              .from("profiles")
              .update({
                github_access_token: session.provider_token,
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId);

            // Retry with fresh token
            const freshGithubClient = new GitHubClient(session.provider_token);
            const repos = await freshGithubClient.getUserRepos();

            console.log("Successfully refreshed token and retrieved repos");
            return NextResponse.json({ repos });
          } else {
            console.log("No provider token in current session");
            return NextResponse.json(
              {
                error:
                  "GitHub token expired and no fresh token available - Please sign in again",
                needsReauth: true,
              },
              { status: 401 }
            );
          }
        } catch (refreshError) {
          console.error("Failed to refresh token:", refreshError);
          return NextResponse.json(
            {
              error:
                "GitHub token expired and refresh failed - Please sign in again",
              needsReauth: true,
            },
            { status: 401 }
          );
        }
      } else {
        // Re-throw non-401 errors
        throw error;
      }
    }
  } catch (error) {
    console.error("Failed to fetch repositories:", error);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { repositoryId, githubRepoId, owner, name, fullName, defaultBranch } =
      await request.json();

    if (!repositoryId || !githubRepoId || !owner || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data: existingRepo } = await supabase
      .from("repositories")
      .select("id")
      .eq("user_id", user.id)
      .eq("github_repo_id", githubRepoId)
      .single();

    if (existingRepo) {
      const { error: updateError } = await supabase
        .from("repositories")
        .update({ is_active: true })
        .eq("id", existingRepo.id);

      if (updateError) {
        throw updateError;
      }

      const { error: deactivateError } = await supabase
        .from("repositories")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .neq("id", existingRepo.id);

      if (deactivateError) {
        console.error(
          "Failed to deactivate other repositories:",
          deactivateError
        );
      }

      return NextResponse.json({
        success: true,
        repositoryId: existingRepo.id,
        message: "Repository activated",
      });
    }

    const { error: deactivateError } = await supabase
      .from("repositories")
      .update({ is_active: false })
      .eq("user_id", user.id);

    if (deactivateError) {
      console.error("Failed to deactivate repositories:", deactivateError);
    }

    const { data: newRepo, error: insertError } = await supabase
      .from("repositories")
      .insert({
        id: repositoryId,
        user_id: user.id,
        github_repo_id: githubRepoId,
        owner,
        name,
        full_name: fullName,
        default_branch: defaultBranch || "main",
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      repository: newRepo,
      message: "Repository saved and activated",
    });
  } catch (error) {
    console.error("Failed to save repository:", error);
    return NextResponse.json(
      { error: "Failed to save repository" },
      { status: 500 }
    );
  }
}
