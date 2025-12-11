import { format } from "date-fns";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

export interface ExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  orientation?: "portrait" | "landscape";
  includeTimestamp?: boolean;
  includeFilters?: boolean;
  filters?: Record<string, any>;
}

export interface ColumnDefinition {
  header: string;
  key: string;
  width?: number;
  formatter?: (value: any) => string;
}

export class ExportManager {
  private static instance: ExportManager;

  private constructor() {}

  public static getInstance(): ExportManager {
    if (!ExportManager.instance) {
      ExportManager.instance = new ExportManager();
    }
    return ExportManager.instance;
  }

  /**
   * Check if PDF export is supported in the current browser
   */
  private isPDFSupported(): boolean {
    try {
      // Check if jsPDF is available
      if (typeof jsPDF === "undefined") {
        console.warn("jsPDF library not loaded");
        return false;
      }

      // Check if we're in a browser environment
      if (typeof window === "undefined") {
        console.warn("Not in browser environment");
        return false;
      }

      // Test basic PDF creation
      const testDoc = new jsPDF();
      testDoc.text("Test", 10, 10);

      // Test if we can create a blob (for file download)
      const testBlob = new Blob(["test"], { type: "application/pdf" });
      if (!testBlob) {
        console.warn("Blob creation not supported");
        return false;
      }

      console.log("PDF export is supported");
      return true;
    } catch (error) {
      console.warn("PDF export not supported:", error);
      return false;
    }
  }

  /**
   * Create a simple PDF without tables as fallback
   */
  private createSimplePDF(
    data: any[],
    columns: ColumnDefinition[],
    options: ExportOptions
  ): void {
    console.log("Creating simple PDF as fallback...");

    const doc = new jsPDF({
      orientation: options.orientation || "portrait",
      unit: "mm",
      format: "a4",
    });

    let yPosition = 20;
    const margin = 20;
    const lineHeight = 8;

    // Add title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(options.title, margin, yPosition);
    yPosition += 15;

    // Add subtitle if provided
    if (options.subtitle) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(options.subtitle, margin, yPosition);
      yPosition += 10;
    }

