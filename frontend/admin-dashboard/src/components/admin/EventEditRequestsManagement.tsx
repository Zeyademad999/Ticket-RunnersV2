import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { eventEditRequestsApi } from "@/lib/api/adminApi";
import { CheckCircle2, XCircle, Clock, Eye, Calendar, User, Edit } from "lucide-react";
import { format } from "date-fns";

const EventEditRequestsManagement: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  // Fetch event edit requests
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["event-edit-requests", statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      return await eventEditRequestsApi.getEditRequests(params);
    },
  });

  const requests = requestsData?.results || requestsData || [];

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      return await eventEditRequestsApi.approveEditRequest(id, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-edit-requests"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        title: t("admin.eventEditRequests.toast.approved") || "Request Approved",
        description: t("admin.eventEditRequests.toast.approvedDesc") || "The edit request has been approved and changes have been applied.",
      });
      setIsDetailDialogOpen(false);
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.message || t("admin.eventEditRequests.toast.error"),
        variant: "destructive",
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await eventEditRequestsApi.rejectEditRequest(id, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-edit-requests"] });
      toast({
        title: t("admin.eventEditRequests.toast.rejected") || "Request Rejected",
        description: t("admin.eventEditRequests.toast.rejectedDesc") || "The edit request has been rejected.",
      });
      setIsRejectDialogOpen(false);
      setIsDetailDialogOpen(false);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.message || t("admin.eventEditRequests.toast.error"),
        variant: "destructive",
      });
    },
  });

  const handleViewDetails = async (request: any) => {
    try {
      const detail = await eventEditRequestsApi.getEditRequest(request.id);
      setSelectedRequest(detail);
      setIsDetailDialogOpen(true);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.message || "Failed to load request details",
        variant: "destructive",
      });
    }
  };

  const handleApprove = () => {
    if (selectedRequest) {
      approveMutation.mutate({ id: selectedRequest.id, notes: adminNotes });
    }
  };

  const handleReject = () => {
    if (selectedRequest && rejectionReason.trim()) {
      rejectMutation.mutate({ id: selectedRequest.id, reason: rejectionReason });
    } else {
      toast({
        title: t("common.error"),
        description: t("admin.eventEditRequests.rejectionReasonRequired") || "Please provide a reason for rejection",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      case "pending":
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getEditTypeLabel = (editType: string) => {
    const labels: { [key: string]: string } = {
      "edit_event_name": t("admin.eventEditRequests.editEventName", "Edit Event Name"),
      "edit_total_tickets": t("admin.eventEditRequests.editTotalTickets", "Edit Total Tickets"),
      "add_ticket_category": t("admin.eventEditRequests.addTicketCategory", "Add Ticket Category"),
      "mark_category_sold_out": t("admin.eventEditRequests.markSoldOut", "Mark Category Sold Out"),
      "change_event_image": t("admin.eventEditRequests.changeImage", "Change Event Image"),
      "edit_ticket_price": t("admin.eventEditRequests.editTicketPrice", "Edit Ticket Price"),
    };
    return labels[editType] || editType;
  };

  const renderRequestDetails = () => {
    if (!selectedRequest) return null;

    const requestedData = selectedRequest.requested_data || {};
    const editType = requestedData.edit_type || "";

    return (
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-semibold">{t("admin.eventEditRequests.event", "Event")}</Label>
          <p className="text-sm">{selectedRequest.event_title || selectedRequest.event?.title || "N/A"}</p>
        </div>
        <div>
          <Label className="text-sm font-semibold">{t("admin.eventEditRequests.organizer", "Organizer")}</Label>
          <p className="text-sm">{selectedRequest.organizer_name || selectedRequest.organizer?.name || "N/A"}</p>
        </div>
        <div>
          <Label className="text-sm font-semibold">{t("admin.eventEditRequests.editType", "Edit Type")}</Label>
          <p className="text-sm">{getEditTypeLabel(editType)}</p>
        </div>
        <div>
          <Label className="text-sm font-semibold">{t("admin.eventEditRequests.description", "Description")}</Label>
          <p className="text-sm whitespace-pre-wrap">{selectedRequest.requested_changes || "N/A"}</p>
        </div>

        {/* Show structured data based on edit type */}
        {editType === "edit_event_name" && requestedData.new_event_name && (
          <div>
            <Label className="text-sm font-semibold">{t("admin.eventEditRequests.newEventName", "New Event Name")}</Label>
            <p className="text-sm">{requestedData.new_event_name}</p>
          </div>
        )}

        {editType === "edit_total_tickets" && requestedData.new_total_tickets !== undefined && (
          <div>
            <Label className="text-sm font-semibold">{t("admin.eventEditRequests.newTotalTickets", "New Total Tickets")}</Label>
            <p className="text-sm">{requestedData.new_total_tickets}</p>
          </div>
        )}

        {editType === "add_ticket_category" && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t("admin.eventEditRequests.newCategoryDetails", "New Category Details")}</Label>
            <div className="bg-muted p-3 rounded space-y-1">
              <p className="text-sm"><strong>{t("admin.eventEditRequests.name", "Name")}:</strong> {requestedData.category_name}</p>
              <p className="text-sm"><strong>{t("admin.eventEditRequests.price", "Price")}:</strong> E£ {requestedData.category_price}</p>
              <p className="text-sm"><strong>{t("admin.eventEditRequests.totalTickets", "Total Tickets")}:</strong> {requestedData.category_total_tickets}</p>
            </div>
          </div>
        )}

        {editType === "mark_category_sold_out" && requestedData.category_name && (
          <div>
            <Label className="text-sm font-semibold">{t("admin.eventEditRequests.categoryToMarkSoldOut", "Category to Mark Sold Out")}</Label>
            <p className="text-sm">{requestedData.category_name}</p>
          </div>
        )}

        {editType === "change_event_image" && selectedRequest.new_event_image_url && (
          <div>
            <Label className="text-sm font-semibold">{t("admin.eventEditRequests.newEventImage", "New Event Image")}</Label>
            <img src={selectedRequest.new_event_image_url} alt="New event image" className="mt-2 w-full max-w-md rounded" />
          </div>
        )}

        {editType === "edit_ticket_price" && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t("admin.eventEditRequests.priceChangeDetails", "Price Change Details")}</Label>
            <div className="bg-muted p-3 rounded space-y-1">
              <p className="text-sm"><strong>{t("admin.eventEditRequests.category", "Category")}:</strong> {requestedData.category_name}</p>
              <p className="text-sm"><strong>{t("admin.eventEditRequests.newPrice", "New Price")}:</strong> E£ {requestedData.new_price}</p>
            </div>
          </div>
        )}

        {selectedRequest.admin_notes && (
          <div>
            <Label className="text-sm font-semibold">{t("admin.eventEditRequests.adminNotes", "Admin Notes")}</Label>
            <p className="text-sm whitespace-pre-wrap">{selectedRequest.admin_notes}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.eventEditRequests.title", "Event Edit Requests")}</CardTitle>
          <CardDescription>
            {t("admin.eventEditRequests.description", "Manage event edit requests from organizers")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter */}
          <div className="mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("admin.eventEditRequests.filterByStatus", "Filter by status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.eventEditRequests.all", "All")}</SelectItem>
                <SelectItem value="pending">{t("admin.eventEditRequests.pending", "Pending")}</SelectItem>
                <SelectItem value="approved">{t("admin.eventEditRequests.approved", "Approved")}</SelectItem>
                <SelectItem value="rejected">{t("admin.eventEditRequests.rejected", "Rejected")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Requests Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("common.loading")}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("admin.eventEditRequests.noRequests", "No event edit requests found")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.eventEditRequests.event", "Event")}</TableHead>
                  <TableHead>{t("admin.eventEditRequests.organizer", "Organizer")}</TableHead>
                  <TableHead>{t("admin.eventEditRequests.editType", "Edit Type")}</TableHead>
                  <TableHead>{t("admin.eventEditRequests.status", "Status")}</TableHead>
                  <TableHead>{t("admin.eventEditRequests.date", "Date")}</TableHead>
                  <TableHead>{t("admin.eventEditRequests.actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request: any) => {
                  const requestedData = request.requested_data || {};
                  const editType = requestedData.edit_type || "";
                  return (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.event_title || request.event?.title || "N/A"}
                      </TableCell>
                      <TableCell>{request.organizer_name || request.organizer?.name || "N/A"}</TableCell>
                      <TableCell>{getEditTypeLabel(editType)}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {request.created_at ? format(new Date(request.created_at), "MMM dd, yyyy") : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(request)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t("admin.eventEditRequests.view", "View")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.eventEditRequests.requestDetails", "Request Details")}</DialogTitle>
            <DialogDescription>
              {t("admin.eventEditRequests.reviewRequest", "Review the edit request details below")}
            </DialogDescription>
          </DialogHeader>
          {renderRequestDetails()}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedRequest?.status === "pending" && (
              <>
                <div className="flex-1">
                  <Label>{t("admin.eventEditRequests.adminNotes", "Admin Notes (Optional)")}</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder={t("admin.eventEditRequests.notesPlaceholder", "Add notes about this approval...")}
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRejectDialogOpen(true);
                    setIsDetailDialogOpen(false);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  {t("admin.eventEditRequests.reject", "Reject")}
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {approveMutation.isPending ? t("common.loading") : t("admin.eventEditRequests.approve", "Approve")}
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.eventEditRequests.rejectRequest", "Reject Request")}</DialogTitle>
            <DialogDescription>
              {t("admin.eventEditRequests.rejectDescription", "Please provide a reason for rejecting this request")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("admin.eventEditRequests.rejectionReason", "Rejection Reason")} *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t("admin.eventEditRequests.reasonPlaceholder", "Enter reason for rejection...")}
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsRejectDialogOpen(false);
              setIsDetailDialogOpen(true);
              setRejectionReason("");
            }}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? t("common.loading") : t("admin.eventEditRequests.reject", "Reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventEditRequestsManagement;

