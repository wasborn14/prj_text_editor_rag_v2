import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // 現在のユーザーを取得
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ユーザーのリポジトリ一覧を取得
    const { data: repositories, error: repoError } = await supabase
      .from("repositories")
      .select("*")
      .eq("user_id", user.id);

    // ファイル一覧も取得
    let allFiles = [];
    if (repositories && repositories.length > 0) {
      const { data: files, error: filesError } = await supabase
        .from("files")
        .select("*")
        .in(
          "repository_id",
          repositories.map((r) => r.id)
        );

      if (!filesError) {
        allFiles = files || [];
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      repositories: repositories || [],
      repositoryCount: repositories?.length || 0,
      files: allFiles,
      fileCount: allFiles.length,
      repositoryError: repoError?.message || null,
    });
  } catch (error) {
    console.error("Debug repositories error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
