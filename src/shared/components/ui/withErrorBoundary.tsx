import React from 'react';
import { ErrorBoundary } from '@shared/components/ui/ErrorBoundary';

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  message?: string,
): React.ComponentType<P> {
  function Wrapped(props: P) {
    return (
      <ErrorBoundary message={message}>
        <Component {...props} />
      </ErrorBoundary>
    );
  }
  Wrapped.displayName = `withErrorBoundary(${Component.displayName ?? Component.name ?? 'Screen'})`;
  return Wrapped;
}
