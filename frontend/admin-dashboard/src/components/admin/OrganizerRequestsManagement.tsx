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
import { organizerEditRequestsApi } from "@/lib/api/adminApi";
import { CheckCircle2, XCircle, Clock, Eye, User } from "lucide-react";
import { format } from "date-fns";

const OrganizerRequestsManagement: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch edit requests
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["organizer-edit-requests", statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      return await organizerEditRequestsApi.getEditRequests(params);
    },
  });

  const requests = requestsData?.results || requestsData || [];

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await organizerEditRequestsApi.approveEditRequest(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizer-edit-requests"] });
      queryClient.invalidateQueries({ queryKey: ["organizers"] });
      toast({
        title: t("admin.organizerRequests.toast.approved") || "Request Approved",
        description: t("admin.organizerRequests.toast.approvedDesc") || "The edit request has been approved and changes have been applied.",
      });
      setIsDetailDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.message || t("admin.organizerRequests.toast.error"),
        variant: "destructive",
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await organizerEditRequestsApi.rejectEditRequest(id, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizer-edit-requests"] });
      toast({
        title: t("admin.organizerRequests.toast.rejected") || "Request Rejected",
        description: t("admin.organizerRequests.toast.rejectedDesc") || "The edit request has been rejected.",
      });
      setIsRejectDialogOpen(false);
      setIsDetailDialogOpen(false);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.message || t("admin.organizerRequests.toast.error"),
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            {t("admin.organizerRequests.status.pending") || "Pending"}
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("admin.organizerRequests.status.approved") || "Approved"}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            {t("admin.organizerRequests.status.rejected") || "Rejected"}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setIsDetailDialogOpen(true);
  };

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleReject = () => {
    if (selectedRequest) {
      rejectMutation.mutate({
        id: selectedRequest.id,
        reason: rejectionReason,
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.organizerRequests.title") || "Organizer Edit Requests"}</CardTitle>
          <CardDescription>
            {t("admin.organizerRequests.subtitle") || "Review and manage organizer profile edit requests"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <Label>{t("admin.organizerRequests.filter.status") || "Status"}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.organizerRequests.filter.all") || "All"}</SelectItem>
                  <SelectItem value="pending">{t("admin.organizerRequests.status.pending") || "Pending"}</SelectItem>
                  <SelectItem value="approved">{t("admin.organizerRequests.status.approved") || "Approved"}</SelectItem>
                  <SelectItem value="rejected">{t("admin.organizerRequests.status.rejected") || "Rejected"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Requests Table */}
          {isLoading ? (
            <div className="text-center py-8">{t("common.loading") || "Loading..."}</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("admin.organizerRequests.noRequests") || "No edit requests found"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.organizerRequests.table.organizer") || "Organizer"}</TableHead>
                  <TableHead>{t("admin.organizerRequests.table.requestedChanges") || "Requested Changes"}</TableHead>
                  <TableHead>{t("admin.organizerRequests.table.status") || "Status"}</TableHead>
                  <TableHead>{t("admin.organizerRequests.table.createdAt") || "Created At"}</TableHead>
                  <TableHead>{t("admin.organizerRequests.table.processedBy") || "Processed By"}</TableHead>
                  <TableHead>{t("common.actions") || "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request: any) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{request.organizer_name || request.organizer?.name}</div>
                          <div className="text-sm text-muted-foreground">{request.organizer_email || request.organizer?.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {Object.keys(request.requested_data || {}).length > 0 ? (
                          <div className="space-y-1">
                            {Object.entries(request.requested_data || {}).slice(0, 2).map(([key, value]: [string, any]) => (
                              <div key={key}>
                                <span className="font-medium">{key.replace(/_/g, " ")}:</span>{" "}
                                <span className="text-muted-foreground">
                                  {typeof value === "string" && value.length > 30
                                    ? `${value.substring(0, 30)}...`
                                    : String(value)}
                                </span>
                              </div>
                            ))}
                            {Object.keys(request.requested_data || {}).length > 2 && (
                              <div className="text-muted-foreground">
                                +{Object.keys(request.requested_data || {}).length - 2} more
                              </div>
                            )}
                          </div>
                        ) : request.profile_image ? (
                          <div className="text-muted-foreground">{t("admin.organizerRequests.profileImageUpdate") || "Profile image update"}</div>
                        ) : (
                          <div className="text-muted-foreground">-</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {request.created_at
                        ? format(new Date(request.created_at), "MMM dd, yyyy HH:mm")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {request.processed_by_name || request.processed_by?.username || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(request)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t("common.view") || "View"}
                        </Button>
                        {request.status === "pending" && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApprove(request.id)}
                              disabled={approveMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              {t("common.approve") || "Approve"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsRejectDialogOpen(true);
                              }}
                              disabled={rejectMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              {t("common.reject") || "Reject"}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("admin.organizerRequests.detail.title") || "Edit Request Details"}
            </DialogTitle>
            <DialogDescription>
              {t("admin.organizerRequests.detail.subtitle") || "Review the requested changes"}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <Label>{t("admin.organizerRequests.detail.organizer") || "Organizer"}</Label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <div className="font-medium">{selectedRequest.organizer_name}</div>
                  <div className="text-sm text-muted-foreground">{selectedRequest.organizer_email}</div>
                </div>
              </div>

              <div>
                <Label>{t("admin.organizerRequests.detail.status") || "Status"}</Label>
                <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
              </div>

              {selectedRequest.profile_image_url && (
                <div>
                  <Label>{t("admin.organizerRequests.detail.profileImage") || "New Profile Image"}</Label>
                  <div className="mt-1">
                    <img
                      src={selectedRequest.profile_image_url}
                      alt="Profile"
                      className="w-32 h-32 object-contain rounded-md border"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label>{t("admin.organizerRequests.detail.requestedChanges") || "Requested Changes"}</Label>
                <div className="mt-1 p-3 bg-muted rounded-md space-y-2">
                  {Object.keys(selectedRequest.requested_data || {}).length > 0 ? (
                    Object.entries(selectedRequest.requested_data || {}).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex justify-between">
                        <span className="font-medium">{key.replace(/_/g, " ")}:</span>
                        <span className="text-muted-foreground">{String(value)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground">
                      {t("admin.organizerRequests.detail.noChanges") || "No text changes requested"}
                    </div>
                  )}
                </div>
              </div>

              {selectedRequest.rejection_reason && (
                <div>
                  <Label>{t("admin.organizerRequests.detail.rejectionReason") || "Rejection Reason"}</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md">
                    {selectedRequest.rejection_reason}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("admin.organizerRequests.detail.createdAt") || "Created At"}</Label>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {selectedRequest.created_at
                      ? format(new Date(selectedRequest.created_at), "MMM dd, yyyy HH:mm")
                      : "-"}
                  </div>
                </div>
                {selectedRequest.processed_at && (
                  <div>
                    <Label>{t("admin.organizerRequests.detail.processedAt") || "Processed At"}</Label>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {format(new Date(selectedRequest.processed_at), "MMM dd, yyyy HH:mm")}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedRequest?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsDetailDialogOpen(false)}
                >
                  {t("common.cancel") || "Cancel"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setIsDetailDialogOpen(false);
                    setIsRejectDialogOpen(true);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  {t("common.reject") || "Reject"}
                </Button>
                <Button
                  onClick={() => handleApprove(selectedRequest.id)}
                  disabled={approveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {t("common.approve") || "Approve"}
                </Button>
              </>
            )}
            {selectedRequest?.status !== "pending" && (
              <Button onClick={() => setIsDetailDialogOpen(false)}>
                {t("common.close") || "Close"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.organizerRequests.reject.title") || "Reject Edit Request"}</DialogTitle>
            <DialogDescription>
              {t("admin.organizerRequests.reject.subtitle") || "Please provide a reason for rejecting this request (optional)"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("admin.organizerRequests.reject.reason") || "Rejection Reason"}</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t("admin.organizerRequests.reject.placeholder") || "Enter reason for rejection..."}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectionReason("");
              }}
            >
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {t("common.reject") || "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizerRequestsManagement;

