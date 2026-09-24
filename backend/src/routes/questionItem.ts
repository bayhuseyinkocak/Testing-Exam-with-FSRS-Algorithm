import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db, questions } from '../db';
import { requireAuth, requireAdmin } from '../plugins/auth';
import { parseQuestionInput, updateQuestion, buildQuestionTree } from '../services/questions';

export default async function questionItemRoutes(app: FastifyInstance) {
  app.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const q = db.select().from(questions).where(eq(questions.id, id)).get();
    if (!q) return reply.code(404).send({ error: 'Soru bulunamadı' });
    return { question: buildQuestionTree(q) };
  });

  app.put('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const q = db.select({ id: questions.id }).from(questions).where(eq(questions.id, id)).get();
    if (!q) return reply.code(404).send({ error: 'Soru bulunamadı' });
    const parsed = parseQuestionInput(request.body);
    if (!parsed.ok) return reply.code(400).send({ error: parsed.error });
    updateQuestion(id, parsed.data);
    const updated = db.select().from(questions).where(eq(questions.id, id)).get();
    if (!updated) return reply.code(500).send({ error: 'Soru güncellenemedi' });
    return { question: buildQuestionTree(updated) };
  });

  app.delete('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const q = db.select({ id: questions.id }).from(questions).where(eq(questions.id, id)).get();
    if (!q) return reply.code(404).send({ error: 'Soru bulunamadı' });
    db.delete(questions).where(eq(questions.id, id)).run();
    return { ok: true };
  });
}
