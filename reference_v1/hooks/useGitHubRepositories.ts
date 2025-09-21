import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

export const useGitHubRepositories = () => {
  return useQuery<Repository[]>({
    queryKey: ['github-repositories'],
    queryFn: async () => {
      const response = await fetch('/api/github/repos');

      if (!response.ok) {
        const errorText = await response.text();
        console.error('GitHub repos API error:', response.status, errorText);

        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Use HTTP status if JSON parsing fails
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data.repositories;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error.message.includes('401') || error.message.includes('403')) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

export const useSyncRepository = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repository: Repository) => {
      const response = await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repository }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate related queries after successful sync
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
};

export const useCreateRepository = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repoData: { name: string; description?: string; private?: boolean }) => {
      const response = await fetch('/api/github/create-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repoData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Repository creation failed');
      }

      return response.json();
    },
    onSuccess: () => {
      // Refresh repository list after creation
      queryClient.invalidateQueries({ queryKey: ['github-repositories'] });
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
    },
  });
};