import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';

interface FileItem {
  id: string;
  repository_id: string;
  path: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  github_sha?: string;
  created_at: string;
  updated_at: string;
}

interface Repository {
  id: string;
  github_repo_id?: number;
  owner: string;
  name: string;
  full_name: string;
}

export const useFiles = (selectedRepository: Repository | null) => {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const fetchFiles = async () => {
    if (!selectedRepository) {
      return [];
    }

    // Get repository from database
    let repositories = null;

    // Try GitHub ID first
    const githubIdResult = await supabase
      .from('repositories')
      .select('*')
      .eq('github_repo_id', selectedRepository.id);

    if (githubIdResult.data && githubIdResult.data.length > 0) {
      repositories = githubIdResult.data;
    } else {
      // Fallback to Supabase ID
      const supabaseIdResult = await supabase
        .from('repositories')
        .select('*')
        .eq('id', selectedRepository.id);

      repositories = supabaseIdResult.data;
    }

    if (!repositories || repositories.length === 0) {
      return [];
    }

    const repository = repositories[0];

    // Fetch files for this repository
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('repository_id', repository.id)
      .order('type', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  };

  return useQuery<FileItem[]>({
    queryKey: ['files', selectedRepository?.id],
    queryFn: fetchFiles,
    enabled: !!selectedRepository,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useFileContent = (fileId: string | null) => {
  const supabase = createClient();

  return useQuery({
    queryKey: ['file-content', fileId],
    queryFn: async () => {
      if (!fileId) return null;

      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!fileId,
  });
};

export const useUpdateFile = () => {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { data, error } = await supabase
        .from('files')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch file queries
      queryClient.invalidateQueries({ queryKey: ['file-content', data.id] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
};

export const useCreateFile = () => {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: Omit<FileItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('files')
        .insert(file)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
};

export const useDeleteFile = () => {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
};