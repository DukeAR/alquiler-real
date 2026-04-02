import React, { ReactNode, ErrorInfo } from 'react';
import { Icons } from './Icons';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.resetError);
      }

      return (
        <div role="alert" className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center p-6">
          <div className="space-y-6 text-center max-w-lg">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
              <Icons.AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Algo salió mal
              </h1>
              <p className="text-slate-600 dark:text-slate-400 font-medium">
                Pasó algo raro. Probá de nuevo.
              </p>
              
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-900/50 text-left">
                  <p className="text-xs font-mono text-red-700 dark:text-red-300 break-words">
                    {this.state.error?.message}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={this.resetError}
              aria-label="Volver a intentar cargar la aplicación"
              className="px-8 py-4 bg-brand text-white rounded-[24px] font-black uppercase tracking-widest text-sm shadow-2xl shadow-brand/30 hover:scale-105 transition-all"
            >
              Probar de nuevo
            </button>

            <button
              onClick={() => window.location.href = '/'}
              aria-label="Ir al inicio de la aplicación"
              className="px-8 py-4 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white rounded-[24px] font-black uppercase tracking-widest text-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
