"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import CreateRepositoryModal from "./CreateRepositoryModal";

interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
  language: string | null;
  owner: {
    login: string;
    avatarUrl: string;
  };
}

interface RepositorySelectorProps {
  onRepositorySelect: (repo: Repository) => void;
  onClose: () => void;
}

export default function RepositorySelector({
  onRepositorySelect,
  onClose,
}: RepositorySelectorProps) {
  const { session, fixGitHubToken } = useAuth();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    try {
      const response = await fetch("/api/github/repos");

      if (!response.ok) {
        // レスポンスの詳細を取得
        const errorText = await response.text();
        console.error("API Error Response:", response.status, errorText);

        let errorMessage = `HTTP ${response.status}`;
        let needsReauth = false;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
          needsReauth = errorData.needsReauth || false;
        } catch (parseError) {
          errorMessage = errorText || errorMessage;
        }

        // If reauthentication is needed, show specific message
        if (needsReauth) {
          errorMessage =
            "GitHub認証が期限切れです。「Fix GitHub Token」ボタンをクリックするか、再ログインしてください。";
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      setRepositories(data.repos || []);
    } catch (error: any) {
      console.error("Error fetching repositories:", error);
      setError(error.message || "Failed to fetch repositories");
    } finally {
      setLoading(false);
    }
  };

  const filteredRepositories = repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleCreateSuccess = async (newRepo: any) => {
    // Add the new repository to the list
    const formattedRepo: Repository = {
      id: newRepo.githubRepoId,
      name: newRepo.name,
      fullName: newRepo.fullName,
      description: newRepo.description,
      private: newRepo.private,
      defaultBranch: newRepo.defaultBranch,
      updatedAt: new Date().toISOString(),
      language: null,
      owner: {
        login: newRepo.fullName.split("/")[0],
        avatarUrl: "", // Will be populated on refresh
      },
    };

    setRepositories((prev) => [formattedRepo, ...prev]);
    setShowCreateModal(false);

    // 新規作成されたリポジトリの初回同期を実行
    try {
      setSyncing(true);
      setSyncStatus("新規リポジトリを同期しています...");

      console.log("Starting sync for new repository:", newRepo.id);

      const syncResponse = await fetch("/api/github/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repositoryId: newRepo.id, // Create API から返されるリポジトリID
        }),
      });

      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        setSyncStatus(`同期完了: ${syncData.filesCount || 0} ファイル`);
        setTimeout(() => setSyncStatus(null), 3000);
      } else {
        const errorData = await syncResponse.json().catch(() => ({}));
        console.error("Sync failed:", syncResponse.status, errorData);
        setSyncStatus("同期に失敗しました");
        setTimeout(() => setSyncStatus(null), 3000);
      }
    } catch (error) {
      console.error("Sync error:", error);
      setSyncStatus("同期エラーが発生しました");
      setTimeout(() => setSyncStatus(null), 3000);
    } finally {
      setSyncing(false);
    }

    // Auto-select the new repository
    onRepositorySelect(formattedRepo);
  };

  const handleRepositorySelect = async (repo: Repository) => {
    try {
      const repositoryId = crypto.randomUUID();

      const response = await fetch("/api/github/repos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repositoryId,
          githubRepoId: repo.id,
          owner: repo.owner.login,
          name: repo.name,
          fullName: repo.fullName,
          defaultBranch: repo.defaultBranch,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save repository");
      }

      const data = await response.json();

      // 同期を実行（新規作成または既存リポジトリのアクティベート両方）
      setSyncing(true);
      setSyncStatus("リポジトリを同期しています...");

      const actualRepositoryId = data.repositoryId || repositoryId;

      const syncResponse = await fetch("/api/github/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repositoryId: actualRepositoryId,
        }),
      });

      if (!syncResponse.ok) {
        const errorData = await syncResponse.json().catch(() => ({}));
        console.error("Sync failed:", syncResponse.status, errorData);
        setSyncStatus("同期に失敗しました");
        setTimeout(() => setSyncStatus(null), 3000);
      } else {
        const syncData = await syncResponse.json();
        console.log("Sync completed:", syncData);
        setSyncStatus(`同期完了: ${syncData.filesCount || 0} ファイル`);
        setTimeout(() => setSyncStatus(null), 3000);
      }
      setSyncing(false);

      onRepositorySelect(repo);
    } catch (error: any) {
      console.error("Error saving repository:", error);
      setError(error.message || "Failed to save repository");
    }
  };

  return (
    <>
      {showCreateModal && (
        <CreateRepositoryModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Select Repository
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Choose a repository to edit with the AI-powered editor
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Create New
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">
                  Loading repositories...
                </span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="text-red-600 mb-2">
                    <svg
                      className="w-12 h-12 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                  <p className="text-red-800 font-medium">
                    Error loading repositories
                  </p>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={fetchRepositories}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      Retry
                    </button>
                    {error.includes("期限切れ") && (
                      <button
                        onClick={async () => {
                          await fixGitHubToken();
                          fetchRepositories();
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Fix GitHub Token
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : filteredRepositories.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="text-gray-400 mb-2">
                    <svg
                      className="w-12 h-12 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium">
                    No repositories found
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    Try adjusting your search terms
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredRepositories.map((repo) => (
                  <div
                    key={repo.id}
                    className="p-6 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                    onClick={() => handleRepositorySelect(repo)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {repo.name}
                          </h3>
                          {repo.private && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Private
                            </span>
                          )}
                          {repo.language && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {repo.language}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {repo.fullName}
                        </p>
                        {repo.description && (
                          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                            {repo.description}
                          </p>
                        )}
                        <div className="flex items-center text-xs text-gray-500">
                          <span>Updated {formatDate(repo.updatedAt)}</span>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        {repo.owner.avatarUrl ? (
                          <img
                            src={repo.owner.avatarUrl}
                            alt={repo.owner.login}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 text-sm font-medium">
                              {repo.owner.login.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {filteredRepositories.length} of {repositories.length}{" "}
                repositories shown
              </span>
              {syncing || syncStatus ? (
                <div className="flex items-center">
                  {syncing && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  )}
                  <span
                    className={syncing ? "text-blue-600" : "text-green-600"}
                  >
                    {syncStatus}
                  </span>
                </div>
              ) : (
                <span>Click a repository to start editing</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
