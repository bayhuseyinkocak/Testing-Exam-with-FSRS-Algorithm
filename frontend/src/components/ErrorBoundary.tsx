import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
          <div className="w-full max-w-lg rounded-xl border border-red-200 bg-white p-6 text-center">
            <h1 className="mb-2 text-lg font-bold text-red-700">Bir hata oluştu</h1>
            <p className="mb-1 break-words text-sm text-slate-600">{this.state.error.message}</p>
            <pre className="mb-4 max-h-40 overflow-auto rounded bg-slate-50 p-2 text-left text-xs text-slate-500">
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
