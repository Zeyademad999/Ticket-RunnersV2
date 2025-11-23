import React, { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { AlertCircle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ErrorDisplayProps {
  error?: {
    message: string;
    status?: number;
    url?: string;
    method?: string;
  };
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorDisplay({ error, onRetry, onDismiss }: ErrorDisplayProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);

      // Show toast notification for server errors
      if (error.status === 500) {
        toast({
          title: "Server Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  }, [error]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const handleRetry = () => {
    onRetry?.();
    setIsVisible(false);
  };

  if (!isVisible || !error) {
    return null;
  }

  const getErrorTitle = () => {
    if (error.status === 500) {
      return "Server Error";
    } else if (error.status === 404) {
      return "Not Found";
    } else if (error.status === 403) {
      return "Access Denied";
    } else if (error.status === 401) {
      return "Authentication Required";
    } else {
      return "Error";
    }
  };

  const getErrorDescription = () => {
    if (error.status === 500) {
      if (
        error.message.includes("property") &&
        error.message.includes("null")
      ) {
        return "There's a temporary data synchronization issue. This usually resolves itself quickly.";
      } else if (
        error.message.includes("database") ||
        error.message.includes("connection")
      ) {
        return "The server is temporarily unavailable. Please try again in a few moments.";
      } else {
        return "A server error occurred. Our team has been notified and is working to fix this issue.";
      }
    }
    return error.message;
  };

  const shouldShowRetry = error.status === 500 || error.status >= 500;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-800 text-sm font-medium">
                {getErrorTitle()}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

// Global error handler hook
export function useGlobalErrorHandler() {
  const [currentError, setCurrentError] = useState<
    ErrorDisplayProps["error"] | null
  >(null);

  useEffect(() => {
    const handleApiError = (event: CustomEvent) => {
      const error = event.detail;
      if (error && error.status >= 500) {
        setCurrentError({
          message: error.message || "An unexpected error occurred",
          status: error.status,
          url: error.url,
          method: error.method,
        });
      }
    };

    window.addEventListener("api-error", handleApiError as EventListener);

    return () => {
      window.removeEventListener("api-error", handleApiError as EventListener);
    };
  }, []);

  const clearError = () => {
    setCurrentError(null);
  };

  const retryLastAction = () => {
    // This would need to be implemented based on your specific retry logic
    window.location.reload();
  };

  return {
    currentError,
    clearError,
    retryLastAction,
  };
}
