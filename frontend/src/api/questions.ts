import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiUpload } from './client';

export type QuestionType = 'single' | 'multiple' | 'true_false' | 'fill_blank';

export type QuestionOption = { id: number; option_text: string; is_correct: boolean; order: number };
export type QuestionStatement = { id: number; statement_text: string; correct_value: boolean };
export type QuestionBlank = { id: number; position: number; options: string[]; correct_index: number };

export type Question = {
  id: number;
  exam_id: number;
  topic_id: number | null;
  type: QuestionType;
  question_text: string;
  explanation: string | null;
  translation: string | null;
  order: number;
  options: QuestionOption[];
  statements: QuestionStatement[];
  blanks: QuestionBlank[];
};

export type QuestionInput = {
  type: QuestionType;
  question_text: string;
  explanation?: string | null;
  translation?: string | null;
  topic_id?: number | null;
  options?: { option_text: string; is_correct: boolean; order?: number }[];
  statements?: { statement_text: string; correct_value: boolean }[];
  blanks?: { position: number; options: string[]; correct_index: number }[];
};

export function useQuestions(examId: number | undefined) {
  return useQuery<{ questions: Question[] }>({
    queryKey: ['questions', examId],
    queryFn: () => api('/exams/' + examId! + '/questions'),
    enabled: examId != null,
  });
}

export function useQuestion(id: number | undefined) {
  return useQuery<{ question: Question }>({
    queryKey: ['question', id],
    queryFn: () => api('/questions/' + id!),
    enabled: id != null,
  });
}

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { examId: number; input: QuestionInput }) =>
      api('/exams/' + vars.examId + '/questions', { method: 'POST', body: JSON.stringify(vars.input) }),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['questions', vars.examId] }),
  });
}

export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; input: QuestionInput }) =>
      api('/questions/' + vars.id, { method: 'PUT', body: JSON.stringify(vars.input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { examId: number; id: number }) =>
      api('/questions/' + vars.id, { method: 'DELETE' }),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['questions', vars.examId] }),
  });
}

export type ImportResult = { imported: number; skipped: number; errors: string[] };

export function useImportQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { examId: number; file: File }) => {
      const formData = new FormData();
      formData.append('file', vars.file);
      return apiUpload<ImportResult>('/exams/' + vars.examId + '/questions/import', formData);
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['questions', vars.examId] }),
  });
}
