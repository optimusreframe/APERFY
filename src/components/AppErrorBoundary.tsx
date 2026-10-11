import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, Store } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('APERFY route render failed', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-5 py-12 text-foreground">
        <section className="w-full max-w-md rounded-3xl border border-border/70 bg-card p-7 text-center shadow-2xl sm:p-9" role="alert">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Store className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">APERFY</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">No pudimos cargar esta vista</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            La aplicación encontró un problema temporal. Recarga la vista para continuar.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-7 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Recargar APERFY
          </button>
        </section>
      </main>
    );
  }
}
