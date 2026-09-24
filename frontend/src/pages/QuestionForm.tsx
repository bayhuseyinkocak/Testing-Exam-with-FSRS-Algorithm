import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useExam } from '../api/exams';
import {
  useQuestion,
  useCreateQuestion,
  useUpdateQuestion,
  type QuestionType,
  type QuestionInput,
} from '../api/questions';

type OptionRow = { option_text: string; is_correct: boolean };
type StatementRow = { statement_text: string; correct_value: boolean };
type BlankRow = { options: string[]; correct_index: number };

const TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: 'single', label: 'Tek Seçim' },
  { value: 'multiple', label: 'Çoklu Seçim' },
  { value: 'true_false', label: 'Doğru/Yanlış' },
  { value: 'fill_blank', label: 'Boşluk Doldurma' },
];

function emptyOptions(n: number): OptionRow[] {
  return Array.from({ length: n }, () => ({ option_text: '', is_correct: false }));
}

function defaultsFor(type: QuestionType): { options: OptionRow[]; statements: StatementRow[]; blanks: BlankRow[] } {
  switch (type) {
    case 'single':
    case 'multiple':
      return { options: emptyOptions(4), statements: [], blanks: [] };
    case 'true_false':
      return {
        options: [],
        statements: [
          { statement_text: '', correct_value: false },
          { statement_text: '', correct_value: false },
        ],
        blanks: [],
      };
    case 'fill_blank':
      return { options: [], statements: [], blanks: [{ options: ['', '', '', ''], correct_index: 0 }] };
  }
}

