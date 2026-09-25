import { and, asc, eq, inArray } from 'drizzle-orm';
import { FSRS, generatorParameters, Rating, State, createEmptyCard, type Card, type Grade } from 'ts-fsrs';
import { db, questions, userQuestionFsrs, reviewLogs, studySettings } from '../db';
import { buildQuestionTree, type QuestionTree } from './questions';
import { getUserW } from './optimizer';

const fsrs = new FSRS(generatorParameters());

export const DEFAULT_NEW_CARDS_PER_DAY = 20;

const RATING_MAP: Record<string, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const RATING_LABEL: Record<Grade, string> = {
  [Rating.Again]: 'again',
  [Rating.Hard]: 'hard',
  [Rating.Good]: 'good',
  [Rating.Easy]: 'easy',
};

type FsrsRow = typeof userQuestionFsrs.$inferSelect;

export type StudyCard = {
  due: string;
  state: number;
  reps: number;
  lapses: number;
  stability: number;
};

export type StudyQuestion = QuestionTree & { card: StudyCard };

export type StudySettings = { new_cards_per_day: number };

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function rowToCard(row: FsrsRow): Card {
  return {
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    learning_steps: row.learning_steps,
    last_review: row.last_review ?? undefined,
  };
}

function cardToRow(card: Card, lastReview: Date) {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    learning_steps: card.learning_steps,
    last_review: lastReview,
  };
}

function cardToStudyCard(card: Card): StudyCard {
  return {
    due: card.due.toISOString(),
    state: card.state,
    reps: card.reps,
    lapses: card.lapses,
    stability: card.stability,
  };
}

export async function getStudySettings(userId: number): Promise<StudySettings> {
  const rows = await db
    .select()
    .from(studySettings)
    .where(eq(studySettings.user_id, userId))
    .limit(1);
  const row = rows[0];
  return { new_cards_per_day: row?.new_cards_per_day ?? DEFAULT_NEW_CARDS_PER_DAY };
}

export async function saveStudySettings(userId: number, newCardsPerDay: number): Promise<StudySettings> {
  await db
    .insert(studySettings)
    .values({ user_id: userId, new_cards_per_day: newCardsPerDay })
    .onConflictDoUpdate({
      target: studySettings.user_id,
      set: { new_cards_per_day: newCardsPerDay, updated_at: new Date() },
    });
  return { new_cards_per_day: newCardsPerDay };
}

// Bugün ilk kez çalışılan (yeni tanıtılan) kart sayısını bulur.
async function countNewCardsIntroducedToday(userId: number, questionIds: number[]): Promise<number> {
  if (questionIds.length === 0) return 0;
  const rows = await db
    .select({ question_id: reviewLogs.question_id, answered_at: reviewLogs.answered_at })
    .from(reviewLogs)
    .where(and(eq(reviewLogs.user_id, userId), inArray(reviewLogs.question_id, questionIds)));

  const firstByQid = new Map<number, number>();
  for (const r of rows) {
    const t = r.answered_at.getTime();
    const prev = firstByQid.get(r.question_id);
    if (prev == null || t < prev) firstByQid.set(r.question_id, t);
  }

  const start = startOfLocalDay(new Date()).getTime();
  let count = 0;
  for (const t of firstByQid.values()) if (t >= start) count++;
  return count;
}

export async function getDueQuestions(userId: number, examId: number): Promise<StudyQuestion[]> {
  const now = new Date();
  const settings = await getStudySettings(userId);
  const qs = await db
    .select()
    .from(questions)
    .where(eq(questions.exam_id, examId))
    .orderBy(asc(questions.order), asc(questions.id));

  const ids = qs.map((q) => q.id);
  const existingRows = ids.length
    ? await db
        .select()
        .from(userQuestionFsrs)
        .where(and(eq(userQuestionFsrs.user_id, userId), inArray(userQuestionFsrs.question_id, ids)))
    : [];
  const rowByQid = new Map(existingRows.map((r) => [r.question_id, r]));

  const newIntroduced = await countNewCardsIntroducedToday(userId, ids);
  const limit = settings.new_cards_per_day;
  // 0 = sınırsız yeni kart.
  let budget = limit === 0 ? Infinity : Math.max(0, limit - newIntroduced);

  const result: StudyQuestion[] = [];
  for (const q of qs) {
    const row = rowByQid.get(q.id);
    if (row) {
      if (row.due.getTime() <= now.getTime()) {
        result.push({ ...(await buildQuestionTree(q)), card: cardToStudyCard(rowToCard(row)) });
      }
    } else if (budget > 0) {
      const card = createEmptyCard(now);
      result.push({ ...(await buildQuestionTree(q)), card: cardToStudyCard(card) });
      budget--;
    }
  }
  return result;
}

