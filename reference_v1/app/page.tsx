"use client";

import { useState, useEffect } from "react";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import {
  ChevronDownIcon,
  FolderOpenIcon,
  EyeIcon,
  EyeOffIcon,
  MessageCircleIcon,
  WandIcon,
  LogOutIcon,
  WrenchIcon
} from "lucide-react";
import MarkdownEditor from "@/components/MarkdownEditor";
import MarkdownPreview from "@/components/MarkdownPreview";
import AIAssistant from "@/components/AIAssistant";
import AIChat from "@/components/AIChat";
import SaveIndicator from "@/components/SaveIndicator";
import FileExplorer from "@/components/FileExplorer";
import AuthGuard from "@/components/AuthGuard";
import RepositorySelector from "@/components/RepositorySelector";
import SyncStatus from "@/components/SyncStatus";
import AutoSyncStatus from "@/components/AutoSyncStatus";
import BranchIndicator from "@/components/BranchIndicator";
import ConflictResolver from "@/components/ConflictResolver";
import { createSimpleDiff } from "@/utils/diffEngine";
import { useAutoSave, loadSavedContent } from "@/hooks/useAutoSave";
import { useAuth } from "@/components/AuthProvider";
import {
  detectConflict,
  ConflictResult,
  ResolutionStrategy,
} from "@/lib/conflict-detector";
import { createClient } from "@/lib/supabase";
import { useUpdateFile, useFileContent } from "@/hooks/useFiles";
import {
  useActiveRepository,
  useSetActiveRepository,
} from "@/hooks/useRepositories";
import { useAutoSync, useSyncIndicator } from "@/hooks/useAutoSync";

