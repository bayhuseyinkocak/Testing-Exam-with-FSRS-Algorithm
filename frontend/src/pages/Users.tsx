import { useState, type FormEvent } from 'react';
import { useUsers, useCreateUser, useDeleteUser, useChangePassword, type User } from '../api/users';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('tr-TR');
}

export default function Users() {
  const { data, isLoading, isError } = useUsers();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const changePassword = useChangePassword();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [error, setError] = useState<string | null>(null);

  const handleChangePassword = (u: User) => {
    const newPassword = window.prompt('Yeni şifre (' + u.username + '):');
    if (!newPassword) return;
    if (newPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalı');
      return;
    }
    setError(null);
    changePassword.mutate(
      { id: u.id, password: newPassword },
      {
        onSuccess: () => {},
        onError: (err) => setError((err as Error).message),
      },
    );
  };

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    createUser.mutate(
      { username, password, role },
      {
        onSuccess: () => {
          setUsername('');
          setPassword('');
          setRole('user');
        },
        onError: (err) => setError((err as Error).message),
      },
    );
  };

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-slate-700">Kullanıcılar</h2>

      <form
        onSubmit={handleCreate}
        className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-600">Kullanıcı adı</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-600">Şifre</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-sm font-medium text-slate-600">Rol</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="user">Kullanıcı</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={createUser.isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {createUser.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
        </button>
      </form>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {isLoading && <p className="text-slate-500">Yükleniyor...</p>}
      {isError && <p className="text-red-600">Kullanıcılar yüklenemedi.</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Kullanıcı</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Tekrar</th>
              <th className="px-4 py-3">Oluşturulma</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {data?.users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-800">{u.username}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      'rounded-full px-2 py-0.5 text-xs font-medium ' +
                      (u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600')
                    }
                  >
                    {u.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{u.review_count}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(u.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => handleChangePassword(u)}
                      className="text-blue-600 hover:underline"
                    >
                      Şifre
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Kullanıcı silinsin mi? Tüm çalışma verileri de silinecek.')) {
                          deleteUser.mutate(u.id);
                        }
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Sil
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
