import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Log to external service if needed
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Here you could send the error to an external service like Sentry
    // Example: Sentry.captureException(error, { extra: errorInfo });
    console.error("Error logged to service:", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  onRetry: () => void;
  onGoHome: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  onRetry,
  onGoHome,
}) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t("errorBoundary.title", "Something went wrong")}
          </h1>

          <p className="text-muted-foreground mb-6">
            {t(
              "errorBoundary.description",
              "We encountered an unexpected error. Please try again or go back to the home page."
            )}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={onRetry}
              variant="default"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {t("common.retry", "Try Again")}
            </Button>

            <Button
              onClick={onGoHome}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              {t("common.goHome", "Go Home")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook version for functional components
export const useErrorHandler = () => {
  const handleError = (error: Error, errorInfo?: any) => {
    console.error("Error caught by useErrorHandler:", error, errorInfo);

    // Log to external service if needed
    console.error("Error logged to service:", {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  };

  return { handleError };
};
