import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useExam } from '../api/exams';
import {
  useDueQuestions,
  useCheckAnswer,
  useSubmitAnswer,
  type StudyQuestion,
  type Rating,
  type CheckResponse,
} from '../api/study';

const TYPE_LABELS: Record<string, string> = {
  single: 'Tek Seçim',
  multiple: 'Çoklu Seçim',
  true_false: 'Doğru/Yanlış',
  fill_blank: 'Boşluk Doldurma',
};

type Selection = number | number[] | (boolean | null)[];

function initialSelection(q: StudyQuestion): Selection {
  if (q.type === 'single') return -1;
  if (q.type === 'multiple') return [] as number[];
  if (q.type === 'true_false') return q.statements.map(() => null);
  return q.blanks.map(() => -1);
}

function wireSelected(q: StudyQuestion, sel: Selection): unknown {
  if (q.type === 'single') return typeof sel === 'number' ? sel : -1;
  if (q.type === 'multiple') return Array.isArray(sel) ? sel : [];
  if (q.type === 'true_false') return Array.isArray(sel) ? sel.map((v) => v === true) : [];
  return Array.isArray(sel) ? sel : [];
}

function isAnswered(q: StudyQuestion, sel: Selection): boolean {
  if (q.type === 'single') return typeof sel === 'number' && sel >= 0;
  if (q.type === 'multiple') return Array.isArray(sel) && sel.length >= 1;
  if (q.type === 'true_false') {
    return Array.isArray(sel) && sel.length === q.statements.length && sel.every((v) => v !== null);
  }
  return Array.isArray(sel) && sel.length === q.blanks.length && sel.every((v) => typeof v === 'number' && v >= 0);
}

