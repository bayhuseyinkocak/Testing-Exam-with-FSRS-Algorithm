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
    const list = await db.select().from(exams).orderBy(asc(exams.name));
    const withCounts = await Promise.all(
      list.map(async (e) => {
        const qs = await db.select({ id: questions.id }).from(questions).where(eq(questions.exam_id, e.id));
        return {
          ...e,
          question_count: qs.length,
          due_count: await countDueQuestions(request.user.id, e.id),
        };
      }),
    );
    return { exams: withCounts };
  });

  app.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = examSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Geçersiz veri', details: parsed.error.issues.map((i) => i.message) });
    }
    const data = parsed.data;
    const exists = await db.select({ id: exams.id }).from(exams).where(eq(exams.code, data.code)).limit(1);
    if (exists.length > 0) return reply.code(409).send({ error: 'Bu kod ile bir sınav zaten var' });
    const result = await db
      .insert(exams)
      .values({ name: data.name, code: data.code, description: data.description ?? null })
      .returning({ id: exams.id });
    const id = result[0].id;
    return reply.code(201).send({
      exam: { id, name: data.name, code: data.code, description: data.description ?? null, question_count: 0 },
    });
  });

  app.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const rows = await db.select().from(exams).where(eq(exams.id, id)).limit(1);
    const exam = rows[0];
    if (!exam) return reply.code(404).send({ error: 'Sınav bulunamadı' });
    const topicList = await db.select().from(topics).where(eq(topics.exam_id, id)).orderBy(asc(topics.name));
    return { exam: { ...exam, topics: topicList } };
  });

  app.put('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const rows = await db.select().from(exams).where(eq(exams.id, id)).limit(1);
    if (rows.length === 0) return reply.code(404).send({ error: 'Sınav bulunamadı' });
    const parsed = examSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Geçersiz veri', details: parsed.error.issues.map((i) => i.message) });
    }
    const data = parsed.data;
    const dup = await db.select({ id: exams.id }).from(exams).where(eq(exams.code, data.code)).limit(1);
    if (dup.length > 0 && dup[0].id !== id) return reply.code(409).send({ error: 'Bu kod ile başka bir sınav var' });
    await db.update(exams).set({ name: data.name, code: data.code, description: data.description ?? null }).where(eq(exams.id, id));
    return { exam: { id, name: data.name, code: data.code, description: data.description ?? null } };
  });

  app.delete('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const rows = await db.select({ id: exams.id }).from(exams).where(eq(exams.id, id)).limit(1);
    if (rows.length === 0) return reply.code(404).send({ error: 'Sınav bulunamadı' });
    await db.delete(exams).where(eq(exams.id, id));
    return { ok: true };
  });

  app.get('/:id/export', { preHandler: [requireAuth] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const rows = await db.select().from(exams).where(eq(exams.id, id)).limit(1);
    const exam = rows[0];
    if (!exam) return reply.code(404).send({ error: 'Sınav bulunamadı' });
    const qs = await db.select().from(questions).where(eq(questions.exam_id, id)).orderBy(asc(questions.order), asc(questions.id));
    const topicList = await db.select().from(topics).where(eq(topics.exam_id, id));
    const payload = {
      exported_at: new Date().toISOString(),
      exam: { id: exam.id, name: exam.name, code: exam.code, description: exam.description, topics: topicList },
      questions: await Promise.all(qs.map((q) => buildQuestionTree(q))),
    };
    reply.header('Content-Type', 'application/json; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="' + (exam.code || 'exam') + '-export.json"');
    return payload;
  });
}
