import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
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
              // Server component context
            }
          },
        },
      }
    );

    // 現在のユーザーセッション取得
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // GitHub provider tokenを取得
    const providerToken = session.provider_token;
    if (!providerToken) {
      return NextResponse.json(
        { error: "GitHub token not available" },
        { status: 401 }
      );
    }

    console.log("Fetching GitHub repositories for user:", session.user.email);

    // GitHub APIでリポジトリ一覧取得
    const githubResponse = await fetch("https://api.github.com/user/repos", {
      headers: {
        Authorization: `Bearer ${providerToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "AI-Markdown-Editor",
      },
      // パラメータ追加（必要に応じて）
    });

    if (!githubResponse.ok) {
      console.error(
        "GitHub API error:",
        githubResponse.status,
        githubResponse.statusText
      );
      const errorText = await githubResponse.text();
      console.error("GitHub API error details:", errorText);

      return NextResponse.json(
        { error: `GitHub API error: ${githubResponse.status}` },
        { status: githubResponse.status }
      );
    }

    const repositories = await githubResponse.json();

    // フィルタリング（必要に応じて）
    const filteredRepos = repositories
      .filter((repo: any) => !repo.fork) // フォークを除外
      .sort(
        (a: any, b: any) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ) // 更新日順
      .slice(0, 50); // 上位50件

    return NextResponse.json(filteredRepos);
  } catch (error) {
    console.error("Error fetching repositories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
