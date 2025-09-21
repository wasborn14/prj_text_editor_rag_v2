import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';

interface Repository {
  id: string;
  user_id: string;
  github_repo_id: number;
  owner: string;
  name: string;
  full_name: string;
  default_branch: string;
  is_active: boolean;
  access_token?: string;
  created_at: string;
  updated_at: string;
}

export const useRepositories = () => {
  const supabase = createClient();

  return useQuery<Repository[]>({
    queryKey: ['repositories'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('repositories')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useActiveRepository = () => {
  const supabase = createClient();

  return useQuery<Repository | null>({
    queryKey: ['active-repository'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('repositories')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        throw error;
      }
      return data || null;
    },
  });
};

export const useSetActiveRepository = () => {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repositoryId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // First, set all repositories to inactive
      await supabase
        .from('repositories')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Then set the selected one as active
      const { data, error } = await supabase
        .from('repositories')
        .update({ is_active: true })
        .eq('id', repositoryId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      queryClient.invalidateQueries({ queryKey: ['active-repository'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
};

export const useCreateRepository = () => {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repository: Omit<Repository, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('repositories')
        .insert(repository)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
    },
  });
};

export const useDeleteRepository = () => {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repositoryId: string) => {
      const { error } = await supabase
        .from('repositories')
        .delete()
        .eq('id', repositoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      queryClient.invalidateQueries({ queryKey: ['active-repository'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
};