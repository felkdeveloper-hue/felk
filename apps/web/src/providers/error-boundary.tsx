import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorLayout } from '@/layouts';
import { env } from '@/config';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level React error boundary. Catches render-time errors that escape
 * route-level boundaries and renders the shared `ErrorLayout` instead of a
 * blank white screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (env.isDev) {
      console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
    }
  }

  private handleReset = (): void => {
    this.setState({ error: null });
    window.location.assign('/');
  };

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <ErrorLayout
          title="Something went wrong"
          description={
            env.isDev
              ? this.state.error.message
              : 'We hit an unexpected error. Please try again, and if it keeps happening, let us know.'
          }
          onRetry={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
