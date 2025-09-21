"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  fixGitHubToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signInWithGitHub: async () => {},
  signOut: async () => {},
  fixGitHubToken: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Create supabase client inside useEffect to prevent re-creation
    const supabase = createClient();
    // 初期セッション取得
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // 認証状態変化の監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // ユーザーがサインインした場合、プロフィール情報を更新
      if (event === "SIGNED_IN" && session?.user) {
        await updateProfile(session.user, session);
      } else if (event === "SIGNED_IN") {
        console.log("SIGNED_IN event but no user found:", session);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // 空の依存配列で1回のみ実行

  // プロフィール情報更新（エラーハンドリング強化）
  const updateProfile = async (user: User, session?: Session) => {
    try {
      const supabase = createClient();

      // 複数の場所でprovider_tokenを探索
      const providerToken =
        session?.provider_token ||
        session?.access_token ||
        (session?.user?.identities?.[0] as any)?.access_token ||
        null;

      const profile = {
        id: user.id,
        github_username: user.user_metadata?.user_name || null,
        github_id: user.user_metadata?.provider_id
          ? parseInt(user.user_metadata.provider_id)
          : null,
        display_name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          "Unknown User",
        avatar_url: user.user_metadata?.avatar_url || null,
        github_access_token: providerToken,
      };

      // 現在のセッション情報を確認
      const { data: sessionData } = await supabase.auth.getSession();

      const { data, error } = await supabase
        .from("profiles")
        .upsert(profile, {
          onConflict: "id",
          ignoreDuplicates: false,
        })
        .select();

      console.log("Supabase upsert result:", { data, error });

      if (error) {
        console.error("Error upserting profile:", error);
        console.error(
          "Error details:",
          error.details,
          error.hint,
          error.message
        );

        // 基本的なプロフィールのみで再試行
        const simpleProfile = {
          id: user.id,
          display_name: user.email || "Unknown User",
        };

        const { error: retryError } = await supabase
          .from("profiles")
          .upsert(simpleProfile, { onConflict: "id" });

        if (retryError) {
          console.error("Retry failed:", retryError);
        } else {
          console.log("Simple profile created successfully");
        }
      } else {
        console.log("Profile upserted successfully:", data);
      }
    } catch (error) {
      console.error("Unexpected error in updateProfile:", error);
    }
  };

  const signInWithGitHub = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : "/",
          scopes: "repo read:user user:email",
        },
      });

      if (error) {
        console.error("Error signing in with GitHub:", error);
        throw error;
      }
    } catch (error) {
      console.error("GitHub sign in failed:", error);
      throw error;
    }
  };

  const fixGitHubToken = async () => {
    try {
      const response = await fetch("/api/fix-token", { method: "POST" });
      const result = await response.json();

      if (result.success) {
        console.log("GitHub token fixed successfully:", result);
        alert(
          "GitHubアクセストークンが修復されました！Repository Selectorが使用できるようになります。"
        );
      } else {
        console.error("Failed to fix GitHub token:", result);
        alert("GitHubトークンの修復に失敗しました: " + result.error);
      }
    } catch (error) {
      console.error("Error fixing GitHub token:", error);
      alert("GitHubトークンの修復中にエラーが発生しました");
    }
  };

  const signOut = async () => {
    // まずローカル状態を即座にクリア（UIを更新）
    setUser(null);
    setSession(null);
    setLoading(false);

    try {
      // Supabaseからサインアウト
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Error signing out:", error);
      }
    } catch (error) {
      console.error("Sign out failed:", error);
    }

    // LocalStorageとSessionStorageをクリア - useEffectの後で実行
    setTimeout(() => {
      if (typeof window !== "undefined") {
        // Supabase関連のデータをクリア
        const keysToRemove: string[] = [];

        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("sb-") || key.includes("supabase")) {
            keysToRemove.push(key);
          }
        });

        keysToRemove.forEach((key) => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.error("Failed to remove localStorage key:", key, e);
          }
        });

        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith("sb-") || key.includes("supabase")) {
            try {
              sessionStorage.removeItem(key);
            } catch (e) {
              console.error("Failed to remove sessionStorage key:", key, e);
            }
          }
        });
      }
    }, 0);
  };

  const value = {
    user,
    session,
    loading,
    signInWithGitHub,
    signOut,
    fixGitHubToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
