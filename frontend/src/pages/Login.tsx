import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useLogin, useMe } from '../api/auth';

export default function Login() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const login = useLogin();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (me?.user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate(
      { username, password },
      { onSuccess: () => navigate('/', { replace: true }) },
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md"
      >
        <h1 className="mb-6 text-2xl font-bold text-slate-800">
          Sertifika Sınavı Çalışma
        </h1>

        <label className="mb-1 block text-sm font-medium text-slate-600">
          Kullanıcı adı
        </label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2"
          required
          autoFocus
        />

        <label className="mb-1 block text-sm font-medium text-slate-600">
          Şifre
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2"
          required
        />

        {login.isError && (
          <p className="mb-3 text-sm text-red-600">
            {(login.error as Error).message}
          </p>
        )}

        <button
          type="submit"
          disabled={login.isPending}
          className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {login.isPending ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  );
}
