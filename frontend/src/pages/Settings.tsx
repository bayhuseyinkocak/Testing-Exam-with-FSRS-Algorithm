import { useEffect, useState } from 'react';
import { useStudySettings, useUpdateStudySettings } from '../api/study';

export default function Settings() {
  const { data, isLoading } = useStudySettings();
  const update = useUpdateStudySettings();
  const [value, setValue] = useState<string>('20');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data != null) setValue(String(data.new_cards_per_day));
  }, [data]);

  const handleSave = () => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n > 1000) return;
    setSaved(false);
    update.mutate(
      { new_cards_per_day: n },
      { onSuccess: () => setSaved(true) },
    );
  };

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-slate-700">Ayarlar</h2>
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Günlük yeni kart limiti
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={1000}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleSave}
            disabled={update.isPending || isLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {update.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Bir günde ilk kez çalışılacak soru sayısı. <strong>0</strong> = sınırsız. Süresi gelen tekrarlar
          her zaman gösterilir, bu limitten etkilenmez.
        </p>
        {saved && <p className="mt-2 text-sm text-green-600">Kaydedildi ✓</p>}
        {update.isError && (
          <p className="mt-2 text-sm text-red-600">{(update.error as Error).message}</p>
        )}
      </div>
    </div>
  );
}
