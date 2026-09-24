import type { FastifyInstance } from 'fastify';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, exams, topics } from '../db';
import { requireAuth, requireAdmin } from '../plugins/auth';

const topicSchema = z.object({
  name: z.string().min(1, 'Konu adı boş olamaz').max(200),
});

export default async function topicRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const examId = Number((request.params as { examId: string }).examId);
    const exam = db.select({ id: exams.id }).from(exams).where(eq(exams.id, examId)).get();
    if (!exam) return reply.code(404).send({ error: 'Sınav bulunamadı' });
    const list = db.select().from(topics).where(eq(topics.exam_id, examId)).orderBy(asc(topics.name)).all();
    return { topics: list };
  });

  app.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const examId = Number((request.params as { examId: string }).examId);
    const exam = db.select({ id: exams.id }).from(exams).where(eq(exams.id, examId)).get();
    if (!exam) return reply.code(404).send({ error: 'Sınav bulunamadı' });
    const parsed = topicSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Geçersiz veri', details: parsed.error.issues.map((i) => i.message) });
    const result = db.insert(topics).values({ exam_id: examId, name: parsed.data.name }).run();
    return reply.code(201).send({ topic: { id: Number(result.lastInsertRowid), exam_id: examId, name: parsed.data.name } });
  });

  app.put('/:topicId', { preHandler: [requireAdmin] }, async (request, reply) => {
    const examId = Number((request.params as { examId: string }).examId);
    const topicId = Number((request.params as { topicId: string }).topicId);
    const topic = db.select().from(topics).where(eq(topics.id, topicId)).get();
    if (!topic || topic.exam_id !== examId) return reply.code(404).send({ error: 'Konu bulunamadı' });
    const parsed = topicSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Geçersiz veri', details: parsed.error.issues.map((i) => i.message) });
    db.update(topics).set({ name: parsed.data.name }).where(eq(topics.id, topicId)).run();
    return { topic: { id: topicId, exam_id: examId, name: parsed.data.name } };
  });

  app.delete('/:topicId', { preHandler: [requireAdmin] }, async (request, reply) => {
    const examId = Number((request.params as { examId: string }).examId);
    const topicId = Number((request.params as { topicId: string }).topicId);
    const topic = db.select().from(topics).where(eq(topics.id, topicId)).get();
    if (!topic || topic.exam_id !== examId) return reply.code(404).send({ error: 'Konu bulunamadı' });
    db.delete(topics).where(eq(topics.id, topicId)).run();
    return { ok: true };
  });
}
