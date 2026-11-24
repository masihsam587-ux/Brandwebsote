import { Component, type ReactNode } from 'react';
import { RefreshCw, Home } from 'lucide-react';
import { normalizeAppError } from '../services/errorHandling';
import { captureAppException } from '../services/sentry';

interface State {
  hasError: boolean;
  referenceId: string | null;
  title: string;
  message: string;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = {
    hasError: false,
    referenceId: null,
    title: 'Something went wrong',
    message:
      'An unexpected interruption occurred while rendering this view. Please retry or return to the storefront.',
  };

  static getDerivedStateFromError(error: Error): State {
    const normalized = normalizeAppError(error, {
      fallbackMessage:
        'An unexpected interruption occurred while rendering this view. Please retry or return to the storefront.',
    });
    return {
      hasError: true,
      referenceId: normalized.referenceId,
      title: normalized.title,
      message: normalized.message,
    };
  }

  componentDidCatch(error: Error) {
    const normalized = normalizeAppError(error);
    captureAppException(error, {
      referenceId: this.state.referenceId || normalized.referenceId,
      kind: normalized.kind,
      status: normalized.status,
      source: 'ErrorBoundary',
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      referenceId: null,
      title: 'Something went wrong',
      message:
        'An unexpected interruption occurred while rendering this view. Please retry or return to the storefront.',
    });
  };

  handleReload = () => {
    this.setState({
      hasError: false,
      referenceId: null,
      title: 'Something went wrong',
      message:
        'An unexpected interruption occurred while rendering this view. Please retry or return to the storefront.',
    });
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="flex min-h-screen items-center justify-center bg-[var(--ca-bg)] px-6 py-16">
          <div className="glass-panel max-w-md rounded-2xl p-8 text-center">
            <p className="text-xs font-medium text-[var(--ca-text-muted)]">
              Cinematic Arts
            </p>
            <h1 className="font-display mt-3 text-3xl font-semibold text-[var(--ca-text)]">
              {this.state.title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--ca-text-muted)]">
              {this.state.message}
            </p>
            {this.state.referenceId && (
              <p className="font-mono-nums mt-4 inline-block rounded-lg bg-[var(--ca-surface-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--ca-text)]">
                Reference ID: {this.state.referenceId}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ca-text)] px-5 py-2.5 text-sm font-medium text-[var(--ca-bg)]"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="btn-press inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--ca-border)] px-5 py-2.5 text-sm font-medium text-[var(--ca-text)] hover:bg-[var(--ca-surface-subtle)]"
              >
                <Home className="h-4 w-4" />
                Return to Storefront
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
