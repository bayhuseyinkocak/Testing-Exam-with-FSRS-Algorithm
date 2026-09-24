import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, questions, options, statements, blanks, type Question } from '../db';

// ---------- Zod şemaları ----------
const optionSchema = z.object({
  option_text: z.string().min(1, 'Seçenek metni boş olamaz'),
  is_correct: z.boolean(),
  order: z.number().int().optional(),
});

const statementSchema = z.object({
  statement_text: z.string().min(1, 'İfade metni boş olamaz'),
  correct_value: z.boolean(),
});

const blankSchema = z.object({
  position: z.number().int().min(1),
  options: z.array(z.string().min(1)).min(1),
  correct_index: z.number().int().min(0),
});

export const questionInputSchema = z.object({
  type: z.enum(['single', 'multiple', 'true_false', 'fill_blank']),
  question_text: z.string().min(1, 'Soru metni boş olamaz'),
  explanation: z.string().optional().nullable(),
  translation: z.string().optional().nullable(),
  topic_id: z.number().int().positive().optional().nullable(),
  order: z.number().int().optional(),
  options: z.array(optionSchema).optional(),
  statements: z.array(statementSchema).optional(),
  blanks: z.array(blankSchema).optional(),
});

export type QuestionInput = z.infer<typeof questionInputSchema>;

export type ParseResult =
  | { ok: true; data: QuestionInput }
  | { ok: false; error: string };

export function parseQuestionInput(body: unknown): ParseResult {
  const parsed = questionInputSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues
        .map((i) => (i.path.join('.') || 'genel') + ': ' + i.message)
        .join('; '),
    };
  }
  const data = parsed.data;

  if (data.type === 'single') {
    const opts = data.options ?? [];
    if (opts.length < 2) return { ok: false, error: 'single tipi en az 2 seçenek gerektirir' };
    if (opts.filter((o) => o.is_correct).length !== 1) {
      return { ok: false, error: 'single tipinde tam olarak 1 doğru seçenek olmalı' };
    }
  } else if (data.type === 'multiple') {
    const opts = data.options ?? [];
    if (opts.length < 2) return { ok: false, error: 'multiple tipi en az 2 seçenek gerektirir' };
    if (opts.filter((o) => o.is_correct).length < 1) {
      return { ok: false, error: 'multiple tipinde en az 1 doğru seçenek olmalı' };
    }
  } else if (data.type === 'true_false') {
    const stmts = data.statements ?? [];
    if (stmts.length < 1) return { ok: false, error: 'true_false tipi en az 1 ifade gerektirir' };
  } else if (data.type === 'fill_blank') {
    const blks = data.blanks ?? [];
    if (blks.length < 1) return { ok: false, error: 'fill_blank tipi en az 1 boşluk gerektirir' };
    for (const b of blks) {
      if (b.correct_index < 0 || b.correct_index >= b.options.length) {
        return { ok: false, error: 'Boşluk için doğru seçenek indeksi geçersiz' };
      }
    }
  }
  return { ok: true, data };
}

// ---------- Ağaç (nested) serileştirme ----------
function safeJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export type QuestionTree = {
  id: number;
  exam_id: number;
  topic_id: number | null;
  type: 'single' | 'multiple' | 'true_false' | 'fill_blank';
  question_text: string;
  explanation: string | null;
  translation: string | null;
  order: number;
  options: { id: number; option_text: string; is_correct: boolean; order: number }[];
  statements: { id: number; statement_text: string; correct_value: boolean }[];
  blanks: { id: number; position: number; options: string[]; correct_index: number }[];
};

export function buildQuestionTree(q: Question): QuestionTree {
  const opts = db
    .select()
    .from(options)
    .where(eq(options.question_id, q.id))
    .orderBy(asc(options.order), asc(options.id))
    .all();
  const stmts = db
    .select()
    .from(statements)
    .where(eq(statements.question_id, q.id))
    .orderBy(asc(statements.id))
    .all();
  const blks = db
    .select()
    .from(blanks)
    .where(eq(blanks.question_id, q.id))
    .orderBy(asc(blanks.position))
    .all();

  return {
    id: q.id,
    exam_id: q.exam_id,
    topic_id: q.topic_id,
    type: q.type,
    question_text: q.question_text,
    explanation: q.explanation,
    translation: q.translation,
    order: q.order,
    options: opts.map((o) => ({
      id: o.id,
      option_text: o.option_text,
      is_correct: o.is_correct,
      order: o.order,
    })),
    statements: stmts.map((s) => ({
      id: s.id,
      statement_text: s.statement_text,
      correct_value: s.correct_value,
    })),
    blanks: blks.map((b) => ({
      id: b.id,
      position: b.position,
      options: safeJsonArray(b.options_json),
      correct_index: b.correct_index,
    })),
  };
}

// ---------- Yazma işlemleri ----------
function insertSubEntities(tx: any, questionId: number, data: QuestionInput) {
  if (data.options) {
    data.options.forEach((o, i) => {
      tx.insert(options)
        .values({
          question_id: questionId,
          option_text: o.option_text,
          is_correct: o.is_correct,
          order: o.order ?? i,
        })
        .run();
    });
  }
  if (data.statements) {
    data.statements.forEach((s) => {
      tx.insert(statements)
        .values({
          question_id: questionId,
          statement_text: s.statement_text,
          correct_value: s.correct_value,
        })
        .run();
    });
  }
  if (data.blanks) {
    data.blanks.forEach((b) => {
      tx.insert(blanks)
        .values({
          question_id: questionId,
          position: b.position,
          options_json: JSON.stringify(b.options),
          correct_index: b.correct_index,
        })
        .run();
    });
  }
}

export function insertQuestion(examId: number, data: QuestionInput): number {
  return db.transaction((tx) => {
    const result = tx
      .insert(questions)
      .values({
        exam_id: examId,
        topic_id: data.topic_id ?? null,
        type: data.type,
        question_text: data.question_text,
        explanation: data.explanation ?? null,
        translation: data.translation ?? null,
        order: data.order ?? 0,
      })
      .run();
    const questionId = Number(result.lastInsertRowid);
    insertSubEntities(tx, questionId, data);
    return questionId;
  });
}

export function updateQuestion(questionId: number, data: QuestionInput): void {
  db.transaction((tx) => {
    tx.update(questions)
      .set({
        topic_id: data.topic_id ?? null,
        type: data.type,
        question_text: data.question_text,
        explanation: data.explanation ?? null,
        translation: data.translation ?? null,
        order: data.order ?? 0,
      })
      .where(eq(questions.id, questionId))
      .run();
    tx.delete(options).where(eq(options.question_id, questionId)).run();
    tx.delete(statements).where(eq(statements.question_id, questionId)).run();
    tx.delete(blanks).where(eq(blanks.question_id, questionId)).run();
    insertSubEntities(tx, questionId, data);
  });
}
