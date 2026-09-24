import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export type Exam = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  question_count?: number;
  due_count?: number;
};

export type Topic = { id: number; exam_id: number; name: string };
export type ExamDetail = Exam & { topics: Topic[] };

export function useExams() {
  return useQuery<{ exams: Exam[] }>({
    queryKey: ['exams'],
    queryFn: () => api('/exams'),
  });
}

export function useExam(id: number | undefined) {
  return useQuery<{ exam: ExamDetail }>({
    queryKey: ['exam', id],
    queryFn: () => api('/exams/' + id!),
    enabled: id != null,
  });
}

export function useTopics(examId: number | undefined) {
  return useQuery<{ topics: Topic[] }>({
    queryKey: ['topics', examId],
    queryFn: () => api('/exams/' + examId! + '/topics'),
    enabled: examId != null,
  });
}

export function useCreateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; code: string; description?: string }) =>
      api('/exams', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  });
}

export function useUpdateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; name: string; code: string; description?: string }) =>
      api('/exams/' + input.id, {
        method: 'PUT',
        body: JSON.stringify({ name: input.name, code: input.code, description: input.description }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  });
}

export function useDeleteExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api('/exams/' + id, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  });
}

export function useCreateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { examId: number; name: string }) =>
      api('/exams/' + input.examId + '/topics', {
        method: 'POST',
        body: JSON.stringify({ name: input.name }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['topics', vars.examId] });
      qc.invalidateQueries({ queryKey: ['exam', vars.examId] });
    },
  });
}

export function useDeleteTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { examId: number; topicId: number }) =>
      api('/exams/' + input.examId + '/topics/' + input.topicId, { method: 'DELETE' }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['topics', vars.examId] });
      qc.invalidateQueries({ queryKey: ['exam', vars.examId] });
    },
  });
}

export function useExportExam() {
  return useMutation({
    mutationFn: async (exam: { id: number; code: string }) => {
      const res = await fetch('/api/exams/' + exam.id + '/export', { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data as { error?: string } | null)?.error ?? 'Dışa aktarma başarısız');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (exam.code || 'exam') + '-export.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  });
}
