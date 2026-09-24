import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export type User = { id: number; username: string; role: 'admin' | 'user' };
export type MeResponse = { user: User | null };

export function useMe() {
  return useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => api<MeResponse>('/auth/me'),
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { username: string; password: string }) =>
      api<{ user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.setQueryData(['me'], { user: null });
    },
  });
}
