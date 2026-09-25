import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useLogout, useMe } from '../api/auth';

export default function Layout() {
  const { data: me } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const isAdmin = me?.user?.role === 'admin';

  const handleLogout = () => {
    logout.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) });
  };

  const navClass = (active: boolean) =>
    'rounded-md px-3 py-1.5 text-sm font-medium ' +
    (active ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100');

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="text-lg font-bold text-slate-800">
              Sertifika Sınavı
            </NavLink>
            <nav className="flex items-center gap-2">
              <NavLink to="/" end className={({ isActive }) => navClass(isActive)}>
                Sınav Seçimi
              </NavLink>
              <NavLink to="/stats" className={({ isActive }) => navClass(isActive)}>
                İstatistik
              </NavLink>
              <NavLink to="/settings" className={({ isActive }) => navClass(isActive)}>
                Ayarlar
              </NavLink>
              {isAdmin && (
                <NavLink to="/exams" className={({ isActive }) => navClass(isActive)}>
                  Sınav Yönetimi
                </NavLink>
              )}
              {isAdmin && (
                <NavLink to="/users" className={({ isActive }) => navClass(isActive)}>
                  Kullanıcılar
                </NavLink>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{me?.user?.username}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
