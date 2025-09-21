import { Octokit } from '@octokit/rest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export class GitHubClient {
  private octokit: Octokit;
  private supabase: ReturnType<typeof createClient>;

  constructor(accessToken: string) {
    this.octokit = new Octokit({
      auth: accessToken,
    });

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async getUserRepos() {
    try {
      const { data } = await this.octokit.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100,
        type: 'owner',
      });

      return data.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        defaultBranch: repo.default_branch || 'main',
        updatedAt: repo.updated_at,
        language: repo.language,
        owner: {
          login: repo.owner.login,
          avatarUrl: repo.owner.avatar_url,
        },
      }));
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      throw error;
    }
  }

  async getRepoContents(owner: string, repo: string, path: string = '') {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
      });

      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.error('Failed to fetch repo contents:', error);
      throw error;
    }
  }

  async getFileContent(owner: string, repo: string, path: string) {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
      });

      if ('content' in data && data.type === 'file') {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return {
          content,
          sha: data.sha,
          size: data.size,
          path: data.path,
          name: data.name,
        };
      }

      throw new Error('Path is not a file');
    } catch (error) {
      console.error('Failed to fetch file content:', error);
      throw error;
    }
  }

  async updateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    sha: string,
    branch?: string
  ) {
    try {
      const { data } = await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        sha,
        branch,
      });

      return {
        commit: data.commit,
        content: data.content,
      };
    } catch (error) {
      console.error('Failed to update file:', error);
      throw error;
    }
  }

  async createFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch?: string
  ) {
    try {
      const { data } = await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
      });

      return {
        commit: data.commit,
        content: data.content,
      };
    } catch (error) {
      console.error('Failed to create file:', error);
      throw error;
    }
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    sha: string,
    branch?: string
  ) {
    try {
      const { data } = await this.octokit.repos.deleteFile({
        owner,
        repo,
        path,
        message,
        sha,
        branch,
      });

      return data.commit;
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  async createRepository(name: string, description?: string, isPrivate: boolean = false) {
    try {
      const { data } = await this.octokit.repos.createForAuthenticatedUser({
        name,
        description,
        private: isPrivate,
        auto_init: true, // Initialize with README
      });

      return {
        id: data.id,
        name: data.name,
        fullName: data.full_name,
        description: data.description,
        private: data.private,
        defaultBranch: data.default_branch || 'main',
        cloneUrl: data.clone_url,
        htmlUrl: data.html_url,
      };
    } catch (error) {
      console.error('Failed to create repository:', error);
      throw error;
    }
  }

  async getBranches(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.repos.listBranches({
        owner,
        repo,
        per_page: 100,
      });

      return data.map(branch => ({
        name: branch.name,
        protected: branch.protected,
        commit: {
          sha: branch.commit.sha,
          url: branch.commit.url,
        },
      }));
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      throw error;
    }
  }

  async createBranch(
    owner: string,
    repo: string,
    branch: string,
    fromBranch: string = 'main'
  ) {
    try {
      const { data: refData } = await this.octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${fromBranch}`,
      });

      const { data } = await this.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha: refData.object.sha,
      });

      return {
        ref: data.ref,
        sha: data.object.sha,
      };
    } catch (error) {
      console.error('Failed to create branch:', error);
      throw error;
    }
  }

  async checkForChanges(
    owner: string,
    repo: string,
    repositoryId: string
  ): Promise<{ hasChanges: boolean; changedFiles: string[]; newFiles: string[]; deletedFiles: string[] }> {
    try {
      // Supabaseから現在のファイル情報を取得
      const { data: currentFiles } = await this.supabase
        .from('files')
        .select('path, github_sha')
        .eq('repository_id', repositoryId)
        .eq('type', 'file');

      const currentFileMap = new Map<string, string>();
      currentFiles?.forEach((file: any) => {
        currentFileMap.set(file.path, file.github_sha);
      });

      // GitHubから最新のファイル情報を取得
      const gitHubFiles: { path: string; sha: string }[] = [];
      const stack = [''];

      while (stack.length > 0) {
        const currentPath = stack.pop()!;
        const contents = await this.getRepoContents(owner, repo, currentPath);

        for (const item of contents) {
          if (item.type === 'file' && item.name.endsWith('.md')) {
            gitHubFiles.push({
              path: item.path,
              sha: item.sha,
            });
          } else if (item.type === 'dir') {
            stack.push(item.path);
          }
        }
      }

      const gitHubFileMap = new Map<string, string>();
      gitHubFiles.forEach(file => {
        gitHubFileMap.set(file.path, file.sha);
      });

      // 変更を検出
      const changedFiles: string[] = [];
      const newFiles: string[] = [];
      const deletedFiles: string[] = [];

      // GitHubのファイルをチェック（新規・変更）
      for (const [path, githubSha] of gitHubFileMap) {
        const currentSha = currentFileMap.get(path);
        if (!currentSha) {
          newFiles.push(path);
        } else if (currentSha !== githubSha) {
          changedFiles.push(path);
        }
      }

      // Supabaseのファイルをチェック（削除）
      for (const [path] of currentFileMap) {
        if (!gitHubFileMap.has(path)) {
          deletedFiles.push(path);
        }
      }

      const hasChanges = changedFiles.length > 0 || newFiles.length > 0 || deletedFiles.length > 0;

      return {
        hasChanges,
        changedFiles,
        newFiles,
        deletedFiles,
      };

    } catch (error) {
      console.error('Failed to check for changes:', error);
      throw error;
    }
  }

  async syncRepoToSupabase(
    owner: string,
    repo: string,
    repositoryId: string,
    onProgress?: (message: string, current: number, total: number) => void,
    checkOnly: boolean = false
  ) {
    try {
      // checkOnlyの場合は変更チェックのみ実行
      if (checkOnly) {
        onProgress?.('Checking for changes...', 50, 100);
        const changes = await this.checkForChanges(owner, repo, repositoryId);
        onProgress?.('Check completed!', 100, 100);

        return {
          success: true,
          hasChanges: changes.hasChanges,
          filesUpdated: changes.changedFiles.length,
          filesAdded: changes.newFiles.length,
          filesDeleted: changes.deletedFiles.length,
          changedFiles: changes.changedFiles,
          newFiles: changes.newFiles,
          deletedFiles: changes.deletedFiles,
        };
      }

      onProgress?.('Fetching repository structure...', 0, 100);

      const files: any[] = [];
      const stack = [''];
      let processedCount = 0;

      while (stack.length > 0) {
        const currentPath = stack.pop()!;
        const contents = await this.getRepoContents(owner, repo, currentPath);

        for (const item of contents) {
          if (item.type === 'file' && item.name.endsWith('.md')) {
            const fileContent = await this.getFileContent(owner, repo, item.path);
            files.push({
              repository_id: repositoryId,
              path: item.path,
              name: item.name,
              type: 'file',
              content: fileContent.content,
              github_sha: fileContent.sha,
            });

            processedCount++;
            onProgress?.(`Processing: ${item.path}`, processedCount, processedCount + stack.length);
          } else if (item.type === 'dir') {
            stack.push(item.path);
          }
        }
      }

      onProgress?.('Saving files to database...', 90, 100);

      if (files.length > 0) {
        const { error } = await this.supabase
          .from('files')
          .upsert(files as any, {
            onConflict: 'repository_id,path',
            ignoreDuplicates: false
          });

        if (error) {
          console.error('Failed to save files to Supabase:', error);
          throw error;
        }
      }

      onProgress?.('Sync completed!', 100, 100);

      // 変更統計を取得
      const changes = await this.checkForChanges(owner, repo, repositoryId);

      return {
        success: true,
        filesCount: files.length,
        hasChanges: true, // 実際に同期を実行したので変更あり
        filesUpdated: files.length, // 簡易的に全ファイル数を返す
        filesAdded: 0, // より詳細な統計は将来実装
        filesDeleted: 0,
      };
    } catch (error) {
      console.error('Failed to sync repository:', error);
      throw error;
    }
  }
}

export async function getGitHubClient(userId: string): Promise<GitHubClient | null> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: profile } = await supabase
    .from('profiles')
    .select('github_access_token')
    .eq('id', userId)
    .single();

  if (!profile?.github_access_token) {
    return null;
  }

  return new GitHubClient(profile.github_access_token);
}