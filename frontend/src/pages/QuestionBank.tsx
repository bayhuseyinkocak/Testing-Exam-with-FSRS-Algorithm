import { useRef, useState, type ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useExam, useExportExam } from '../api/exams';
import { useQuestions, useDeleteQuestion, useImportQuestions } from '../api/questions';

const TYPE_LABELS: Record<string, string> = {
  single: 'Tek Seçim',
  multiple: 'Çoklu Seçim',
  true_false: 'Doğru/Yanlış',
  fill_blank: 'Boşluk Doldurma',
};

export default function QuestionBank() {
  const params = useParams();
  const examId = Number(params.examId);
  const { data: examData } = useExam(examId);
  const { data, isLoading, isError } = useQuestions(examId);
  const deleteQuestion = useDeleteQuestion();
  const importQuestions = useImportQuestions();
  const exportExam = useExportExam();
  const fileRef = useRef<HTMLInputElement>(null);

  const exam = examData?.exam;

  const topicName = (id: number | null): string | null => {
    if (id == null || !exam) return null;
    const t = exam.topics.find((x) => x.id === id);
    return t ? t.name : null;
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importQuestions.mutate({ examId, file });
    e.target.value = '';
  };

  const handleExport = () => {
    if (exam) exportExam.mutate({ id: exam.id, code: exam.code });
  };

  return (
    <div>
      <div className="mb-4">
        <Link to="/exams" className="text-sm text-blue-600 hover:underline">
          ← Sınav Yönetimi
        </Link>
        <h2 className="mt-2 text-xl font-bold text-slate-800">{exam?.name ?? '...'}</h2>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link
          to={'/exams/' + examId + '/questions/new'}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Yeni Soru
        </Link>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50"
        >
          İçe Aktar
        </button>
        <button
          onClick={handleExport}
          className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50"
        >
          Dışa Aktar (JSON)
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json"
          className="hidden"
          onChange={handleFile}
        />
        {importQuestions.isPending && <span className="text-sm text-slate-500">Aktarılıyor...</span>}
        {importQuestions.isSuccess && (
          <span className="text-sm text-green-700">
            {importQuestions.data.imported} soru aktarıldı
            {importQuestions.data.skipped > 0 ? ' (' + importQuestions.data.skipped + ' atlandı)' : ''}
          </span>
        )}
      </div>

      {importQuestions.isError && (
        <p className="mb-3 text-sm text-red-600">{(importQuestions.error as Error).message}</p>
      )}
      {importQuestions.isSuccess && importQuestions.data.errors.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <div className="font-medium">Bazı satırlar atlandı:</div>
          <ul className="mt-1 list-disc pl-5">
            {importQuestions.data.errors.slice(0, 10).map((er, i) => (
              <li key={i}>{er}</li>
            ))}
          </ul>
        </div>
      )}

      {isLoading && <p className="text-slate-500">Yükleniyor...</p>}
      {isError && <p className="text-red-600">Sorular yüklenemedi.</p>}
      {data && data.questions.length === 0 && (
        <p className="text-slate-500">Henüz soru yok. "Yeni Soru" ile ekleyin veya dosya içe aktarın.</p>
      )}

      <div className="space-y-3">
        {data?.questions.map((q) => {
          const topic = topicName(q.topic_id);
          return (
            <div key={q.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    {TYPE_LABELS[q.type] ?? q.type}
                  </span>
                  {topic && <span className="text-xs text-slate-400">Konu: {topic}</span>}
                </div>
                <div className="text-slate-800">{q.question_text}</div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={'/exams/' + examId + '/questions/' + q.id + '/edit'}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  Düzenle
                </Link>
                <button
                  onClick={() => {
                    if (window.confirm('Soru silinsin mi?')) deleteQuestion.mutate({ examId, id: q.id });
                  }}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  Sil
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
