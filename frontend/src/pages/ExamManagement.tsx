import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useExams,
  useTopics,
  useCreateExam,
  useUpdateExam,
  useDeleteExam,
  useCreateTopic,
  useDeleteTopic,
} from '../api/exams';

type ExamFormValues = { name: string; code: string; description: string };

function ExamForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: ExamFormValues;
  onSubmit: (data: ExamFormValues) => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, code, description });
      }}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-600">İsim</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>
      <div className="w-32">
        <label className="mb-1 block text-sm font-medium text-slate-600">Kod</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-600">Açıklama</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50">
            Vazgeç
          </button>
        )}
      </div>
    </form>
  );
}

function TopicManager({ examId }: { examId: number }) {
  const { data, isLoading } = useTopics(examId);
  const createTopic = useCreateTopic();
  const deleteTopic = useDeleteTopic();
  const [name, setName] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    createTopic.mutate({ examId, name: name.trim() }, { onSuccess: () => setName('') });
  };

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 text-sm font-semibold text-slate-600">Konular</div>
      {isLoading && <p className="text-sm text-slate-400">Yükleniyor...</p>}
      {data && data.topics.length === 0 && <p className="text-sm text-slate-400">Henüz konu yok.</p>}
      <ul className="mb-3 space-y-1">
        {data?.topics.map((t) => (
          <li key={t.id} className="flex items-center justify-between text-sm">
            <span>{t.name}</span>
            <button
              onClick={() => deleteTopic.mutate({ examId, topicId: t.id })}
              className="text-red-600 hover:underline"
            >
              Sil
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Yeni konu adı"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
        <button
          onClick={handleAdd}
          className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
        >
          Ekle
        </button>
      </div>
    </div>
  );
}

export default function ExamManagement() {
  const { data, isLoading, isError } = useExams();
  const createExam = useCreateExam();
  const updateExam = useUpdateExam();
  const deleteExam = useDeleteExam();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [topicsFor, setTopicsFor] = useState<number | null>(null);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-700">Sınav Yönetimi</h2>
        <button
          onClick={() => {
            setShowCreate((v) => !v);
            setEditingId(null);
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          {showCreate ? 'Vazgeç' : 'Yeni Sınav'}
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <ExamForm
            key="create"
            submitLabel="Oluştur"
            onCancel={() => setShowCreate(false)}
            onSubmit={(d) => createExam.mutate(d, { onSuccess: () => setShowCreate(false) })}
          />
          {createExam.isError && (
            <p className="mt-2 text-sm text-red-600">{(createExam.error as Error).message}</p>
          )}
        </div>
      )}

      {isLoading && <p className="text-slate-500">Yükleniyor...</p>}
      {isError && <p className="text-red-600">Sınavlar yüklenemedi.</p>}

      <div className="space-y-4">
        {data?.exams.map((exam) => (
          <div key={exam.id} className="rounded-xl border border-slate-200 bg-white p-4">
            {editingId === exam.id ? (
              <ExamForm
                key={'edit-' + exam.id}
                initial={{ name: exam.name, code: exam.code, description: exam.description ?? '' }}
                submitLabel="Kaydet"
                onCancel={() => setEditingId(null)}
                onSubmit={(d) =>
                  updateExam.mutate({ id: exam.id, ...d }, { onSuccess: () => setEditingId(null) })
                }
              />
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-400">{exam.code}</span>
                    <span className="text-lg font-semibold text-slate-800">{exam.name}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {exam.question_count ?? 0} soru
                    </span>
                  </div>
                  {exam.description && (
                    <div className="mt-1 text-sm text-slate-500">{exam.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={'/exams/' + exam.id + '/questions'}
                    className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100"
                  >
                    Sorular
                  </Link>
                  <button
                    onClick={() => {
                      setEditingId(exam.id);
                      setTopicsFor(null);
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => setTopicsFor(topicsFor === exam.id ? null : exam.id)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    Konular
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Sınav silinsin mi? Tüm soruları da silinecek.')) {
                        deleteExam.mutate(exam.id);
                      }
                    }}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    Sil
                  </button>
                </div>
              </div>
            )}
            {topicsFor === exam.id && <TopicManager examId={exam.id} />}
          </div>
        ))}
      </div>
    </div>
  );
}
