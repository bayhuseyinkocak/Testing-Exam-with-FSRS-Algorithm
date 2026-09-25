import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from './client';

export type StatsOverview = {
  accuracy: {
    overall: number | null;
    total_reviews: number;
    correct_reviews: number;
    last_7_days: number | null;
    last_30_days: number | null;
  };
  daily_progress: { date: string; reviews: number; correct: number }[];
  upcoming: { due_now: number; due_tomorrow: number; due_next_7_days: number };
  cards: { new: number; learning: number; review: number; relearning: number };
  exams: {
    id: number;
    name: string;
    code: string;
    total_questions: number;
    reviewed: number;
    due_now: number;
    accuracy: number | null;
  }[];
};

export function useStatsOverview() {
  return useQuery<StatsOverview>({
    queryKey: ['stats', 'overview'],
    queryFn: () => api('/stats/overview'),
  });
}

export type OptimizeResult = {
  user_id: number;
  username: string;
  review_count: number;
  optimized: boolean;
  error: string | null;
};

export function useOptimizeFsrs() {
  return useMutation({
    mutationFn: () => api<{ results: OptimizeResult[] }>('/stats/optimize', { method: 'POST' }),
  });
}

export function useResetFsrs() {
  return useMutation({
    mutationFn: () => api<{ reset: number }>('/stats/optimize/reset', { method: 'POST' }),
  });
}
