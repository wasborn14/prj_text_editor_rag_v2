"""GitHub API サービス - シンプル版"""
from github import Github
from typing import List, Dict
import os
import base64

class GitHubService:
    def __init__(self):
        token = os.getenv("GITHUB_TOKEN")
        if token and token.strip():
            print("Using GitHub token for authentication")
            self.github = Github(token)
        else:
            print("No GitHub token found, using anonymous access")
            self.github = Github()

    def get_all_markdown_files(self, repo_name: str, path: str = "", depth: int = 0, max_depth: int = 5) -> List[Dict]:
        """
        リポジトリから全ての.mdファイルを再帰的に取得
        """
        if depth > max_depth:
            print(f"Max depth {max_depth} reached for path: {path}")
            return []

        try:
            print(f"Exploring path: {path or 'root'} (depth: {depth})")
            repo = self.github.get_repo(repo_name)
            contents = repo.get_contents(path)
            markdown_files = []

            for content in contents:
                if content.type == "dir":
                    # サブディレクトリを再帰的に探索
                    print(f"Entering directory: {content.path}")
                    sub_files = self.get_all_markdown_files(repo_name, content.path, depth + 1, max_depth)
                    markdown_files.extend(sub_files)

                elif content.name.endswith('.md'):
                    # Markdownファイルを追加
                    try:
                        file_content = base64.b64decode(content.content).decode('utf-8')
                        print(f"Found: {content.path} ({len(file_content)} chars)")

                        markdown_files.append({
                            'path': content.path,
                            'name': content.name,
                            'content': file_content,
                            'sha': content.sha,
                            'directory': os.path.dirname(content.path) if content.path != content.name else "",
                            'depth': content.path.count('/'),
                            'size': len(file_content)
                        })
                    except Exception as file_error:
                        print(f"Error reading file {content.path}: {file_error}")

            return markdown_files

        except Exception as e:
            print(f"Error exploring {path}: {e}")
            return []

    def get_markdown_files(self, repo_name: str, limit: int = 50) -> List[Dict]:
        """
        全階層から.mdファイルを取得（制限付き）
        """
        print(f"Fetching repository: {repo_name}")

        try:
            # 再帰的に全ファイルを取得
            all_files = self.get_all_markdown_files(repo_name)

            # サイズ順でソート（小さいファイルから）
            all_files.sort(key=lambda x: x.get('size', 0))

            # 制限適用
            limited_files = all_files[:limit]

            print(f"Total files found: {len(all_files)}, returning: {len(limited_files)}")

            # ファイル一覧を表示
            for file in limited_files:
                print(f"  - {file['path']} (depth: {file['depth']}, size: {file['size']})")

            return limited_files

        except Exception as e:
            print(f"GitHub error: {e}")
            print(f"Error type: {type(e).__name__}")
            return []