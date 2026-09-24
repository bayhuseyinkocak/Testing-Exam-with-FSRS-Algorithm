import type { FastifyInstance } from 'fastify';
import { asc, desc, eq } from 'drizzle-orm';
import { db, exams, questions, topics } from '../db';
import { requireAuth, requireAdmin } from '../plugins/auth';
import { parseQuestionInput, insertQuestion, buildQuestionTree } from '../services/questions';
import { parseCsv, parseExcel, parseJsonImport, rowsToQuestions, type QuestionInputLoose } from '../services/importers';

export default async function questionCollectionRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const examId = Number((request.params as { examId: string }).examId);
    const exam = db.select({ id: exams.id }).from(exams).where(eq(exams.id, examId)).get();
    if (!exam) return reply.code(404).send({ error: 'Sınav bulunamadı' });
    const qs = db.select().from(questions).where(eq(questions.exam_id, examId)).orderBy(asc(questions.order), asc(questions.id)).all();
    return { questions: qs.map(buildQuestionTree) };
  });

  app.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const examId = Number((request.params as { examId: string }).examId);
    const exam = db.select({ id: exams.id }).from(exams).where(eq(exams.id, examId)).get();
    if (!exam) return reply.code(404).send({ error: 'Sınav bulunamadı' });
    const parsed = parseQuestionInput(request.body);
    if (!parsed.ok) return reply.code(400).send({ error: parsed.error });
    const data = { ...parsed.data };
    if (data.topic_id != null) {
      const topic = db.select().from(topics).where(eq(topics.id, data.topic_id)).get();
      if (!topic || topic.exam_id !== examId) data.topic_id = null;
    }
    const questionId = insertQuestion(examId, data);
    const created = db.select().from(questions).where(eq(questions.id, questionId)).get();
    if (!created) return reply.code(500).send({ error: 'Soru oluşturulamadı' });
    return reply.code(201).send({ question: buildQuestionTree(created) });
  });

  app.post('/import', { preHandler: [requireAdmin] }, async (request, reply) => {
    const examId = Number((request.params as { examId: string }).examId);
    const exam = db.select({ id: exams.id }).from(exams).where(eq(exams.id, examId)).get();
    if (!exam) return reply.code(404).send({ error: 'Sınav bulunamadı' });

    if (!request.isMultipart()) return reply.code(400).send({ error: 'multipart/form-data bekleniyor' });
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: 'Dosya yüklenmedi' });
    const buffer = await file.toBuffer();
    const filename = (file.filename || '').toLowerCase();
    const ext = filename.includes('.') ? filename.split('.').pop()! : '';

    let looseQuestions: QuestionInputLoose[];
    try {
      if (ext === 'json') {
        looseQuestions = parseJsonImport(buffer.toString('utf-8'));
      } else {
        const rows = ext === 'xlsx' || ext === 'xls' ? await parseExcel(buffer) : parseCsv(buffer.toString('utf-8'));
        const result = rowsToQuestions(rows);
        if (result.error) return reply.code(400).send({ error: result.error });
        looseQuestions = result.questions;
      }
    } catch (e) {
      return reply.code(400).send({ error: 'Dosya okunamadı: ' + (e as Error).message });
    }

    const maxOrderRow = db
      .select({ order: questions.order })
      .from(questions)
      .where(eq(questions.exam_id, examId))
      .orderBy(desc(questions.order))
      .limit(1)
      .get();
    let nextOrder = (maxOrderRow?.order ?? 0) + 1;

    const errors: string[] = [];
    let imported = 0;
    for (const loose of looseQuestions) {
      const parsed = parseQuestionInput(loose);
      if (!parsed.ok) {
        errors.push('Soru #' + (imported + errors.length + 1) + ': ' + parsed.error);
        continue;
      }
      const data = { ...parsed.data, order: parsed.data.order ?? nextOrder };
      if (data.topic_id != null) {
        const topic = db.select().from(topics).where(eq(topics.id, data.topic_id)).get();
        if (!topic || topic.exam_id !== examId) data.topic_id = null;
      }
      insertQuestion(examId, data);
      nextOrder++;
      imported++;
    }
    return { imported, skipped: errors.length, errors };
  });
}
