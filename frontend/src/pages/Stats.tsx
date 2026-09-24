import { useStatsOverview } from '../api/stats';

function pct(v: number | null): string {
  if (v == null) return '—';
  return Math.round(v * 100) + '%';
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-500">{title}</h3>
      {children}
    </div>
  );
}

export default function Stats() {
  const { data, isLoading, isError } = useStatsOverview();

  if (isLoading) return <p className="text-slate-500">Yükleniyor...</p>;
  if (isError || !data) return <p className="text-red-600">İstatistikler yüklenemedi.</p>;

  const maxReviews = Math.max(1, ...data.daily_progress.map((d) => d.reviews));

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-slate-700">İstatistik</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Doğruluk Oranı">
          <div className="text-4xl font-bold text-blue-600">{pct(data.accuracy.overall)}</div>
          <div className="mt-3 space-y-1 text-sm text-slate-500">
            <div className="flex justify-between">
              <span>Son 7 gün</span>
              <span className="font-medium text-slate-700">{pct(data.accuracy.last_7_days)}</span>
            </div>
            <div className="flex justify-between">
              <span>Son 30 gün</span>
              <span className="font-medium text-slate-700">{pct(data.accuracy.last_30_days)}</span>
            </div>
            <div className="flex justify-between">
              <span>Toplam tekrar</span>
              <span className="font-medium text-slate-700">{data.accuracy.total_reviews}</span>
            </div>
            <div className="flex justify-between">
              <span>Doğru cevap</span>
              <span className="font-medium text-slate-700">{data.accuracy.correct_reviews}</span>
            </div>
          </div>
        </Card>

        <Card title="Yaklaşan Tekrarlar">
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-slate-500">Bugün bekleyen</span>
              <span className="text-2xl font-bold text-slate-800">{data.upcoming.due_now}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-slate-500">Yarın</span>
              <span className="text-xl font-semibold text-slate-700">{data.upcoming.due_tomorrow}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-slate-500">Sonraki 7 gün</span>
              <span className="text-xl font-semibold text-slate-700">{data.upcoming.due_next_7_days}</span>
            </div>
          </div>
        </Card>

        <Card title="Kart Durumları">
          <div className="space-y-2">
            {[
              { label: 'Yeni', value: data.cards.new, color: 'bg-slate-400' },
              { label: 'Öğrenme', value: data.cards.learning, color: 'bg-amber-400' },
              { label: 'Tekrar', value: data.cards.review, color: 'bg-green-500' },
              { label: 'Yeniden öğrenme', value: data.cards.relearning, color: 'bg-red-400' },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-2">
                <span className={'h-3 w-3 rounded-full ' + row.color} />
                <span className="flex-1 text-sm text-slate-600">{row.label}</span>
                <span className="text-sm font-semibold text-slate-800">{row.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Card title="Günlük İlerleme (son 14 gün)">
            <div className="flex h-36 items-end gap-1">
              {data.daily_progress.map((d) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={d.date + ': ' + d.reviews + ' tekrar'}>
                  <div
                    className="w-full rounded-t bg-blue-500"
                    style={{ height: Math.max(d.reviews > 0 ? 4 : 1, (d.reviews / maxReviews) * 110) + 'px' }}
                  />
                  <span className="text-[10px] text-slate-400">{d.date.slice(8)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-center text-xs text-slate-400">
              Her çubuk = o günkü tekrar sayısı (son 14 gün)
            </div>
          </Card>
        </div>

        <div>
          <Card title="Sınav Bazlı">
            <div className="space-y-3">
              {data.exams.map((e) => (
                <div key={e.id} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{e.name}</span>
                    {e.due_now > 0 && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {e.due_now} bekleyen
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span>{e.reviewed}/{e.total_questions} çalışıldı</span>
                    <span>Doğruluk: {pct(e.accuracy)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
