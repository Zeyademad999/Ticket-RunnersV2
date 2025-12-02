import React, { useState, useEffect } from "react";
import { AlertTriangle, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface ServerErrorEvent {
  detail: {
    context: string;
    error: string;
  };
}

interface ServerStatusBannerProps {
  show?: boolean;
  onDismiss?: () => void;
}

export const ServerStatusBanner: React.FC<ServerStatusBannerProps> = ({
  show = false,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const [errorCount, setErrorCount] = useState(0);
  const [lastError, setLastError] = useState<string>("");

  useEffect(() => {
    const handleServerError = (event: CustomEvent<ServerErrorEvent>) => {
      setErrorCount((prev) => prev + 1);
      setLastError(event.detail?.error || "Unknown server error");
    };

    window.addEventListener("server-error", handleServerError as EventListener);

    return () => {
      window.removeEventListener(
        "server-error",
        handleServerError as EventListener
      );
    };
  }, []);

  const handleDismiss = () => {
    onDismiss?.();
  };

  const handleRetry = () => {
    // Trigger a page refresh or specific retry logic
    window.location.reload();
  };

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">
                {t("serverError.title", "Server Error")}
              </p>
              <p className="text-sm opacity-90">
                {errorCount > 1
                  ? t(
                      "serverError.multipleErrors",
                      `Multiple server errors detected (${errorCount})`
                    )
                  : t(
                      "serverError.singleError",
                      "Server is experiencing issues. Some features may not work properly."
                    )}
              </p>
              {lastError && (
                <p className="text-xs opacity-75 mt-1">
                  {t("serverError.lastError", "Last error")}: {lastError}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRetry}
              className="text-destructive-foreground hover:bg-destructive-foreground/20"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {t("common.retry", "Retry")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-destructive-foreground hover:bg-destructive-foreground/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
