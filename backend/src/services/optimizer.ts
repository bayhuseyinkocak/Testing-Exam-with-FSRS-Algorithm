import { FSRSAlgorithm, generatorParameters, Rating, type Grade } from 'ts-fsrs';
import { asc, eq } from 'drizzle-orm';
import { db, reviewLogs, fsrsParams } from '../db';

const RATING_MAP: Record<string, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

// ts-fsrs CLAMP_PARAMETERS(2, true) karşılığı (her w[i] için [min, max])
const CLIP: [number, number][] = [
  [1e-3, 100], [1e-3, 100], [1e-3, 100], [1e-3, 100],
  [1, 10], [1e-3, 4], [1e-3, 4], [1e-3, 0.75],
  [0, 4.5], [0, 0.8], [1e-3, 3.5], [1e-3, 5],
  [1e-3, 0.25], [1e-3, 0.9], [0, 4], [0, 1],
  [1, 6], [0, 2], [0, 2], [0.01, 0.8], [0.1, 0.8],
];

// Resmi FSRS önerisi binlerce tekrar; bu eşiğin altında kişiselleştirme güvenilir değil.
export const MIN_REVIEWS_FOR_OPTIMIZE = 400;

export type ReviewPoint = { rating: Grade; days: number };
export type ReviewSequence = { reviews: ReviewPoint[] };

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function defaultW(): number[] {
  return [...generatorParameters().w];
}

function makeAlgorithm(w: number[]): FSRSAlgorithm {
  const params = generatorParameters();
  params.w = w;
  return new FSRSAlgorithm(params);
}

// Tek bir sekans için ileri geçiş; ortalama ikili cross-entropy kaybı döner.
function forwardLoss(w: number[], seqs: ReviewSequence[]): number {
  const algo = makeAlgorithm(w);
  let loss = 0;
  let n = 0;
  for (const seq of seqs) {
    if (seq.reviews.length < 2) continue;
    const first = seq.reviews[0];
    let S = algo.init_stability(first.rating);
    let D = algo.init_difficulty(first.rating);
    for (let i = 1; i < seq.reviews.length; i++) {
      const rv = seq.reviews[i];
      const R = clamp(algo.forgetting_curve(rv.days, S), 1e-6, 1 - 1e-6);
      loss += rv.rating === Rating.Again ? -Math.log(1 - R) : -Math.log(R);
      n++;
      S =
        rv.rating === Rating.Again
          ? algo.next_forget_stability(D, S, R)
          : algo.next_recall_stability(D, S, R, rv.rating);
      D = algo.next_difficulty(D, rv.rating);
    }
  }
  return n > 0 ? loss / n : 0;
}

export function optimizeW(seqs: ReviewSequence[], iterations = 40): number[] {
  let w = defaultW();
  let lr = 0.05;
  const eps = 1e-3;
  for (let it = 0; it < iterations; it++) {
    const grad = new Array<number>(w.length).fill(0);
    for (let i = 0; i < w.length; i++) {
      const wp = [...w];
      wp[i] += eps;
      const wm = [...w];
      wm[i] -= eps;
      grad[i] = (forwardLoss(wp, seqs) - forwardLoss(wm, seqs)) / (2 * eps);
    }
    for (let i = 0; i < w.length; i++) {
      w[i] = clamp(w[i] - lr * grad[i], CLIP[i][0], CLIP[i][1]);
    }
    lr *= 0.96;
  }
  return w;
}

// review_logs'tan kart başına (rating, gün aralığı) sekanslarını çıkar.
export function buildSequences(
  rows: { question_id: number; rating: string; answered_at: Date }[],
): ReviewSequence[] {
  const groups = new Map<number, { answered_at: Date; rating: Grade }[]>();
  for (const r of rows) {
    const g = RATING_MAP[r.rating];
    if (g == null) continue;
    if (!groups.has(r.question_id)) groups.set(r.question_id, []);
    groups.get(r.question_id)!.push({ answered_at: r.answered_at, rating: g });
  }
  const seqs: ReviewSequence[] = [];
  for (const list of groups.values()) {
    list.sort((a, b) => a.answered_at.getTime() - b.answered_at.getTime());
    const reviews: ReviewPoint[] = [];
    for (let i = 0; i < list.length; i++) {
      const days =
        i === 0
          ? 0
          : (list[i].answered_at.getTime() - list[i - 1].answered_at.getTime()) / 86400000;
      reviews.push({ rating: list[i].rating, days });
    }
    seqs.push({ reviews });
  }
  return seqs;
}

export type OptimizeResult = {
  review_count: number;
  optimized: boolean;
  w?: number[];
  error?: string;
};

export async function optimizeForUser(userId: number): Promise<OptimizeResult> {
  const rows = await db
    .select({
      question_id: reviewLogs.question_id,
      rating: reviewLogs.rating,
      answered_at: reviewLogs.answered_at,
    })
    .from(reviewLogs)
    .where(eq(reviewLogs.user_id, userId))
    .orderBy(asc(reviewLogs.answered_at));

  if (rows.length < MIN_REVIEWS_FOR_OPTIMIZE) {
    return {
      review_count: rows.length,
      optimized: false,
      error: 'Optimizasyon için en az ' + MIN_REVIEWS_FOR_OPTIMIZE + ' tekrar gerekli',
    };
  }

  const seqs = buildSequences(rows);

  // Kart bazlı %80 eğitim / %20 test ayrımı; sadece test kümesinde gerçekten iyileşiyorsa kaydet.
  const testSeqs = seqs.filter((_, i) => i % 5 === 0);
  const trainSeqs = seqs.filter((_, i) => i % 5 !== 0);
  if (trainSeqs.length < 2) {
    return { review_count: rows.length, optimized: false, error: 'Yeterli eğitim verisi yok' };
  }

  const w = optimizeW(trainSeqs);
  const baselineLoss = forwardLoss(defaultW(), testSeqs);
  const optimizedLoss = forwardLoss(w, testSeqs);

  if (!(optimizedLoss < baselineLoss)) {
    return {
      review_count: rows.length,
      optimized: false,
      error: 'Optimizasyon varsayılan parametrelerden daha iyi sonuç vermedi; parametreler korundu',
    };
  }

  await db
    .insert(fsrsParams)
    .values({
      user_id: userId,
      w_json: JSON.stringify(w),
      review_count: rows.length,
    })
    .onConflictDoUpdate({
      target: fsrsParams.user_id,
      set: { w_json: JSON.stringify(w), review_count: rows.length },
    });

  return { review_count: rows.length, optimized: true, w };
}

// Kişisel parametreleri siler (varsayılan FSRS parametrelerine dönüş).
export async function resetUserParams(userId: number): Promise<number> {
  const deleted = await db
    .delete(fsrsParams)
    .where(eq(fsrsParams.user_id, userId))
    .returning({ user_id: fsrsParams.user_id });
  return deleted.length;
}

export async function getUserW(userId: number): Promise<number[] | null> {
  const rows = await db.select().from(fsrsParams).where(eq(fsrsParams.user_id, userId)).limit(1);
  const row = rows[0];
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.w_json);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed.map(Number) : null;
  } catch {
    return null;
  }
}
