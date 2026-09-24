import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import ExamSelection from './pages/ExamSelection';
import ExamManagement from './pages/ExamManagement';
import QuestionBank from './pages/QuestionBank';
import QuestionForm from './pages/QuestionForm';
import Study from './pages/Study';
import Stats from './pages/Stats';
import Users from './pages/Users';
import { useMe } from './api/auth';

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center text-slate-500">
      Yükleniyor...
    </div>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { data, isLoading } = useMe();
  if (isLoading) return <Loading />;
  if (!data?.user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { data, isLoading } = useMe();
  if (isLoading) return <Loading />;
  if (!data?.user) return <Navigate to="/login" replace />;
  if (data.user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route index element={<ExamSelection />} />
          <Route path="exams" element={<RequireAdmin><ExamManagement /></RequireAdmin>} />
          <Route path="exams/:examId/questions" element={<RequireAdmin><QuestionBank /></RequireAdmin>} />
          <Route path="exams/:examId/questions/new" element={<RequireAdmin><QuestionForm /></RequireAdmin>} />
          <Route path="exams/:examId/questions/:questionId/edit" element={<RequireAdmin><QuestionForm /></RequireAdmin>} />
          <Route path="study/:examId" element={<Study />} />
          <Route path="stats" element={<Stats />} />
          <Route path="users" element={<RequireAdmin><Users /></RequireAdmin>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