    // Add timestamp if requested
    if (options.includeTimestamp) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      const timestamp = `Generated on: ${format(
        new Date(),
        "yyyy-MM-dd HH:mm:ss"
      )}`;
      doc.text(timestamp, margin, yPosition);
      yPosition += 8;
    }

    // Add headers
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const headers = columns.map((col) => col.header).join(" | ");
    doc.text(headers, margin, yPosition);
    yPosition += lineHeight;

    // Add data rows
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    data.forEach((row, index) => {
      if (yPosition > 270) {
        // Check if we need a new page
        doc.addPage();
        yPosition = 20;
      }

      const rowData = columns
        .map((col) => {
          try {
            const value = row[col.key];
            return col.formatter ? col.formatter(value) : String(value || "");
          } catch (error) {
            return "Error";
          }
        })
        .join(" | ");

      doc.text(rowData, margin, yPosition);
      yPosition += lineHeight;
    });

    // Save the PDF
    const filename = `${options.filename}-${format(
      new Date(),
      "yyyy-MM-dd-HH-mm"
    )}.pdf`;
    doc.save(filename);
    console.log("Simple PDF saved successfully:", filename);
  }

  /**
   * Export data to PDF
   */
  public async exportToPDF(
    data: any[],
    columns: ColumnDefinition[],
    options: ExportOptions
  ): Promise<void> {
    try {
      console.log("Starting PDF export...", {
        dataLength: data.length,
        columnsCount: columns.length,
      });

      // Check browser compatibility
      if (!this.isPDFSupported()) {
        console.error("PDF not supported in this browser");
        throw new Error("PDF generation is not supported in this browser");
      }

      console.log("Creating PDF document...");
      const doc = new jsPDF({
        orientation: options.orientation || "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;

      let yPosition = 20;

      // Add title
      console.log("Adding title to PDF...");
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(options.title, margin, yPosition);
      yPosition += 10;

      // Add subtitle if provided
      if (options.subtitle) {
        console.log("Adding subtitle to PDF...");
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(options.subtitle, margin, yPosition);
        yPosition += 8;
      }

      // Add timestamp if requested
      if (options.includeTimestamp) {
        console.log("Adding timestamp to PDF...");
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        const timestamp = `Generated on: ${format(
          new Date(),
          "yyyy-MM-dd HH:mm:ss"
        )}`;
        doc.text(timestamp, margin, yPosition);
        yPosition += 6;
      }

      // Add filters if requested
      if (options.includeFilters && options.filters) {
        console.log("Adding filters to PDF...");
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Applied Filters:", margin, yPosition);
        yPosition += 5;

        doc.setFont("helvetica", "normal");
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value && value !== "all") {
            const filterText = `${key}: ${value}`;
            doc.text(filterText, margin + 5, yPosition);
            yPosition += 4;
          }
        });
        yPosition += 5;
      }

      // Prepare table data with error handling
      console.log("Preparing table data...");
      const tableData = data.map((row, rowIndex) => {
        try {
          return columns.map((col, colIndex) => {
            try {
              const value = row[col.key];
              const formattedValue = col.formatter
                ? col.formatter(value)
                : String(value || "");
              return formattedValue;
            } catch (error) {
              console.warn(
                `Error formatting column ${col.key} in row ${rowIndex}:`,
                error
              );
              return "Error";
            }
          });
        } catch (error) {
          console.error(`Error processing row ${rowIndex}:`, error);
          return columns.map(() => "Error");
        }
      });

      const tableHeaders = columns.map((col) => col.header);

      // Calculate column widths
      const columnWidths = columns.map((col) => {
        if (col.width) return col.width;
        return contentWidth / columns.length;
      });

      // Add table with error handling
      console.log("Generating PDF table...");
      try {
        // Check if autoTable is available
        if (typeof (doc as any).autoTable !== "function") {
          console.warn("autoTable plugin not available, using simple PDF");
          this.createSimplePDF(data, columns, options);
          return;
        }

        (doc as any).autoTable({
          head: [tableHeaders],
          body: tableData,
          startY: yPosition,
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 8,
            cellPadding: 2,
          },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: "bold",
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245],
          },
          columnStyles: columns.reduce((acc, col, index) => {
            if (col.width) {
              acc[index] = { cellWidth: col.width };
            }
            return acc;
          }, {} as Record<number, any>),
        });
        console.log("PDF table generated successfully");
      } catch (tableError) {
        console.error("Error generating PDF table:", tableError);
        console.log("Trying fallback simple PDF generation...");
        this.createSimplePDF(data, columns, options);
        return;
      }

      // Save the PDF with error handling
      console.log("Saving PDF file...");
      try {
        const filename = `${options.filename}-${format(
          new Date(),
          "yyyy-MM-dd-HH-mm"
        )}.pdf`;
        doc.save(filename);
        console.log("PDF saved successfully:", filename);
      } catch (saveError) {
        console.error("Error saving PDF:", saveError);
        throw new Error("Failed to save PDF file");
      }
    } catch (error) {
      console.error("PDF export error:", error);
      console.error(
        "Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );
      throw new Error("PDF export failed. Please try again.");
    }
  }

  /**
   * Export data to Excel
   */
  public exportToExcel(
    data: any[],
    columns: ColumnDefinition[],
    options: ExportOptions
  ): void {
    // Prepare worksheet data
    const worksheetData = [
      // Title row
      [options.title],
      [],
    ];

    // Add subtitle if provided
    if (options.subtitle) {
      worksheetData.push([options.subtitle]);
      worksheetData.push([]);
    }

    // Add timestamp if requested
    if (options.includeTimestamp) {
      worksheetData.push([
        `Generated on: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`,
      ]);
      worksheetData.push([]);
    }

    // Add filters if requested
    if (options.includeFilters && options.filters) {
      worksheetData.push(["Applied Filters:"]);
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value && value !== "all") {
          worksheetData.push([`${key}: ${value}`]);
        }
      });
      worksheetData.push([]);
    }

    // Add headers
    worksheetData.push(columns.map((col) => col.header));

    // Add data rows
    data.forEach((row) => {
      const rowData = columns.map((col) => {
        const value = row[col.key];
        return col.formatter ? col.formatter(value) : value || "";
      });
      worksheetData.push(rowData);
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    const columnWidths = columns.map((col) => ({
      wch: Math.max(col.header.length, 15),
    }));
    worksheet["!cols"] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

    // Save the Excel file
    const filename = `${options.filename}-${format(
      new Date(),
      "yyyy-MM-dd-HH-mm"
    )}.xlsx`;
    XLSX.writeFile(workbook, filename);
  }

  /**
   * Export data to CSV
   */
  public exportToCSV(
    data: any[],
    columns: ColumnDefinition[],
    options: ExportOptions
  ): void {
    // Prepare CSV content
    const csvRows: string[] = [];

    // Add title
    csvRows.push(`"${options.title}"`);
    csvRows.push("");

    // Add subtitle if provided
    if (options.subtitle) {
      csvRows.push(`"${options.subtitle}"`);
      csvRows.push("");
    }

    // Add timestamp if requested
    if (options.includeTimestamp) {
      csvRows.push(`"Generated on: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}"`);
      csvRows.push("");
    }

    // Add filters if requested
    if (options.includeFilters && options.filters) {
      csvRows.push('"Applied Filters:"');
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value && value !== "all") {
          csvRows.push(`"${key}: ${value}"`);
        }
      });
      csvRows.push("");
    }

    // Add headers
    const headers = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(",");
    csvRows.push(headers);

    // Add data rows
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const value = row[col.key];
          const formattedValue = col.formatter
            ? col.formatter(value)
            : String(value || "");
          // Escape commas and quotes
          return `"${formattedValue.replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    csvRows.push(...rows);

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${options.filename}-${format(
      new Date(),
      "yyyy-MM-dd-HH-mm"
    )}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export with progress tracking for large datasets
   */
  public async exportWithProgress(
    data: any[],
    columns: ColumnDefinition[],
    options: ExportOptions,
    format: "pdf" | "excel" | "csv",
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const chunkSize = 1000;
    const totalChunks = Math.ceil(data.length / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, data.length);
      const chunk = data.slice(start, end);

      // Update progress
      if (onProgress) {
        onProgress((i + 1) / totalChunks);
      }

      // Process chunk
      if (i === 0) {
        // First chunk - create file
        switch (format) {
          case "pdf":
            await this.exportToPDF(chunk, columns, options);
            break;
          case "excel":
            this.exportToExcel(chunk, columns, options);
            break;
          case "csv":
            this.exportToCSV(chunk, columns, options);
            break;
        }
      } else {
        // Additional chunks - append to existing file
        // Note: This is a simplified implementation
        // In a real application, you'd need to handle appending to existing files
        console.log(`Processing chunk ${i + 1} of ${totalChunks}`);
      }

      // Small delay to prevent blocking
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

// Export utility functions for common data types
export const formatCurrency = (
  value: number,
  locale: string = "en-US"
): string => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EGP",
    currencyDisplay: "code",
  }).format(value);
};

export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return "N/A";
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      return "N/A";
    }
    return format(dateObj, "yyyy-MM-dd HH:mm:ss");
  } catch (error) {
    return "N/A";
  }
};

export const formatPhone = (phone: string): string => {
  return phone || "N/A";
};

export const formatStatus = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const formatPercentage = (value: number): string => {
  return `${value}%`;
};

export const formatBoolean = (value: boolean): string => {
  return value ? "Yes" : "No";
};

export const formatArray = (value: string[]): string => {
  return value ? value.join(", ") : "N/A";
};

// Predefined column definitions for common admin data types
export const commonColumns = {
  events: [
    { header: "ID", key: "id", width: 20 },
    { header: "Title", key: "title", width: 60 },
    { header: "Organizer", key: "organizer", width: 40 },
    { header: "Date", key: "date", width: 30, formatter: formatDate },
    { header: "Location", key: "location", width: 50 },
    { header: "Status", key: "status", width: 25, formatter: formatStatus },
    { header: "Category", key: "category", width: 30 },
    { header: "Total Tickets", key: "totalTickets", width: 25 },
    { header: "Sold Tickets", key: "ticketsSold", width: 25 },
    { header: "Revenue", key: "revenue", width: 30, formatter: formatCurrency },
    {
      header: "Commission",
      key: "commission",
      width: 30,
      formatter: formatCurrency,
    },
  ] as ColumnDefinition[],

  users: [
    { header: "ID", key: "id", width: 20 },
    { header: "Username", key: "username", width: 30 },
    { header: "Full Name", key: "fullName", width: 40 },
    { header: "Email", key: "email", width: 50 },
    { header: "Role", key: "role", width: 25, formatter: formatStatus },
    { header: "Status", key: "status", width: 20, formatter: formatStatus },
    {
      header: "Last Login",
      key: "lastLogin",
      width: 35,
      formatter: formatDate,
    },
    { header: "Phone", key: "phone", width: 25, formatter: formatPhone },
    {
      header: "Created At",
      key: "createdAt",
      width: 30,
      formatter: formatDate,
    },
  ] as ColumnDefinition[],

  customers: [
    { header: "ID", key: "id", width: 20 },
    { header: "Name", key: "name", width: 40 },
    { header: "Email", key: "email", width: 50 },
    { header: "Phone", key: "phone", width: 25, formatter: formatPhone },
    { header: "Status", key: "status", width: 20, formatter: formatStatus },
    {
      header: "Registration Date",
      key: "registrationDate",
      width: 35,
      formatter: formatDate,
    },
    {
      header: "Last Login",
      key: "lastLogin",
      width: 35,
      formatter: formatDate,
    },
    { header: "Total Bookings", key: "totalBookings", width: 25 },
    {
      header: "Total Spent",
      key: "totalSpent",
      width: 30,
      formatter: formatCurrency,
    },
    { header: "Location", key: "location", width: 30 },
  ] as ColumnDefinition[],

  tickets: [
    { header: "ID", key: "id", width: 20 },
    { header: "Event Title", key: "eventTitle", width: 50 },
    { header: "Customer Name", key: "customerName", width: 40 },
    { header: "Category", key: "category", width: 25, formatter: formatStatus },
    { header: "Price", key: "price", width: 25, formatter: formatCurrency },
    { header: "Status", key: "status", width: 20, formatter: formatStatus },
    {
      header: "Purchase Date",
      key: "purchaseDate",
      width: 35,
      formatter: formatDate,
    },
    {
      header: "Phone Number",
      key: "phoneNumber",
      width: 25,
      formatter: formatPhone,
    },
    { header: "Ticket Number", key: "ticketNumber", width: 30 },
  ] as ColumnDefinition[],

  venues: [
    { header: "ID", key: "id", width: 20 },
    { header: "Name", key: "name", width: 40 },
    { header: "Address", key: "address", width: 60 },
    { header: "City", key: "city", width: 25 },
    { header: "Capacity", key: "capacity", width: 25 },
    { header: "Status", key: "status", width: 20, formatter: formatStatus },
  ] as ColumnDefinition[],

  organizers: [
    { header: "ID", key: "id", width: 20 },
    { header: "Name", key: "name", width: 40 },
    { header: "Email", key: "email", width: 50 },
    { header: "Phone", key: "phone", width: 25, formatter: formatPhone },
    { header: "Category", key: "category", width: 25, formatter: formatStatus },
    { header: "Location", key: "location", width: 30 },
    { header: "Status", key: "status", width: 20, formatter: formatStatus },
    {
      header: "Verified",
      key: "verified",
      width: 20,
      formatter: formatBoolean,
    },
    { header: "Total Events", key: "totalEvents", width: 25 },
    {
      header: "Total Revenue",
      key: "totalRevenue",
      width: 30,
      formatter: formatCurrency,
    },
    {
      header: "Commission",
      key: "commission",
      width: 30,
      formatter: formatCurrency,
    },
    {
      header: "Net Revenue",
      key: "netRevenue",
      width: 30,
      formatter: formatCurrency,
    },
    {
      header: "Commission Rate",
      key: "commissionRate",
      width: 25,
      formatter: formatPercentage,
    },
    { header: "Rating", key: "rating", width: 20 },
    {
      header: "Registration Date",
      key: "registrationDate",
      width: 35,
      formatter: formatDate,
    },
    {
      header: "Last Login",
      key: "lastLogin",
      width: 35,
      formatter: formatDate,
    },
  ] as ColumnDefinition[],

  nfcCards: [
    { header: "ID", key: "id", width: 20 },
    { header: "Serial Number", key: "serialNumber", width: 35 },
    { header: "Customer Name", key: "customerName", width: 40 },
    { header: "Status", key: "status", width: 20, formatter: formatStatus },
    {
      header: "Issue Date",
      key: "issueDate",
      width: 30,
      formatter: formatDate,
    },
    {
      header: "Expiry Date",
      key: "expiryDate",
      width: 30,
      formatter: formatDate,
    },
    { header: "Balance", key: "balance", width: 25, formatter: formatCurrency },
    { header: "Last Used", key: "lastUsed", width: 35, formatter: formatDate },
    { header: "Usage Count", key: "usageCount", width: 25 },
    {
      header: "Card Type",
      key: "cardType",
      width: 25,
      formatter: formatStatus,
    },
  ] as ColumnDefinition[],

  systemLogs: [
    { header: "ID", key: "id", width: 20 },
    { header: "Timestamp", key: "timestamp", width: 35, formatter: formatDate },
    { header: "User", key: "userName", width: 30 },
    { header: "Role", key: "userRole", width: 25, formatter: formatStatus },
    { header: "Action", key: "action", width: 40 },
    { header: "Category", key: "category", width: 30, formatter: formatStatus },
    { header: "Severity", key: "severity", width: 20, formatter: formatStatus },
    { header: "Description", key: "description", width: 80 },
    { header: "Status", key: "status", width: 20, formatter: formatStatus },
    { header: "IP Address", key: "ipAddress", width: 25 },
    { header: "Location", key: "location", width: 30 },
  ] as ColumnDefinition[],

  dashboardStats: [
    { header: "Metric", key: "metric", width: 40 },
    { header: "Value", key: "value", width: 30 },
    { header: "Category", key: "category", width: 30 },
  ] as ColumnDefinition[],

  analyticsRevenue: [
    { header: "Month", key: "month", width: 30 },
    { header: "Revenue", key: "revenue", width: 30, formatter: formatCurrency },
    {
      header: "Commission",
      key: "commission",
      width: 30,
      formatter: formatCurrency,
    },
    { header: "Payout", key: "payout", width: 30, formatter: formatCurrency },
  ] as ColumnDefinition[],

  analyticsUserGrowth: [
    { header: "Month", key: "month", width: 30 },
    { header: "Visitors", key: "visitors", width: 25 },
    { header: "Registered", key: "registered", width: 25 },
    { header: "Active", key: "active", width: 25 },
  ] as ColumnDefinition[],

  analyticsCardStatus: [
    { header: "Status", key: "name", width: 40 },
    { header: "Count", key: "value", width: 25 },
    { header: "Percentage", key: "percentage", width: 25 },
  ] as ColumnDefinition[],

  analyticsEventCategories: [
    { header: "Category", key: "name", width: 40 },
    { header: "Count", key: "value", width: 25 },
    { header: "Percentage", key: "percentage", width: 25 },
  ] as ColumnDefinition[],

  checkInLogs: [
    { header: "ID", key: "id", width: 20 },
    { header: "Timestamp", key: "timestamp", width: 35, formatter: formatDate },
    { header: "Customer Name", key: "customerName", width: 40 },
    { header: "Customer Email", key: "customerEmail", width: 50 },
    { header: "Event Title", key: "eventTitle", width: 50 },
    { header: "Venue", key: "venueName", width: 40 },
    { header: "Entry Point", key: "entryPoint", width: 30 },
    { header: "NFC Card", key: "nfcSerialNumber", width: 35 },
    {
      header: "Card Status",
      key: "cardStatus",
      width: 25,
      formatter: formatStatus,
    },
    {
      header: "Scan Result",
      key: "scanResult",
      width: 25,
      formatter: formatStatus,
    },
    {
      header: "Scan Type",
      key: "scanType",
      width: 25,
      formatter: formatStatus,
    },
    { header: "Device Name", key: "deviceName", width: 40 },
    {
      header: "Device Type",
      key: "deviceType",
      width: 25,
      formatter: formatStatus,
    },
    { header: "Operator Name", key: "operatorName", width: 40 },
    {
      header: "Operator Role",
      key: "operatorRole",
      width: 25,
      formatter: formatStatus,
    },
    { header: "Processing Time", key: "processingTime", width: 25 },
    {
      header: "Signal Strength",
      key: "signalStrength",
      width: 25,
      formatter: formatStatus,
    },
    { header: "Battery Level", key: "batteryLevel", width: 25 },
    {
      header: "Network Status",
      key: "networkStatus",
      width: 25,
      formatter: formatStatus,
    },
    { header: "Notes", key: "notes", width: 40 },
  ] as ColumnDefinition[],

  ushers: [
    { header: "ID", key: "id", width: 20 },
    { header: "Name", key: "name", width: 40 },
    { header: "Email", key: "email", width: 50 },
    { header: "Phone", key: "phone", width: 25, formatter: formatPhone },
    { header: "Role", key: "role", width: 25, formatter: formatStatus },
    { header: "Status", key: "status", width: 20, formatter: formatStatus },
    { header: "Location", key: "location", width: 30 },
    { header: "Experience", key: "experience", width: 25 },
    {
      header: "Hourly Rate",
      key: "hourlyRate",
      width: 25,
      formatter: formatCurrency,
    },
    { header: "Total Hours", key: "totalHours", width: 25 },
    { header: "Total Events", key: "totalEvents", width: 25 },
    { header: "Rating", key: "rating", width: 20 },
    {
      header: "Performance",
      key: "performance",
      width: 25,
      formatter: formatStatus,
    },
    { header: "Hire Date", key: "hireDate", width: 30, formatter: formatDate },
    {
      header: "Last Active",
      key: "lastActive",
      width: 35,
      formatter: formatDate,
    },
    {
      header: "Assigned Events",
      key: "assignedEvents",
      width: 30,
      formatter: formatArray,
    },
  ] as ColumnDefinition[],

  payouts: [
    { header: "Reference", key: "reference", width: 35 },
    { header: "Organizer", key: "organizerName", width: 40 },
    { header: "Amount", key: "amount", width: 30, formatter: formatCurrency },
    { header: "Status", key: "status", width: 25, formatter: formatStatus },
    { header: "Method", key: "method", width: 25, formatter: formatStatus },
    {
      header: "Created At",
      key: "createdAt",
      width: 35,
      formatter: formatDate,
    },
    {
      header: "Processed At",
      key: "processedAt",
      width: 35,
      formatter: formatDate,
    },
  ] as ColumnDefinition[],

  merchants: [
    { header: "ID", key: "id", width: 20 },
    { header: "Business Name", key: "businessName", width: 50 },
    { header: "Owner Name", key: "ownerName", width: 40 },
    { header: "Email", key: "email", width: 50 },
    { header: "Phone", key: "phone", width: 25, formatter: formatPhone },
    { header: "Status", key: "status", width: 25, formatter: formatStatus },
    {
      header: "Verification",
      key: "verificationStatus",
      width: 25,
      formatter: formatStatus,
    },
    { header: "Location", key: "location", width: 40 },
    { header: "Business Type", key: "businessType", width: 35 },
    {
      header: "Registration Date",
      key: "registrationDate",
      width: 35,
      formatter: formatDate,
    },
    {
      header: "Last Login",
      key: "lastLogin",
      width: 35,
      formatter: formatDate,
    },
    { header: "Total Events", key: "totalEvents", width: 25 },
    {
      header: "Total Revenue",
      key: "totalRevenue",
      width: 30,
      formatter: formatCurrency,
    },
    { header: "Commission Rate", key: "commissionRate", width: 25 },
    {
      header: "Payout Balance",
      key: "payoutBalance",
      width: 30,
      formatter: formatCurrency,
    },
    { header: "Tax ID", key: "taxId", width: 30 },
    { header: "Bank Account", key: "bankAccount", width: 40 },
  ] as ColumnDefinition[],

  payments: [
    { header: "Transaction ID", key: "transactionId", width: 40 },
    { header: "Customer Name", key: "customerName", width: 40 },
    { header: "Customer Email", key: "customerEmail", width: 50 },
    { header: "Customer Phone", key: "customerPhone", width: 25, formatter: formatPhone },
    { header: "Event Title", key: "eventTitle", width: 50 },
    { header: "Ticket Number", key: "ticketNumber", width: 35 },
    { header: "Ticket Category", key: "ticketCategory", width: 30 },
    { header: "Amount", key: "amount", width: 30, formatter: formatCurrency },
    { header: "Payment Method", key: "paymentMethod", width: 30, formatter: (value: string) => {
      const methodMap: Record<string, string> = {
        credit_card: "Credit Card",
        debit_card: "Debit Card",
        nfc_card: "NFC Card",
        digital_wallet: "Digital Wallet",
        bank_transfer: "Bank Transfer",
      };
      return methodMap[value] || formatStatus(value);
    }},
    { header: "Status", key: "status", width: 25, formatter: formatStatus },
    { header: "Created At", key: "createdAt", width: 35, formatter: formatDate },
    { header: "Updated At", key: "updatedAt", width: 35, formatter: formatDate },
  ] as ColumnDefinition[],
};
