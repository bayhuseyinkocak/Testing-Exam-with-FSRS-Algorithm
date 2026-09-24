import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export type User = {
  id: number;
  username: string;
  role: 'admin' | 'user';
  created_at: string;
  review_count: number;
};

export function useUsers() {
  return useQuery<{ users: User[] }>({
    queryKey: ['users'],
    queryFn: () => api('/users'),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { username: string; password: string; role: 'admin' | 'user' }) =>
      api('/users', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api('/users/' + id, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (vars: { id: number; password: string }) =>
      api('/users/' + vars.id + '/password', {
        method: 'PUT',
        body: JSON.stringify({ password: vars.password }),
      }),
  });
}
