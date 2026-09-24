import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db, questions } from '../db';
import { requireAuth, requireAdmin } from '../plugins/auth';
import { parseQuestionInput, updateQuestion, buildQuestionTree } from '../services/questions';

export default async function questionItemRoutes(app: FastifyInstance) {
  app.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const rows = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
    const q = rows[0];
    if (!q) return reply.code(404).send({ error: 'Soru bulunamadı' });
    return { question: await buildQuestionTree(q) };
  });

  app.put('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const rows = await db.select({ id: questions.id }).from(questions).where(eq(questions.id, id)).limit(1);
    if (rows.length === 0) return reply.code(404).send({ error: 'Soru bulunamadı' });
    const parsed = parseQuestionInput(request.body);
    if (!parsed.ok) return reply.code(400).send({ error: parsed.error });
    await updateQuestion(id, parsed.data);
    const updated = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
    if (updated.length === 0) return reply.code(500).send({ error: 'Soru güncellenemedi' });
    return { question: await buildQuestionTree(updated[0]) };
  });

  app.delete('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const rows = await db.select({ id: questions.id }).from(questions).where(eq(questions.id, id)).limit(1);
    if (rows.length === 0) return reply.code(404).send({ error: 'Soru bulunamadı' });
    await db.delete(questions).where(eq(questions.id, id));
    return { ok: true };
  });
}