function MainApp() {
  const { user, signOut, fixGitHubToken } = useAuth();

  // TanStack Query hooks
  const { data: activeRepository } = useActiveRepository();
  const updateFileMutation = useUpdateFile();
  const setActiveRepositoryMutation = useSetActiveRepository();
  const initialContent = `# Welcome to AI-Powered Markdown Editor

This is a **mock** application demonstrating AI-assisted editing capabilities.

## Features

- Real-time Markdown editing
- Live preview
- AI suggestions for improving your text
- Diff visualization for suggested changes

## Try it out!

Click the "AI Assist" button to get suggestions for improving this text.
`;

  const [content, setContent] = useState<string>("");
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [showAIPanel, setShowAIPanel] = useState<boolean>(false);
  const [aiSuggestions, setAISuggestions] = useState<any>(null);
  const [showAIChat, setShowAIChat] = useState<boolean>(false);
  const [showDiff, setShowDiff] = useState<boolean>(false);
  const [proposedContent, setProposedContent] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [showExplorer, setShowExplorer] = useState<boolean>(true);
  const [showRepositorySelector, setShowRepositorySelector] =
    useState<boolean>(false);
  // Use activeRepository from TanStack Query instead of local state
  // const [selectedRepository, setSelectedRepository] = useState<any>(null);
  const [showConflictResolver, setShowConflictResolver] =
    useState<boolean>(false);
  const [conflictData, setConflictData] = useState<any>(null);

  // 自動同期フック
  const { isSyncing, triggerSync } = useAutoSync(activeRepository?.id || null, {
    enabled: !!activeRepository && !!user,
    intervalMs: 5 * 60 * 1000, // 5分間隔
    onSyncComplete: (result) => {
      console.log('Auto sync completed:', result);
    },
    onSyncError: (error) => {
      console.error('Auto sync error:', error);
    },
  });

  // 同期ステータス表示用
  const { statusText, statusColor } = useSyncIndicator(activeRepository?.id || null);

  // カスタム保存関数（ファイルが選択されている場合はSupabaseとGitHubに保存）
  const customSaveFunction = async (content: string): Promise<void> => {
    if (selectedFile && activeRepository) {
      try {
        // 1. TanStack Query を使ってSupabaseに保存
        await updateFileMutation.mutateAsync({
          id: selectedFile.id,
          content: content,
        });

        // 2. GitHubにコミット
        const commitResponse = await fetch("/api/github/commit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileId: selectedFile.id,
            content: content,
            message: `Update ${selectedFile.path} via web editor`,
          }),
        });

        if (commitResponse.ok) {
          const commitData = await commitResponse.json();
        } else {
          console.warn("GitHub commit failed, but file was saved to database");
        }
      } catch (error) {
        console.error("Error saving file:", error);
        throw error; // エラーを上位に伝播
      }
    }
    // LocalStorageの場合は何もしない（デフォルトのLocalStorage保存が実行される）
  };

  // Auto-save hook
  const { saveStatus, lastSaved, save, hasUnsavedChanges } = useAutoSave(
    content,
    customSaveFunction,
    {
      delay: 300,
      key: selectedFile ? `file-${selectedFile.id}` : "markdown-editor-content",
    }
  );

  // Load saved content on mount
  useEffect(() => {
    const { content: savedContent } = loadSavedContent();
    if (savedContent) {
      setContent(savedContent);
    } else {
      setContent(initialContent);
    }
  }, []);

  // Load active repository when user is available
  useEffect(() => {
    if (user) {
      loadActiveRepository();
    }
  }, [user]);

  // アクティブなリポジトリを読み込む関数
  const loadActiveRepository = async () => {
    if (!user) {
      console.log("loadActiveRepository: No user, returning");
      return;
    }

    try {
      const supabase = createClient();

      // アクティブなリポジトリを取得
      const { data: activeRepo, error } = await supabase
        .from("repositories")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (error || !activeRepo) {
        console.log("No active repository found. Error:", error);
        return;
      }

      // GitHubのリポジトリ形式に変換
      const formattedRepo = {
        id: activeRepo.github_repo_id,
        name: activeRepo.name,
        fullName: activeRepo.full_name,
        description: activeRepo.description || "",
        private: activeRepo.private || false,
        defaultBranch: activeRepo.default_branch || "main",
        supabaseId: activeRepo.id,
        owner: {
          login: activeRepo.owner,
        },
      };
    } catch (error) {
      console.error("Error loading active repository:", error);
    }
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.shiftKey && event.key === "P") {
        event.preventDefault();
        setShowPreview((prev) => !prev);
      }
      if (event.metaKey && event.key === "k") {
        event.preventDefault();
        setShowAIChat((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleAIAssist = async () => {
    setShowAIPanel(true);
    try {
      const response = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      setAISuggestions(data);
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
    }
  };

  const handleAcceptSuggestion = (newContent: string) => {
    setContent(newContent);
    setShowAIPanel(false);
    setAISuggestions(null);
  };

  const handleShowDiff = (
    originalContent: string,
    suggestedContent: string
  ) => {
    setProposedContent(suggestedContent);
    setShowDiff(true);
  };

  const handleApplyDiff = () => {
    setContent(proposedContent);
    setShowDiff(false);
    setProposedContent("");
  };

  const handleRejectDiff = () => {
    setShowDiff(false);
    setProposedContent("");
  };

  // ファイル選択時のハンドラー
  const handleFileSelect = (file: any) => {
    setSelectedFile(file);
    if (file.type === "file" && file.content) {
      setContent(file.content);
    }
  };

  // リポジトリ選択時のハンドラー
  const handleRepositorySelect = async (repository: any) => {
    // SupabaseのリポジトリIDを取得してrepositoryオブジェクトに追加
    try {
      const supabase = createClient();
      const { data: repositories } = await supabase
        .from("repositories")
        .select("*")
        .eq("github_repo_id", repository.id)
        .single();

      if (repositories) {
        // SupabaseのリポジトリIDを追加
        repository.supabaseId = repositories.id;
        console.log("Repository with Supabase ID:", repository);

        // 他のリポジトリをinactiveにして、選択されたリポジトリをactiveに設定
        await supabase
          .from("repositories")
          .update({ is_active: false })
          .neq("id", repositories.id);

        await supabase
          .from("repositories")
          .update({ is_active: true })
          .eq("id", repositories.id);
      }
    } catch (error) {
      console.error("Error fetching Supabase repository ID:", error);
    }

    // 同期が完全に完了するまで少し遅延を追加
    setTimeout(() => {
      // Repository is now managed by TanStack Query through the sync process
      setSelectedFile(null); // リポジトリ変更時は選択ファイルをクリア
      setContent(initialContent); // コンテンツをリセット
    }, 1000); // 1秒の遅延

    console.log(
      "Repository selected:",
      repository?.fullName || repository?.full_name || "Name not found"
    );
  };

  // 競合解決のハンドラー
  const handleConflictResolve = (
    resolvedContent: string,
    strategy: ResolutionStrategy
  ) => {
    setContent(resolvedContent);
    setShowConflictResolver(false);
    setConflictData(null);
  };

  // 競合検出とモーダル表示のハンドラー（将来の同期処理で使用）
  const handleConflictDetected = (
    localContent: string,
    remoteContent: string,
    filePath: string
  ) => {
    const conflictResult = detectConflict({
      local_sha: "local-sha-placeholder",
      remote_sha: "remote-sha-placeholder",
      base_sha: "base-sha-placeholder",
    });

    setConflictData({
      filePath,
      localContent,
      remoteContent,
      conflictResult,
    });
    setShowConflictResolver(true);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-800">
                {selectedFile ? selectedFile.name : "AI Markdown Editor"}
              </h1>
              <SaveIndicator saveStatus={saveStatus} lastSaved={lastSaved} />
              <SyncStatus
                repositoryId={activeRepository?.id}
                fileId={selectedFile?.id}
              />
              {/* 自動同期ステータス */}
              {activeRepository && (
                <AutoSyncStatus
                  isSyncing={isSyncing}
                  statusText={statusText}
                  statusColor={statusColor}
                  onManualSync={triggerSync}
                />
              )}
            </div>
            <div className="flex items-center gap-4">
              <BranchIndicator
                repositoryName={activeRepository?.name}
                branchName={activeRepository?.default_branch}
              />
              {selectedFile && (
                <span className="text-sm text-gray-500">
                  {selectedFile.path}
                </span>
              )}
            </div>
            {user && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <img
                  src={user.user_metadata?.avatar_url}
                  alt={user.user_metadata?.full_name}
                  className="w-6 h-6 rounded-full"
                />
                <span>{user.user_metadata?.full_name || user.email}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Repository Selection Button */}
            <button
              onClick={() => setShowRepositorySelector(!showRepositorySelector)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              title="Select Repository"
            >
              {activeRepository ? activeRepository.name : "Select Repo"}
            </button>

            {/* Actions Dropdown Menu */}
            <Menu as="div" className="relative">
              <MenuButton className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center data-[open]:bg-gray-50">
                Actions
                <ChevronDownIcon className="ml-1 h-4 w-4 transition-transform data-[open]:rotate-180" />
              </MenuButton>

              <MenuItems className="absolute right-0 z-10 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 focus:outline-none">
                <div className="py-1">
                  <MenuItem>
                    {({ close }) => (
                      <button
                        onClick={() => {
                          fixGitHubToken();
                          close();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center ui-active:bg-gray-100"
                      >
                        <WrenchIcon className="w-4 h-4 mr-2 text-orange-500" />
                        Fix GitHub Token
                      </button>
                    )}
                  </MenuItem>

                  <MenuItem>
                    {({ close }) => (
                      <button
                        onClick={() => {
                          setShowExplorer(!showExplorer);
                          close();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center ui-active:bg-gray-100"
                      >
                        <FolderOpenIcon className="w-4 h-4 mr-2 text-blue-500" />
                        {showExplorer ? "Hide Explorer" : "Show Explorer"}
                      </button>
                    )}
                  </MenuItem>

                  <MenuItem>
                    {({ close }) => (
                      <button
                        onClick={() => {
                          togglePreview();
                          close();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center ui-active:bg-gray-100"
                      >
                        {showPreview ? (
                          <EyeOffIcon className="w-4 h-4 mr-2 text-gray-500" />
                        ) : (
                          <EyeIcon className="w-4 h-4 mr-2 text-green-500" />
                        )}
                        {showPreview ? "Hide Preview" : "Show Preview"}
                      </button>
                    )}
                  </MenuItem>

                  <MenuItem>
                    {({ close }) => (
                      <button
                        onClick={() => {
                          setShowAIChat(!showAIChat);
                          close();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center ui-active:bg-gray-100"
                      >
                        <MessageCircleIcon className={`w-4 h-4 mr-2 ${showAIChat ? 'text-blue-500' : 'text-gray-500'}`} />
                        {showAIChat ? "Hide AI Chat" : "Show AI Chat"}
                      </button>
                    )}
                  </MenuItem>

                  <MenuItem>
                    {({ close }) => (
                      <button
                        onClick={() => {
                          handleAIAssist();
                          close();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center ui-active:bg-gray-100"
                      >
                        <WandIcon className="w-4 h-4 mr-2 text-purple-500" />
                        AI Suggest
                      </button>
                    )}
                  </MenuItem>

                  <div className="border-t border-gray-100 my-1" />

                  <MenuItem>
                    {({ close }) => (
                      <button
                        onClick={() => {
                          signOut();
                          close();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center ui-active:bg-red-50"
                      >
                        <LogOutIcon className="w-4 h-4 mr-2" />
                        Sign Out
                      </button>
                    )}
                  </MenuItem>
                </div>
              </MenuItems>
            </Menu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Explorer Panel */}
        {showExplorer && (
          <FileExplorer
            key={activeRepository?.id || "no-repo"}
            onFileSelect={handleFileSelect}
            selectedPath={selectedFile?.path}
            selectedRepository={activeRepository}
          />
        )}

        {/* Editor Panel */}
        <div className={`${showPreview ? "flex-1" : "flex-1"} flex flex-col`}>
          <div className="flex-1 overflow-hidden">
            <MarkdownEditor
              value={content}
              onChange={setContent}
              showDiff={showDiff}
              diffLines={
                showDiff ? createSimpleDiff(content, proposedContent) : []
              }
              onApplyDiff={handleApplyDiff}
              onRejectDiff={handleRejectDiff}
            />
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="flex-1 border-l border-gray-200 bg-white overflow-auto">
            <MarkdownPreview content={content} />
          </div>
        )}
      </div>

      {/* AI Assistant Panel */}
      {showAIPanel && (
        <AIAssistant
          originalContent={content}
          suggestions={aiSuggestions}
          onAccept={handleAcceptSuggestion}
          onClose={() => {
            setShowAIPanel(false);
            setAISuggestions(null);
          }}
        />
      )}

      {/* AI Chat Panel */}
      <AIChat
        isVisible={showAIChat}
        onClose={() => setShowAIChat(false)}
        onShowDiff={handleShowDiff}
        currentContent={content}
      />

      {/* Repository Selector */}
      {showRepositorySelector && (
        <RepositorySelector
          onRepositorySelect={handleRepositorySelect}
          onClose={() => setShowRepositorySelector(false)}
        />
      )}

      {/* Conflict Resolver */}
      {showConflictResolver && (
        <ConflictResolver
          isVisible={showConflictResolver}
          onClose={() => setShowConflictResolver(false)}
          onResolve={handleConflictResolve}
          conflictData={conflictData}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <MainApp />
    </AuthGuard>
  );
}
