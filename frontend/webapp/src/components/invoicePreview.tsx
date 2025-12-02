import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function InvoicePreview() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const sampleInvoice = {
    invoiceNumber: "INV-20250720",
    date: "2025-07-20",
    customerName: "John Doe",
    items: [
      { description: t("invoice.item_1"), quantity: 1, price: 100 },
      { description: t("invoice.item_2"), quantity: 1, price: 10 },
    ],
    total: 110,
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        {t("invoice.view_template")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("invoice.preview_title")}</DialogTitle>
          </DialogHeader>

          <div className="p-4 space-y-4">
            <div className="text-sm text-muted-foreground">
              <div>
                <strong>{t("invoice.number")}:</strong>{" "}
                {sampleInvoice.invoiceNumber}
              </div>
              <div>
                <strong>{t("invoice.date")}:</strong> {sampleInvoice.date}
              </div>
              <div>
                <strong>{t("invoice.customer")}:</strong>{" "}
                {sampleInvoice.customerName}
              </div>
            </div>

            <table className="w-full text-sm border mt-4">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-2 border">
                    {t("invoice.description")}
                  </th>
                  <th className="text-right p-2 border">
                    {t("invoice.quantity")}
                  </th>
                  <th className="text-right p-2 border">
                    {t("invoice.price")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sampleInvoice.items.map((item, index) => (
                  <tr key={index}>
                    <td className="p-2 border">{item.description}</td>
                    <td className="text-right p-2 border">{item.quantity}</td>
                    <td className="text-right p-2 border">
                      ${item.price.toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td
                    colSpan={2}
                    className="text-right font-semibold p-2 border"
                  >
                    {t("invoice.total")}
                  </td>
                  <td className="text-right font-semibold p-2 border">
                    ${sampleInvoice.total.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="text-xs text-muted-foreground italic mt-4">
              {t("invoice.note")}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
