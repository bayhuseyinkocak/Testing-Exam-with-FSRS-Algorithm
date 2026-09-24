import { and, asc, eq } from 'drizzle-orm';
import { FSRS, generatorParameters, Rating, createEmptyCard, type Card, type State, type Grade } from 'ts-fsrs';
import { db, questions, userQuestionFsrs, reviewLogs } from '../db';
import { buildQuestionTree, type QuestionTree } from './questions';

const fsrs = new FSRS(generatorParameters());

const RATING_MAP: Record<string, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
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

export function getDueQuestions(userId: number, examId: number): StudyQuestion[] {
  const now = new Date();
  const qs = db
    .select()
    .from(questions)
    .where(eq(questions.exam_id, examId))
    .orderBy(asc(questions.order), asc(questions.id))
    .all();

  const result: StudyQuestion[] = [];
  for (const q of qs) {
    const row = db
      .select()
      .from(userQuestionFsrs)
      .where(and(eq(userQuestionFsrs.user_id, userId), eq(userQuestionFsrs.question_id, q.id)))
      .get();

    if (!row) {
      const card = createEmptyCard(now);
      result.push({ ...buildQuestionTree(q), card: cardToStudyCard(card) });
    } else if (row.due.getTime() <= now.getTime()) {
      result.push({ ...buildQuestionTree(q), card: cardToStudyCard(rowToCard(row)) });
    }
  }
  return result;
}

export function countDueQuestions(userId: number, examId: number): number {
  const now = new Date();
  const qs = db
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.exam_id, examId))
    .all();
  let count = 0;
  for (const q of qs) {
    const row = db
      .select({ due: userQuestionFsrs.due })
      .from(userQuestionFsrs)
      .where(and(eq(userQuestionFsrs.user_id, userId), eq(userQuestionFsrs.question_id, q.id)))
      .get();
    if (!row) count++;
    else if (row.due.getTime() <= now.getTime()) count++;
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

export function submitAnswer(
  userId: number,
  question: QuestionTree,
  ratingLabel: string,
  selected: unknown,
): AnswerResult {
  const now = new Date();
  const check = checkAnswer(question, selected);
  const rating = RATING_MAP[ratingLabel] ?? Rating.Good;

  const row = db
    .select()
    .from(userQuestionFsrs)
    .where(and(eq(userQuestionFsrs.user_id, userId), eq(userQuestionFsrs.question_id, question.id)))
    .get();

  const card = row ? rowToCard(row) : createEmptyCard(now);
  const result = fsrs.next(card, now, rating);
  const newCard = result.card;

  if (row) {
    db.update(userQuestionFsrs)
      .set(cardToRow(newCard, now))
      .where(eq(userQuestionFsrs.id, row.id))
      .run();
  } else {
    db.insert(userQuestionFsrs)
      .values({ user_id: userId, question_id: question.id, ...cardToRow(newCard, now) })
      .run();
  }

  db.insert(reviewLogs)
    .values({
      user_id: userId,
      question_id: question.id,
      rating: ratingLabel,
      is_correct: check.is_correct,
      selected_options: JSON.stringify(selected),
      answered_at: now,
      new_interval: newCard.scheduled_days,
      new_stability: newCard.stability,
    })
    .run();

  return {
    is_correct: check.is_correct,
    correct_answer: check.correct_answer,
    card: cardToStudyCard(newCard),
  };
}
