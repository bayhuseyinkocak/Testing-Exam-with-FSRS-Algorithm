import { asc, eq } from 'drizzle-orm';
import { db, exams, questions, reviewLogs, userQuestionFsrs } from '../db';

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function accuracyOf(logs: { is_correct: boolean }[]): number | null {
  if (logs.length === 0) return null;
  const correct = logs.filter((l) => l.is_correct).length;
  return Math.round((correct / logs.length) * 1000) / 1000;
}

export async function getOverview(userId: number) {
  const now = new Date();
  const DAY = 24 * 60 * 60 * 1000;

  const examsList = await db.select().from(exams).orderBy(asc(exams.name));
  const qs = await db.select({ id: questions.id, exam_id: questions.exam_id }).from(questions);
  const logs = await db.select().from(reviewLogs).where(eq(reviewLogs.user_id, userId));
  const cards = await db.select().from(userQuestionFsrs).where(eq(userQuestionFsrs.user_id, userId));

  const cardQuestionIds = new Set(cards.map((c) => c.question_id));
  const examQuestionCount = new Map<number, number>();
  for (const q of qs) {
    examQuestionCount.set(q.exam_id, (examQuestionCount.get(q.exam_id) ?? 0) + 1);
  }

  const totalReviews = logs.length;
  const correctReviews = logs.filter((l) => l.is_correct).length;
  const cutoff7 = now.getTime() - 7 * DAY;
  const cutoff30 = now.getTime() - 30 * DAY;
  const last7 = logs.filter((l) => l.answered_at.getTime() >= cutoff7);
  const last30 = logs.filter((l) => l.answered_at.getTime() >= cutoff30);

  const daily_progress: { date: string; reviews: number; correct: number }[] = [];
  for (let d = 13; d >= 0; d--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d, 0, 0, 0, 0);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d + 1, 0, 0, 0, 0);
    const dayLogs = logs.filter((l) => {
      const t = l.answered_at.getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    });
    daily_progress.push({
      date: localDateKey(dayStart),
      reviews: dayLogs.length,
      correct: dayLogs.filter((l) => l.is_correct).length,
    });
  }

  const newCount = qs.filter((q) => !cardQuestionIds.has(q.id)).length;
  const dueNowCards = cards.filter((c) => c.due.getTime() <= now.getTime()).length;
  const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0, 0);
  const weekEnd = now.getTime() + 7 * DAY;
  const dueTomorrow = cards.filter((c) => c.due.getTime() > now.getTime() && c.due.getTime() < tomorrowEnd.getTime()).length;
  const dueNext7 = cards.filter((c) => c.due.getTime() > now.getTime() && c.due.getTime() <= weekEnd).length;

  let learning = 0;
  let review = 0;
  let relearning = 0;
  for (const c of cards) {
    if (c.state === 1) learning++;
    else if (c.state === 2) review++;
    else if (c.state === 3) relearning++;
  }

  const examsStats = examsList.map((e) => {
    const total = examQuestionCount.get(e.id) ?? 0;
    const examQuestionIds = new Set(qs.filter((q) => q.exam_id === e.id).map((q) => q.id));
    const examLogs = logs.filter((l) => examQuestionIds.has(l.question_id));
    const reviewed = new Set(cards.filter((c) => examQuestionIds.has(c.question_id)).map((c) => c.question_id)).size;
    const dueExam =
      cards.filter((c) => examQuestionIds.has(c.question_id) && c.due.getTime() <= now.getTime()).length +
      qs.filter((q) => q.exam_id === e.id && !cardQuestionIds.has(q.id)).length;
    return {
      id: e.id,
      name: e.name,
      code: e.code,
      total_questions: total,
      reviewed,
      due_now: dueExam,
      accuracy: accuracyOf(examLogs),
    };
  });

  return {
    accuracy: {
      overall: accuracyOf(logs),
      total_reviews: totalReviews,
      correct_reviews: correctReviews,
      last_7_days: accuracyOf(last7),
      last_30_days: accuracyOf(last30),
    },
    daily_progress,
    upcoming: {
      due_now: dueNowCards + newCount,
      due_tomorrow: dueTomorrow,
      due_next_7_days: dueNext7,
    },
    cards: {
      new: newCount,
      learning,
      review,
      relearning,
    },
    exams: examsStats,
  };
}
