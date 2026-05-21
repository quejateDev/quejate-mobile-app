import React from 'react';
import { ErrorState } from '@shared/components/ui/ErrorState';
import { debugLog } from '@core/debug/debugStore';

interface Props {
  children: React.ReactNode;
  message?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    debugLog(
      'err',
      `RENDER CRASH: ${error?.message ?? error} :: ${(info?.componentStack ?? '').slice(0, 200)}`,
    );
  }

  handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          message={
            this.props.message ??
            'Ocurrió un problema al mostrar esta pantalla. Inténtalo de nuevo.'
          }
          onRetry={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}