export default function QuestionForm() {
  const params = useParams();
  const navigate = useNavigate();
  const examId = Number(params.examId);
  const questionId = params.questionId ? Number(params.questionId) : undefined;
  const isEdit = questionId != null;

  const { data: examData } = useExam(examId);
  const { data: qData } = useQuestion(questionId);
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();

  const [type, setType] = useState<QuestionType>('single');
  const [questionText, setQuestionText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [topicId, setTopicId] = useState('0');
  const [options, setOptions] = useState<OptionRow[]>(emptyOptions(4));
  const [statements, setStatements] = useState<StatementRow[]>([]);
  const [blanks, setBlanks] = useState<BlankRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !qData) return;
    const q = qData.question;
    setType(q.type);
    setQuestionText(q.question_text);
    setExplanation(q.explanation ?? '');
    setTopicId(q.topic_id != null ? String(q.topic_id) : '0');
    setOptions(q.options.map((o) => ({ option_text: o.option_text, is_correct: o.is_correct })));
    setStatements(q.statements.map((s) => ({ statement_text: s.statement_text, correct_value: s.correct_value })));
    setBlanks(q.blanks.map((b) => ({ options: b.options, correct_index: b.correct_index })));
  }, [isEdit, qData]);

  const changeType = (t: QuestionType) => {
    setType(t);
    const d = defaultsFor(t);
    setOptions(d.options);
    setStatements(d.statements);
    setBlanks(d.blanks);
  };

  const updateOption = (i: number, patch: Partial<OptionRow>) => {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  };
  const addOption = () => setOptions((prev) => [...prev, { option_text: '', is_correct: false }]);
  const removeOption = (i: number) =>
    setOptions((prev) => (prev.length > 2 ? prev.filter((_, idx) => idx !== i) : prev));

  const updateStatement = (i: number, patch: Partial<StatementRow>) => {
    setStatements((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };
  const addStatement = () => setStatements((prev) => [...prev, { statement_text: '', correct_value: false }]);
  const removeStatement = (i: number) =>
    setStatements((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const updateBlank = (i: number, patch: Partial<BlankRow>) => {
    setBlanks((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  };
  const updateBlankOption = (i: number, oi: number, val: string) => {
    setBlanks((prev) =>
      prev.map((b, idx) =>
        idx === i ? { ...b, options: b.options.map((o, j) => (j === oi ? val : o)) } : b,
      ),
    );
  };
  const addBlank = () => setBlanks((prev) => [...prev, { options: ['', '', '', ''], correct_index: 0 }]);
  const removeBlank = (i: number) =>
    setBlanks((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const buildInput = (): QuestionInput => {
    const input: QuestionInput = {
      type,
      question_text: questionText,
      explanation: explanation || null,
      topic_id: topicId === '0' ? null : Number(topicId),
    };
    if (type === 'single' || type === 'multiple') {
      input.options = options.map((o, i) => ({ option_text: o.option_text, is_correct: o.is_correct, order: i }));
    }
    if (type === 'true_false') {
      input.statements = statements.map((s) => ({ statement_text: s.statement_text, correct_value: s.correct_value }));
    }
    if (type === 'fill_blank') {
      input.blanks = blanks.map((b, i) => ({ position: i + 1, options: b.options, correct_index: b.correct_index }));
    }
    return input;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const input = buildInput();
    const opts = {
      onSuccess: () => navigate('/exams/' + examId + '/questions'),
      onError: (err: Error) => setError(err.message),
    };
    if (isEdit) {
      updateQuestion.mutate({ id: questionId!, input }, opts);
    } else {
      createQuestion.mutate({ examId, input }, opts);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <Link to={'/exams/' + examId + '/questions'} className="text-sm text-blue-600 hover:underline">
          ← Soru Bankası
        </Link>
        <h2 className="mt-2 text-xl font-bold text-slate-800">
          {isEdit ? 'Soruyu Düzenle' : 'Yeni Soru'} — {examData?.exam.name}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">Soru Tipi</label>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => changeType(t.value)}
                className={
                  'rounded-lg border px-4 py-2 text-sm ' +
                  (type === t.value
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50')
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Soru Metni</label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            required
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder={type === 'fill_blank' ? 'Boşlukları ___ ile işaretleyin (ör: "Ich ___ Wasser")' : 'Soru metni'}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Açıklama (isteğe bağlı)</label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Konu (isteğe bağlı)</label>
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="0">— Konu yok —</option>
            {examData?.exam.topics.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {(type === 'single' || type === 'multiple') && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Seçenekler {type === 'single' ? '(tam 1 doğru seçin)' : '(1 veya daha fazla doğru seçin)'}
            </label>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-3">
                  {type === 'single' ? (
                    <input
                      type="radio"
                      name="correct"
                      checked={o.is_correct}
                      onChange={() =>
                        setOptions((prev) => prev.map((x, idx) => ({ ...x, is_correct: idx === i })))
                      }
                    />
                  ) : (
                    <input
                      type="checkbox"
                      checked={o.is_correct}
                      onChange={(e) => updateOption(i, { is_correct: e.target.checked })}
                    />
                  )}
                  <input
                    value={o.option_text}
                    onChange={(e) => updateOption(i, { option_text: e.target.value })}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
                    placeholder={'Seçenek ' + (i + 1)}
                  />
                  <button type="button" onClick={() => removeOption(i)} className="text-sm text-red-600">
                    Kaldır
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addOption}
              className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              + Seçenek Ekle
            </button>
          </div>
        )}

        {type === 'true_false' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              İfadeler (her biri için Doğru/Yanlış)
            </label>
            <div className="space-y-2">
              {statements.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input
                    value={s.statement_text}
                    onChange={(e) => updateStatement(i, { statement_text: e.target.value })}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
                    placeholder={'İfade ' + (i + 1)}
                  />
                  <select
                    value={s.correct_value ? 'true' : 'false'}
                    onChange={(e) => updateStatement(i, { correct_value: e.target.value === 'true' })}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="true">Doğru</option>
                    <option value="false">Yanlış</option>
                  </select>
                  <button type="button" onClick={() => removeStatement(i)} className="text-sm text-red-600">
                    Kaldır
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addStatement}
              className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              + İfade Ekle
            </button>
          </div>
        )}

        {type === 'fill_blank' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Boşluklar (soru metnindeki her ___ için bir boşluk, doğru seçeneği işaretleyin)
            </label>
            <div className="space-y-4">
              {blanks.map((b, i) => (
                <div key={i} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600">Boşluk {i + 1}</span>
                    <button type="button" onClick={() => removeBlank(i)} className="text-sm text-red-600">
                      Kaldır
                    </button>
                  </div>
                  <div className="space-y-2">
                    {b.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={'blank-' + i}
                          checked={b.correct_index === oi}
                          onChange={() => updateBlank(i, { correct_index: oi })}
                        />
                        <input
                          value={opt}
                          onChange={(e) => updateBlankOption(i, oi, e.target.value)}
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
                          placeholder={'Seçenek ' + (oi + 1)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addBlank}
              className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              + Boşluk Ekle
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={createQuestion.isPending || updateQuestion.isPending}
            className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isEdit ? 'Kaydet' : 'Oluştur'}
          </button>
          <Link
            to={'/exams/' + examId + '/questions'}
            className="rounded-lg border border-slate-300 px-6 py-2 hover:bg-slate-50"
          >
            Vazgeç
          </Link>
        </div>
      </form>
    </div>
  );
}
