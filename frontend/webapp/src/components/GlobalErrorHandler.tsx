import React from 'react';
import { ErrorDisplay, useGlobalErrorHandler } from './ErrorDisplay';

export function GlobalErrorHandler() {
  const { currentError, clearError, retryLastAction } = useGlobalErrorHandler();

  return (
    <ErrorDisplay
      error={currentError}
      onRetry={retryLastAction}
      onDismiss={clearError}
    />
  );
}
