import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileCode,
  Settings,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ExportManager,
  ExportOptions,
  ColumnDefinition,
} from "@/lib/exportUtils";

interface ExportDialogProps {
  data: any[];
  columns: ColumnDefinition[];
  title: string;
  subtitle?: string;
  filename: string;
  filters?: Record<string, any>;
  onExport?: (format: string) => void;
  children: React.ReactNode;
  pdfOnly?: boolean;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  data,
  columns,
  title,
  subtitle,
  filename,
  filters,
  onExport,
  children,
  pdfOnly = false,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel" | "csv">(
    pdfOnly ? "pdf" : "excel"
  );
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [includeFilters, setIncludeFilters] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const exportManager = ExportManager.getInstance();

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setExportStatus("idle");
      setProgress(0);
      setIsExporting(false);
    }
  }, [isOpen]);

  const handleExport = async () => {
    if (data.length === 0) {
      setExportStatus("error");
      return;
    }

    setIsExporting(true);
    setProgress(0);
    setExportStatus("idle");

    try {
      const options: ExportOptions = {
        filename,
        title,
        subtitle,
        includeTimestamp: includeTimestamp ?? true,
        includeFilters: includeFilters ?? true,
        filters,
        orientation: exportFormat === "pdf" ? "landscape" : "portrait",
      };

      console.log("Exporting with options:", {
        format: exportFormat,
        includeTimestamp: options.includeTimestamp,
        includeFilters: options.includeFilters,
        dataLength: data.length,
        columnsCount: columns.length,
      });

      if (data.length > 1000) {
        // Use progress tracking for large datasets
        await exportManager.exportWithProgress(
          data,
          columns,
          options,
          exportFormat,
          (progress) => setProgress(progress)
        );
      } else {
        // Direct export for smaller datasets
        switch (exportFormat) {
          case "pdf":
            try {
              await exportManager.exportToPDF(data, columns, options);
            } catch (pdfError) {
              console.error("PDF export failed:", pdfError);
              // Try to provide more specific error messages
              if (pdfError instanceof Error) {
                if (pdfError.message.includes("PDF library not available")) {
                  throw new Error(
                    "PDF generation is not supported in this browser. Please try Excel or CSV export."
                  );
                } else if (
                  pdfError.message.includes("Failed to generate PDF table")
                ) {
                  throw new Error(
                    "The data contains content that cannot be converted to PDF. Please try Excel or CSV export."
                  );
                } else if (
                  pdfError.message.includes("Failed to save PDF file")
                ) {
                  throw new Error(
                    "Unable to save PDF file. Please check your browser settings and try again."
                  );
                }
              }
              throw new Error(
                "PDF export failed. Please try Excel or CSV export instead."
              );
            }
            break;
          case "excel":
            exportManager.exportToExcel(data, columns, options);
            break;
          case "csv":
            exportManager.exportToCSV(data, columns, options);
            break;
        }
      }

      setExportStatus("success");
      onExport?.(exportFormat);

      // Close dialog after a short delay
      setTimeout(() => {
        setIsOpen(false);
        setExportStatus("idle");
      }, 1500);
    } catch (error) {
      console.error("Export failed:", error);
      setExportStatus("error");

      // Show more specific error message to user
      if (error instanceof Error) {
        // The error message will be displayed in the UI
        console.error("Export error details:", error.message);
      }
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "pdf":
        return <FileText className="h-4 w-4" />;
      case "excel":
        return <FileSpreadsheet className="h-4 w-4" />;
      case "csv":
        return <FileCode className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const getFormatLabel = (format: string) => {
    switch (format) {
      case "pdf":
        return t("admin.export.pdf");
      case "excel":
        return t("admin.export.excel");
      case "csv":
        return t("admin.export.csv");
      default:
        return format;
    }
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case "pdf":
        return t("admin.export.pdfDescription");
      case "excel":
        return t("admin.export.excelDescription");
      case "csv":
        return t("admin.export.csvDescription");
      default:
        return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t("admin.export.title")}
          </DialogTitle>
          <DialogDescription>{t("admin.export.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {t("admin.export.format")}
            </Label>
            <RadioGroup
              value={exportFormat}
              onValueChange={(value) =>
                setExportFormat(value as "pdf" | "excel" | "csv")
              }
            >
              {(pdfOnly ? ["pdf"] : ["excel", "pdf", "csv"]).map((format) => (
                <div key={format} className="flex items-center space-x-2">
                  <RadioGroupItem value={format} id={format} />
                  <Label
                    htmlFor={format}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    {getFormatIcon(format)}
                    <div>
                      <div className="font-medium">
                        {getFormatLabel(format)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getFormatDescription(format)}
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {t("admin.export.options")}
            </Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">
                    {t("admin.export.includeTimestamp")}
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    {t("admin.export.includeTimestampDesc")}
                  </div>
                </div>
                <Switch
                  checked={includeTimestamp}
                  onCheckedChange={setIncludeTimestamp}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">
                    {t("admin.export.includeFilters")}
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    {t("admin.export.includeFiltersDesc")}
                  </div>
                </div>
                <Switch
                  checked={includeFilters}
                  onCheckedChange={setIncludeFilters}
                />
              </div>
            </div>
          </div>

          {/* Export Summary */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {t("admin.export.summary")}
            </Label>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t("admin.export.records")}</span>
                <Badge variant="outline">{data.length.toLocaleString()}</Badge>
              </div>
              <div className="flex justify-between">
                <span>{t("admin.export.columns")}</span>
                <Badge variant="outline">{columns.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span>{t("admin.export.format")}</span>
                <Badge variant="outline">{getFormatLabel(exportFormat)}</Badge>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t("admin.export.exporting")}</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <Progress value={progress * 100} className="w-full" />
            </div>
          )}

          {/* Status Messages */}
          {exportStatus === "success" && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">{t("admin.export.success")}</span>
            </div>
          )}
          {exportStatus === "error" && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{t("admin.export.error")}</span>
            </div>
          )}
          
          {/* Debug info - shows current selections */}
          {process.env.NODE_ENV === "development" && (
            <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
              <div>Format: {exportFormat}</div>
              <div>Include Timestamp: {includeTimestamp ? "Yes" : "No"}</div>
              <div>Include Filters: {includeFilters ? "Yes" : "No"}</div>
              <div>Records: {data.length}</div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isExporting}
          >
            {t("admin.export.cancel")}
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || data.length === 0}
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t("admin.export.exporting")}
              </>
            ) : (
              <>
                {getFormatIcon(exportFormat)}
                {t("admin.export.export")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
