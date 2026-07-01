import { Component, type ReactNode } from 'react';
import { ErrorState } from './EmptyState';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ClaimGuard Error Boundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <ErrorState
            title="Component error"
            description="This section encountered an unexpected error and could not be displayed."
            onRetry={() => this.setState({ hasError: false })}
          />
        )
      );
    }
    return this.props.children;
  }
}
