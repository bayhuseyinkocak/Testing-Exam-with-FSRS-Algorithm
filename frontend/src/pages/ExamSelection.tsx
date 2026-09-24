import { useNavigate } from 'react-router-dom';
import { useExams } from '../api/exams';

export default function ExamSelection() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useExams();

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-slate-700">
        Çalışmak istediğiniz sınavı seçin
      </h2>

      {isLoading && <p className="text-slate-500">Yükleniyor...</p>}
      {isError && <p className="text-red-600">Sınavlar yüklenemedi.</p>}
      {data && data.exams.length === 0 && (
        <p className="text-slate-500">Henüz sınav eklenmemiş.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {data?.exams.map((exam) => (
          <button
            key={exam.id}
            onClick={() => navigate('/study/' + exam.id)}
            className="rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-blue-400 hover:shadow"
          >
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-400">
              <span>{exam.code}</span>
              {exam.due_count != null && exam.due_count > 0 && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  {exam.due_count} bekleyen
                </span>
              )}
            </div>
            <div className="text-lg font-semibold text-slate-800">{exam.name}</div>
            {exam.description && (
              <div className="mt-1 text-sm text-slate-500">{exam.description}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
