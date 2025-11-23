import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import InvoiceTemplate from "./InvoiceTemplate";

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

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InvoiceData;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Preview</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <InvoiceTemplate data={data} onDownload={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceModal;
