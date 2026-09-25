import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, exams, questions } from '../db';
import { requireAuth } from '../plugins/auth';
import { getDueQuestions, checkAnswer, submitAnswer, getStudySettings, saveStudySettings } from '../services/study';
import { buildQuestionTree } from '../services/questions';

const dueQuerySchema = z.object({
  exam_id: z.coerce.number().int().positive(),
});

const settingsSchema = z.object({
  new_cards_per_day: z.number().int().min(0).max(1000),
});

const checkSchema = z.object({
  question_id: z.number().int().positive(),
  selected: z.unknown(),
});

const answerSchema = z.object({
  question_id: z.number().int().positive(),
  rating: z.enum(['again', 'hard', 'good', 'easy']),
  selected: z.unknown(),
});

export default async function studyRoutes(app: FastifyInstance) {
  app.get('/settings', { preHandler: [requireAuth] }, async (request) => {
    return getStudySettings(request.user.id);
  });

  app.put('/settings', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = settingsSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Geçersiz veri' });
    return saveStudySettings(request.user.id, parsed.data.new_cards_per_day);
  });

  app.get('/due', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = dueQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: 'exam_id gerekli' });
    const examId = parsed.data.exam_id;

    const exam = await db.select({ id: exams.id }).from(exams).where(eq(exams.id, examId)).limit(1);
    if (exam.length === 0) return reply.code(404).send({ error: 'Sınav bulunamadı' });

    const dueQuestions = await getDueQuestions(request.user.id, examId);
    return { total_due: dueQuestions.length, questions: dueQuestions };
  });

  app.post('/check', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = checkSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Geçersiz veri' });
    const { question_id, selected } = parsed.data;

    const rows = await db.select().from(questions).where(eq(questions.id, question_id)).limit(1);
    const q = rows[0];
    if (!q) return reply.code(404).send({ error: 'Soru bulunamadı' });

    const result = checkAnswer(await buildQuestionTree(q), selected);
    return { is_correct: result.is_correct, correct_answer: result.correct_answer, explanation: q.explanation };
  });

  app.post('/answer', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = answerSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Geçersiz veri' });
    const { question_id, rating, selected } = parsed.data;

    const rows = await db.select().from(questions).where(eq(questions.id, question_id)).limit(1);
    const q = rows[0];
    if (!q) return reply.code(404).send({ error: 'Soru bulunamadı' });

    const result = await submitAnswer(request.user.id, await buildQuestionTree(q), rating, selected);
    return { is_correct: result.is_correct, correct_answer: result.correct_answer, card: result.card };
  });
}
