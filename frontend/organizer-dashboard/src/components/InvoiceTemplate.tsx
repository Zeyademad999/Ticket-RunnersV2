import React from "react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { useTranslation } from "react-i18next";

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  organizerAddress: string;
  transactionId: string;
  amount: number;
  status: string;
  description: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceTemplateProps {
  data: InvoiceData;
  onDownload?: () => void;
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({
  data,
  onDownload,
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const generatePDF = () => {
    try {
      const doc = new jsPDF();

    // Set document direction for RTL support
    if (isRTL) {
      doc.setR2L(true);
    }

    // Add company logo/header
    // Note: For PDF generation, we'll use text as fallback since adding images to PDF requires additional setup
    doc.setFontSize(24);
    doc.setTextColor(59, 130, 246); // Blue color
    doc.text("TicketRunners", isRTL ? 200 : 20, 30);

    doc.setFontSize(12);
    doc.setTextColor(107, 114, 128); // Gray color
    doc.text("Event Management Platform", isRTL ? 200 : 20, 40);

    // Invoice header
    doc.setFontSize(20);
    doc.setTextColor(17, 24, 39); // Dark color
    doc.text(t("invoice.title", "INVOICE"), isRTL ? 200 : 20, 60);

    // Invoice details
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);

    const leftX = isRTL ? 200 : 20;
    const rightX = isRTL ? 20 : 200;

    doc.text(
      `${t("invoice.number", "Invoice #")}: ${data.invoiceNumber}`,
      leftX,
      80
    );
    doc.text(`${t("invoice.date", "Date")}: ${data.date}`, leftX, 90);
    doc.text(
      `${t("invoice.dueDate", "Due Date")}: ${data.dueDate}`,
      leftX,
      100
    );
    doc.text(`${t("invoice.status", "Status")}: ${data.status}`, leftX, 110);

    // Organizer information
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text(t("invoice.billedTo", "Billed To"), leftX, 130);

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(data.organizerName, leftX, 140);
    doc.text(data.organizerEmail, leftX, 150);
    doc.text(data.organizerPhone, leftX, 160);
    doc.text(data.organizerAddress, leftX, 170);

    // Event information
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text(t("invoice.eventDetails", "Event Details"), rightX, 130);

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(data.eventTitle, rightX, 140);
    doc.text(
      `${t("invoice.eventDate", "Event Date")}: ${data.eventDate}`,
      rightX,
      150
    );
    doc.text(
      `${t("invoice.eventLocation", "Location")}: ${data.eventLocation}`,
      rightX,
      160
    );
    doc.text(
      `${t("invoice.transactionId", "Transaction ID")}: ${data.transactionId}`,
      rightX,
      170
    );

    // Items table
    const tableData = data.items.map((item) => [
      item.description,
      item.quantity.toString(),
      `${data.currency} ${item.unitPrice.toFixed(2)}`,
      `${data.currency} ${item.total.toFixed(2)}`,
    ]);

    // Add subtotal, tax, and total rows
    tableData.push([
      "",
      "",
      t("invoice.subtotal", "Subtotal"),
      `${data.currency} ${data.subtotal.toFixed(2)}`,
    ]);

    if (data.tax > 0) {
      tableData.push([
        "",
        "",
        t("invoice.tax", "Tax"),
        `${data.currency} ${data.tax.toFixed(2)}`,
      ]);
    }

    tableData.push([
      "",
      "",
      t("invoice.total", "Total"),
      `${data.currency} ${data.total.toFixed(2)}`,
    ]);

    const tableConfig = {
      startY: 190,
      head: [
        [
          t("invoice.description", "Description"),
          t("invoice.quantity", "Qty"),
          t("invoice.price", "Price"),
          t("invoice.total", "Total"),
        ],
      ],
      body: tableData,
      styles: {
        fontSize: 10,
        cellPadding: 5,
        lineColor: [229, 231, 235],
        lineWidth: 0.1,
        textColor: [17, 24, 39],
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontSize: 11,
          fontStyle: "bold",
        },
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 20, halign: "center" },
        2: { cellWidth: 40, halign: "right" },
        3: { cellWidth: 40, halign: "right" },
      },
    };

    if (isRTL) {
      tableConfig.columnStyles = {
        0: { cellWidth: 80 },
        1: { cellWidth: 20, halign: "center" },
        2: { cellWidth: 40, halign: "left" },
        3: { cellWidth: 40, halign: "left" },
      };
    }

    (doc as any).autoTable(tableConfig);

    // Payment information
    const finalY = (doc as any).lastAutoTable.finalY + 20;

    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text(t("invoice.paymentInfo", "Payment Information"), leftX, finalY);

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(
      `${t("invoice.paymentMethod", "Payment Method")}: ${t(
        "invoice.bankTransfer",
        "Bank Transfer"
      )}`,
      leftX,
      finalY + 10
    );
    doc.text(
      `${t("invoice.accountNumber", "Account Number")}: **** **** **** 1234`,
      leftX,
      finalY + 20
    );
    doc.text(
      `${t("invoice.bankName", "Bank Name")}: TicketRunners Bank`,
      leftX,
      finalY + 30
    );

    // Terms and conditions
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(t("invoice.terms", "Terms & Conditions"), leftX, finalY + 50);
    doc.setFontSize(8);
    doc.text(
      t(
        "invoice.termsText",
        "Payment is due within 30 days. Late payments may incur additional fees."
      ),
      leftX,
      finalY + 60
    );

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("TicketRunners - Event Management Platform", 105, 280, {
      align: "center",
    });
    doc.text("support@ticketrunners.com | www.ticketrunners.com", 105, 285, {
      align: "center",
    });

    // Save the PDF
    doc.save(`invoice-${data.invoiceNumber}.pdf`);

    if (onDownload) {
      onDownload();
    }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <img
            src="/ticket-logo-secondary.png"
            alt="TicketRunners Logo"
            className="h-12 mb-2"
          />
          <p className="text-gray-600">Event Management Platform</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t("invoice.title", "INVOICE")}
          </h2>
          <div className="text-sm text-gray-600">
            <p>
              <strong>{t("invoice.number", "Invoice #")}:</strong>{" "}
              {data.invoiceNumber}
            </p>
            <p>
              <strong>{t("invoice.date", "Date")}:</strong> {data.date}
            </p>
            <p>
              <strong>{t("invoice.dueDate", "Due Date")}:</strong>{" "}
              {data.dueDate}
            </p>
            <p>
              <strong>{t("invoice.status", "Status")}:</strong>
              <span
                className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  data.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : data.status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {data.status}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Billing and Event Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("invoice.billedTo", "Billed To")}
          </h3>
          <div className="text-gray-600">
            <p className="font-medium">{data.organizerName}</p>
            <p>{data.organizerEmail}</p>
            <p>{data.organizerPhone}</p>
            <p>{data.organizerAddress}</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("invoice.eventDetails", "Event Details")}
          </h3>
          <div className="text-gray-600">
            <p className="font-medium">{data.eventTitle}</p>
            <p>
              <strong>{t("invoice.eventDate", "Event Date")}:</strong>{" "}
              {data.eventDate}
            </p>
            <p>
              <strong>{t("invoice.eventLocation", "Location")}:</strong>{" "}
              {data.eventLocation}
            </p>
            <p>
              <strong>{t("invoice.transactionId", "Transaction ID")}:</strong>{" "}
              {data.transactionId}
            </p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="text-left p-3">
                {t("invoice.description", "Description")}
              </th>
              <th className="text-center p-3">
                {t("invoice.quantity", "Qty")}
              </th>
              <th className="text-right p-3">{t("invoice.price", "Price")}</th>
              <th className="text-right p-3">{t("invoice.total", "Total")}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="p-3">{item.description}</td>
                <td className="p-3 text-center">{item.quantity}</td>
                <td className="p-3 text-right">
                  {data.currency} {item.unitPrice.toFixed(2)}
                </td>
                <td className="p-3 text-right">
                  {data.currency} {item.total.toFixed(2)}
                </td>
              </tr>
            ))}
            <tr className="border-b border-gray-200">
              <td colSpan={2}></td>
              <td className="p-3 text-right font-medium">
                {t("invoice.subtotal", "Subtotal")}
              </td>
              <td className="p-3 text-right">
                {data.currency} {data.subtotal.toFixed(2)}
              </td>
            </tr>
            {data.tax > 0 && (
              <tr className="border-b border-gray-200">
                <td colSpan={2}></td>
                <td className="p-3 text-right font-medium">
                  {t("invoice.tax", "Tax")}
                </td>
                <td className="p-3 text-right">
                  {data.currency} {data.tax.toFixed(2)}
                </td>
              </tr>
            )}
            <tr className="bg-gray-50 font-bold">
              <td colSpan={2}></td>
              <td className="p-3 text-right">{t("invoice.total", "Total")}</td>
              <td className="p-3 text-right text-lg">
                {data.currency} {data.total.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("invoice.paymentInfo", "Payment Information")}
          </h3>
          <div className="text-gray-600">
            <p>
              <strong>{t("invoice.paymentMethod", "Payment Method")}:</strong>{" "}
              {t("invoice.bankTransfer", "Bank Transfer")}
            </p>
            <p>
              <strong>{t("invoice.accountNumber", "Account Number")}:</strong>{" "}
              **** **** **** 1234
            </p>
            <p>
              <strong>{t("invoice.bankName", "Bank Name")}:</strong>{" "}
              TicketRunners Bank
            </p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("invoice.terms", "Terms & Conditions")}
          </h3>
          <div className="text-gray-600 text-sm">
            <p>
              {t(
                "invoice.termsText",
                "Payment is due within 30 days. Late payments may incur additional fees."
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 pt-6 text-center text-gray-500 text-sm">
        <p className="font-medium">TicketRunners - Event Management Platform</p>
        <p>support@ticketrunners.com | www.ticketrunners.com</p>
      </div>

      {/* Download Button */}
      <div className="mt-6 text-center">
        <button
          onClick={generatePDF}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
        >
          {t("invoice.download", "Download PDF")}
        </button>
      </div>
    </div>
  );
};

export default InvoiceTemplate;