export async function countDueQuestions(userId: number, examId: number): Promise<number> {
  const now = new Date();
  const settings = await getStudySettings(userId);
  const qs = await db.select({ id: questions.id }).from(questions).where(eq(questions.exam_id, examId));

  const ids = qs.map((q) => q.id);
  const existingRows = ids.length
    ? await db
        .select({ question_id: userQuestionFsrs.question_id, due: userQuestionFsrs.due })
        .from(userQuestionFsrs)
        .where(and(eq(userQuestionFsrs.user_id, userId), inArray(userQuestionFsrs.question_id, ids)))
    : [];
  const dueByQid = new Map<number, Date>();
  for (const r of existingRows) dueByQid.set(r.question_id, r.due);

  const newIntroduced = await countNewCardsIntroducedToday(userId, ids);
  const limit = settings.new_cards_per_day;
  let budget = limit === 0 ? Infinity : Math.max(0, limit - newIntroduced);

  let count = 0;
  for (const q of qs) {
    const due = dueByQid.get(q.id);
    if (due) {
      if (due.getTime() <= now.getTime()) count++;
    } else if (budget > 0) {
      count++;
      budget--;
    }
  }
  return count;
}

export type CheckResult = { is_correct: boolean; correct_answer: string };

export function checkAnswer(q: QuestionTree, selected: unknown): CheckResult {
  switch (q.type) {
    case 'single': {
      const idx = typeof selected === 'number' ? selected : -1;
      const correct = q.options.findIndex((o) => o.is_correct);
      return {
        is_correct: idx === correct && correct >= 0,
        correct_answer: correct >= 0 ? q.options[correct].option_text : '',
      };
    }
    case 'multiple': {
      const chosen = new Set(Array.isArray(selected) ? selected.map(Number) : []);
      const correctIndices = q.options
        .map((o, i) => (o.is_correct ? i : -1))
        .filter((i) => i >= 0);
      const isCorrect =
        chosen.size === correctIndices.length && correctIndices.every((i) => chosen.has(i));
      return {
        is_correct: isCorrect,
        correct_answer: q.options.filter((o) => o.is_correct).map((o) => o.option_text).join(', '),
      };
    }
    case 'true_false': {
      const values = Array.isArray(selected) ? selected.map((v) => Boolean(v)) : [];
      const isCorrect = q.statements.every((s, i) => values[i] === s.correct_value);
      return {
        is_correct: isCorrect,
        correct_answer: q.statements.map((s) => (s.correct_value ? 'Doğru' : 'Yanlış')).join(', '),
      };
    }
    case 'fill_blank': {
      const indices = Array.isArray(selected) ? selected.map(Number) : [];
      const isCorrect = q.blanks.every((b, i) => indices[i] === b.correct_index);
      return {
        is_correct: isCorrect,
        correct_answer: q.blanks.map((b) => b.options[b.correct_index] ?? '').join(', '),
      };
    }
  }
}

export type AnswerResult = {
  is_correct: boolean;
  correct_answer: string;
  card: StudyCard;
};

export async function submitAnswer(
  userId: number,
  question: QuestionTree,
  ratingLabel: string,
  selected: unknown,
): Promise<AnswerResult> {
  const now = new Date();
  const check = checkAnswer(question, selected);

  let rating = RATING_MAP[ratingLabel] ?? Rating.Good;
  // Sunucu tarafı tutarlılık: doğru cevaba Again, yanlış cevaba Good/Hard/Easy gidemez.
  if (check.is_correct) {
    if (rating === Rating.Again) rating = Rating.Good;
  } else if (rating !== Rating.Again) {
    rating = Rating.Again;
  }

  const rows = await db
    .select()
    .from(userQuestionFsrs)
    .where(and(eq(userQuestionFsrs.user_id, userId), eq(userQuestionFsrs.question_id, question.id)))
    .limit(1);
  const row = rows[0];

  const card = row ? rowToCard(row) : createEmptyCard(now);
  const userW = await getUserW(userId);
  const scheduler = userW ? new FSRS({ ...generatorParameters(), w: userW }) : fsrs;
  const result = scheduler.next(card, now, rating);
  const newCard = result.card;

  // Günlük kartlar (Review) yerel gece yarısında "due" olsun; tekrar saati akşamsa sabah boş görünmesin.
  if (newCard.state === State.Review) {
    newCard.due = startOfLocalDay(newCard.due);
  }

  if (row) {
    await db
      .update(userQuestionFsrs)
      .set(cardToRow(newCard, now))
      .where(eq(userQuestionFsrs.id, row.id));
  } else {
    await db
      .insert(userQuestionFsrs)
      .values({ user_id: userId, question_id: question.id, ...cardToRow(newCard, now) });
  }

  await db.insert(reviewLogs).values({
    user_id: userId,
    question_id: question.id,
    rating: RATING_LABEL[rating] ?? ratingLabel,
    is_correct: check.is_correct,
    selected_options: JSON.stringify(selected),
    answered_at: now,
    new_interval: newCard.scheduled_days,
    new_stability: newCard.stability,
  });

  return {
    is_correct: check.is_correct,
    correct_answer: check.correct_answer,
    card: cardToStudyCard(newCard),
  };
}
