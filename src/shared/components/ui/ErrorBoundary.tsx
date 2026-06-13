import React from 'react';
import { ErrorState } from '@shared/components/ui/ErrorState';

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