export default function Study() {
  const params = useParams();
  const examId = Number(params.examId);
  const { data: examData } = useExam(examId);
  const due = useDueQuestions(examId);
  const check = useCheckAnswer();
  const answer = useSubmitAnswer();

  const exam = examData?.exam;
  const questions = due.data?.questions ?? [];
  const [index, setIndex] = useState(0);
  const [selection, setSelection] = useState<Selection>(-1);
  const [feedback, setFeedback] = useState<CheckResponse | null>(null);

  useEffect(() => {
    const q = questions[index];
    setSelection(q ? initialSelection(q) : -1);
    setFeedback(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, due.data]);

  if (due.isLoading) {
    return <p className="text-slate-500">Yükleniyor...</p>;
  }
  if (due.isError) {
    return <p className="text-red-600">Sorular yüklenemedi.</p>;
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <h2 className="mb-2 text-lg font-semibold text-slate-700">Bugünkü tekrarlar tamamlandı</h2>
        <p className="text-slate-500">{exam?.name} için şu an çalışılacak soru yok.</p>
        <div className="mt-4 flex justify-center gap-3">
          <button onClick={() => due.refetch()} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Tekrar Kontrol Et
          </button>
          <Link to="/" className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50">
            Sınav Seçimi
          </Link>
        </div>
      </div>
    );
  }

  if (index >= questions.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <h2 className="mb-2 text-lg font-semibold text-slate-700">Oturum tamamlandı</h2>
        <p className="text-slate-500">Bugünkü tekrarlarını bitirdin. Tebrikler!</p>
        <div className="mt-4 flex justify-center gap-3">
          <button onClick={() => due.refetch()} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Tekrar Kontrol Et
          </button>
          <Link to="/" className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50">
            Sınav Seçimi
          </Link>
        </div>
      </div>
    );
  }

  const q = questions[index];
  const sel = selection;
  const selNum = typeof sel === 'number' ? sel : -1;
  const selArr = Array.isArray(sel) ? sel : [];
  const answered = isAnswered(q, sel);
  const total = questions.length;

  const handleCheck = () => {
    if (!answered) return;
    check.mutate({ question_id: q.id, selected: wireSelected(q, sel) }, { onSuccess: (res) => setFeedback(res) });
  };

  const handleRate = (rating: Rating) => {
    answer.mutate(
      { question_id: q.id, rating, selected: wireSelected(q, sel) },
      {
        onSuccess: () => {
          const nextIndex = index + 1;
          const nextQ = questions[nextIndex];
          setSelection(nextQ ? initialSelection(nextQ) : -1);
          setFeedback(null);
          setIndex(nextIndex);
        },
      },
    );
  };

  const disabled = feedback != null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link to="/" className="text-sm text-blue-600 hover:underline">← Sınav Seçimi</Link>
          <h2 className="mt-1 text-lg font-bold text-slate-800">{exam?.name}</h2>
        </div>
        <div className="text-sm text-slate-500">
          {index + 1} / {total} · Tekrar: {q.card.reps}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {TYPE_LABELS[q.type] ?? q.type}
          </span>
        </div>

        <div className="mb-6 whitespace-pre-wrap text-lg text-slate-800">{q.question_text}</div>

        {q.type === 'single' && (
          <div className="space-y-2">
            {q.options.map((o, i) => (
              <label
                key={o.id}
                className={
                  'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 ' +
                  (feedback != null && o.is_correct ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:bg-slate-50')
                }
              >
                <input
                  type="radio"
                  name="opt"
                  disabled={disabled}
                  checked={selNum === i}
                  onChange={() => setSelection(i)}
                />
                <span>{o.option_text}</span>
              </label>
            ))}
          </div>
        )}

        {q.type === 'multiple' && (
          <div className="space-y-2">
            {q.options.map((o, i) => (
              <label
                key={o.id}
                className={
                  'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 ' +
                  (feedback != null && o.is_correct ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:bg-slate-50')
                }
              >
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={(selArr as number[]).includes(i)}
                  onChange={(e) =>
                    setSelection(
                      e.target.checked
                        ? [...(sel as number[]), i]
                        : (sel as number[]).filter((x) => x !== i),
                    )
                  }
                />
                <span>{o.option_text}</span>
              </label>
            ))}
          </div>
        )}

        {q.type === 'true_false' && (
          <div className="space-y-3">
            {q.statements.map((s, i) => (
              <div
                key={s.id}
                className={
                  'flex items-center justify-between gap-4 rounded-lg border px-4 py-3 ' +
                  (feedback != null && s.correct_value ? 'border-green-400 bg-green-50' : 'border-slate-200')
                }
              >
                <span>{s.statement_text}</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      name={'st-' + i}
                      disabled={disabled}
                      checked={(selArr as (boolean | null)[])[i] === true}
                      onChange={() =>
                        setSelection((sel as (boolean | null)[]).map((v, j) => (j === i ? true : v)))
                      }
                    />
                    Doğru
                  </label>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      name={'st-' + i}
                      disabled={disabled}
                      checked={(selArr as (boolean | null)[])[i] === false}
                      onChange={() =>
                        setSelection((sel as (boolean | null)[]).map((v, j) => (j === i ? false : v)))
                      }
                    />
                    Yanlış
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {q.type === 'fill_blank' && (
          <div className="space-y-4">
            {q.blanks.map((b, i) => (
              <div key={b.id} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-2 text-sm font-semibold text-slate-600">Boşluk {i + 1}</div>
                <div className="space-y-2">
                  {b.options.map((opt, oi) => (
                    <label
                      key={oi}
                      className={
                        'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2 ' +
                        (feedback != null && oi === b.correct_index ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:bg-slate-50')
                      }
                    >
                      <input
                        type="radio"
                        name={'blank-' + i}
                        disabled={disabled}
                        checked={(selArr as number[])[i] === oi}
                        onChange={() =>
                          setSelection((sel as number[]).map((v, j) => (j === i ? oi : v)))
                        }
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {feedback == null ? (
          <div className="mt-6">
            <button
              onClick={handleCheck}
              disabled={!answered || check.isPending}
              className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {check.isPending ? 'Kontrol ediliyor...' : 'Kontrol Et'}
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <div
              className={
                'mb-3 rounded-lg border p-3 text-sm font-medium ' +
                (feedback.is_correct ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-800')
              }
            >
              {feedback.is_correct ? '✓ Doğru!' : '✗ Yanlış'}
              <span className="ml-2 font-normal">Doğru cevap: {feedback.correct_answer}</span>
            </div>

            {feedback.explanation && (
              <div className="mb-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <span className="font-medium">Açıklama:</span> {feedback.explanation}
              </div>
            )}

            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">Bilgi durumunuzu değerlendirin:</span>
              {feedback.is_correct ? (
                <>
                  <button
                    onClick={() => handleRate('good')}
                    disabled={answer.isPending}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    İyi
                  </button>
                  <button
                    onClick={() => handleRate('easy')}
                    disabled={answer.isPending}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Kolay
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleRate('again')}
                  disabled={answer.isPending}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Tekrar (Again)
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
