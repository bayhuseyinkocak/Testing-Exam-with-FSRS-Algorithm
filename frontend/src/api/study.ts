import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { QuestionType } from './questions';

export type StudyCard = {
  due: string;
  state: number;
  reps: number;
  lapses: number;
  stability: number;
};

export type StudyOption = { id: number; option_text: string; is_correct: boolean; order: number };
export type StudyStatement = { id: number; statement_text: string; correct_value: boolean };
export type StudyBlank = { id: number; position: number; options: string[]; correct_index: number };

export type StudyQuestion = {
  id: number;
  exam_id: number;
  topic_id: number | null;
  type: QuestionType;
  question_text: string;
  explanation: string | null;
  translation: string | null;
  order: number;
  options: StudyOption[];
  statements: StudyStatement[];
  blanks: StudyBlank[];
  card: StudyCard;
};

export type DueResponse = { total_due: number; questions: StudyQuestion[] };
export type CheckResponse = { is_correct: boolean; correct_answer: string; explanation: string | null };
export type AnswerResponse = { is_correct: boolean; correct_answer: string; card: StudyCard };

export type Rating = 'again' | 'hard' | 'good' | 'easy';

export type StudySettings = { new_cards_per_day: number };

export function useDueQuestions(examId: number | undefined) {
  return useQuery<DueResponse>({
    queryKey: ['study', 'due', examId],
    queryFn: () => api('/study/due?exam_id=' + examId!),
    enabled: examId != null,
    // Her girişte taze liste çek (önceki oturumun cevaplanmış kartları görünmesin).
    staleTime: 0,
    gcTime: 0,
  });
}

export function useStudySettings() {
  return useQuery<StudySettings>({
    queryKey: ['study', 'settings'],
    queryFn: () => api('/study/settings'),
  });
}

export function useUpdateStudySettings() {
  return useMutation({
    mutationFn: (vars: StudySettings) =>
      api<StudySettings>('/study/settings', { method: 'PUT', body: JSON.stringify(vars) }),
  });
}

export function useCheckAnswer() {
  return useMutation({
    mutationFn: (vars: { question_id: number; selected: unknown }) =>
      api<CheckResponse>('/study/check', { method: 'POST', body: JSON.stringify(vars) }),
  });
}

export function useSubmitAnswer() {
  return useMutation({
    mutationFn: (vars: { question_id: number; rating: Rating; selected: unknown }) =>
      api<AnswerResponse>('/study/answer', { method: 'POST', body: JSON.stringify(vars) }),
  });
}
