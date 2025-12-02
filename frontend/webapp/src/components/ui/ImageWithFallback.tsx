import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  placeholder?: React.ReactNode;
  onError?: () => void;
  onLoad?: () => void;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = "w-full h-48 object-cover",
  fallbackClassName = "w-full h-48 flex items-center justify-center bg-secondary/50 text-muted-foreground",
  placeholder,
  onError,
  onLoad,
}) => {
  const { t } = useTranslation();
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  }, [onError]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
  }, []);

  if (hasError) {
    return (
      <div className={fallbackClassName}>
        <div className="text-center p-4">
          <div className="text-lg font-semibold text-foreground mb-2">
            {t("eventDetail.noMediaAvailable")}
          </div>
          <div className="text-xs text-muted-foreground mb-3">
            {t("eventDetail.noMediaDescription")}
          </div>
          <button
            onClick={handleRetry}
            className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && placeholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
          {placeholder}
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${
          isLoading ? "opacity-0" : "opacity-100"
        } transition-opacity duration-300`}
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
};
