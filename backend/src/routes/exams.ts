import type { FastifyInstance } from 'fastify';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, exams, topics, questions } from '../db';
import { requireAuth, requireAdmin } from '../plugins/auth';
import { buildQuestionTree } from '../services/questions';
import { countDueQuestions } from '../services/study';

const examSchema = z.object({
  name: z.string().min(1, 'İsim boş olamaz').max(200),
  code: z.string().min(1, 'Kod boş olamaz').max(50),
  description: z.string().max(2000).optional().nullable(),
});

export default async function examRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [requireAuth] }, async (request) => {
    const list = db.select().from(exams).orderBy(asc(exams.name)).all();
    const withCounts = list.map((e) => {
      const qs = db.select({ id: questions.id }).from(questions).where(eq(questions.exam_id, e.id)).all();
      return {
        ...e,
        question_count: qs.length,
        due_count: countDueQuestions(request.user.id, e.id),
      };
    });
    return { exams: withCounts };
  });

  app.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = examSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Geçersiz veri', details: parsed.error.issues.map((i) => i.message) });
    }
    const data = parsed.data;
    const exists = db.select({ id: exams.id }).from(exams).where(eq(exams.code, data.code)).get();
    if (exists) return reply.code(409).send({ error: 'Bu kod ile bir sınav zaten var' });
    const result = db.insert(exams).values({ name: data.name, code: data.code, description: data.description ?? null }).run();
    const id = Number(result.lastInsertRowid);
    return reply.code(201).send({
      exam: { id, name: data.name, code: data.code, description: data.description ?? null, question_count: 0 },
    });
  });

  app.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const exam = db.select().from(exams).where(eq(exams.id, id)).get();
    if (!exam) return reply.code(404).send({ error: 'Sınav bulunamadı' });
    const topicList = db.select().from(topics).where(eq(topics.exam_id, id)).orderBy(asc(topics.name)).all();
    return { exam: { ...exam, topics: topicList } };
  });

  app.put('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const exam = db.select().from(exams).where(eq(exams.id, id)).get();
    if (!exam) return reply.code(404).send({ error: 'Sınav bulunamadı' });
    const parsed = examSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Geçersiz veri', details: parsed.error.issues.map((i) => i.message) });
    }
    const data = parsed.data;
    const dup = db.select({ id: exams.id }).from(exams).where(eq(exams.code, data.code)).get();
    if (dup && dup.id !== id) return reply.code(409).send({ error: 'Bu kod ile başka bir sınav var' });
    db.update(exams).set({ name: data.name, code: data.code, description: data.description ?? null }).where(eq(exams.id, id)).run();
    return { exam: { id, name: data.name, code: data.code, description: data.description ?? null } };
  });

  app.delete('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const exam = db.select({ id: exams.id }).from(exams).where(eq(exams.id, id)).get();
    if (!exam) return reply.code(404).send({ error: 'Sınav bulunamadı' });
    db.delete(exams).where(eq(exams.id, id)).run();
    return { ok: true };
  });

  app.get('/:id/export', { preHandler: [requireAuth] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const exam = db.select().from(exams).where(eq(exams.id, id)).get();
    if (!exam) return reply.code(404).send({ error: 'Sınav bulunamadı' });
    const qs = db.select().from(questions).where(eq(questions.exam_id, id)).orderBy(asc(questions.order), asc(questions.id)).all();
    const topicList = db.select().from(topics).where(eq(topics.exam_id, id)).all();
    const payload = {
      exported_at: new Date().toISOString(),
      exam: { id: exam.id, name: exam.name, code: exam.code, description: exam.description, topics: topicList },
      questions: qs.map(buildQuestionTree),
    };
    reply.header('Content-Type', 'application/json; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="' + (exam.code || 'exam') + '-export.json"');
    return payload;
  });
}
