import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Ban,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Ticket,
  Calendar,
  DollarSign,
  MoreHorizontal,
  QrCode,
  AlertCircle,
  UserCheck,
  UserX,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Ticket {
  id: string;
  eventId: string;
  eventTitle: string;
  customerId: string;
  customerName: string;
  category: string;
  price: number;
  purchaseDate: string;
  status: "valid" | "used" | "refunded" | "banned";
  checkInTime?: string;
  dependents: number;
  ticketNumber: string;
  qrCode: string;
}

interface CheckInLog {
  id: string;
  ticketId: string;
  customerName: string;
  eventTitle: string;
  checkInTime: string;
  scanResult: "success" | "already_used" | "invalid" | "expired";
  location: string;
  usherName: string;
}

const TicketsManagement: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [showCheckInLogs, setShowCheckInLogs] = useState(false);

  // Mock tickets data
  const tickets: Ticket[] = [
    {
      id: "1",
      eventId: "1",
      eventTitle: "Summer Music Festival",
      customerId: "C001",
      customerName: "Ahmed Hassan",
      category: "VIP",
      price: 500,
      purchaseDate: "2025-07-15",
      status: "valid",
      dependents: 2,
      ticketNumber: "TKT-001-2025",
      qrCode: "QR-001-2025",
    },
    {
      id: "2",
      eventId: "1",
      eventTitle: "Summer Music Festival",
      customerId: "C002",
      customerName: "Sarah Mohamed",
      category: "Regular",
      price: 250,
      purchaseDate: "2025-07-16",
      status: "used",
      checkInTime: "2025-08-15T18:30:00",
      dependents: 0,
      ticketNumber: "TKT-002-2025",
      qrCode: "QR-002-2025",
    },
    {
      id: "3",
      eventId: "2",
      eventTitle: "Tech Innovators Meetup",
      customerId: "C003",
      customerName: "Omar Ali",
      category: "Early Bird",
      price: 200,
      purchaseDate: "2025-07-20",
      status: "valid",
      dependents: 1,
      ticketNumber: "TKT-003-2025",
      qrCode: "QR-003-2025",
    },
    {
      id: "4",
      eventId: "3",
      eventTitle: "Stand-up Comedy Night",
      customerId: "C004",
      customerName: "Fatima Ahmed",
      category: "General",
      price: 150,
      purchaseDate: "2025-07-25",
      status: "refunded",
      dependents: 0,
      ticketNumber: "TKT-004-2025",
      qrCode: "QR-004-2025",
    },
    {
      id: "5",
      eventId: "1",
      eventTitle: "Summer Music Festival",
      customerId: "C005",
      customerName: "Youssef Ibrahim",
      category: "Student",
      price: 150,
      purchaseDate: "2025-07-28",
      status: "banned",
      dependents: 0,
      ticketNumber: "TKT-005-2025",
      qrCode: "QR-005-2025",
    },
  ];

  // Mock check-in logs
  const checkInLogs: CheckInLog[] = [
    {
      id: "1",
      ticketId: "2",
      customerName: "Sarah Mohamed",
      eventTitle: "Summer Music Festival",
      checkInTime: "2025-08-15T18:30:00",
      scanResult: "success",
      location: "Main Gate",
      usherName: "Usher 1",
    },
    {
      id: "2",
      ticketId: "3",
      customerName: "Omar Ali",
      eventTitle: "Tech Innovators Meetup",
      checkInTime: "2025-09-01T10:15:00",
      scanResult: "success",
      location: "Entrance A",
      usherName: "Usher 2",
    },
    {
      id: "3",
      ticketId: "1",
      customerName: "Ahmed Hassan",
      eventTitle: "Summer Music Festival",
      checkInTime: "2025-08-15T19:45:00",
      scanResult: "already_used",
      location: "Main Gate",
      usherName: "Usher 1",
    },
  ];

  // Filter tickets based on search and filters
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesSearch =
        ticket.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.eventTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEvent =
        eventFilter === "all" || ticket.eventId === eventFilter;
      const matchesCategory =
        categoryFilter === "all" || ticket.category === categoryFilter;
      const matchesStatus =
        statusFilter === "all" || ticket.status === statusFilter;
      const matchesDate =
        dateFilter === "all" || ticket.purchaseDate.includes(dateFilter);

      return (
        matchesSearch &&
        matchesEvent &&
        matchesCategory &&
        matchesStatus &&
        matchesDate
      );
    });
  }, [
    tickets,
    searchTerm,
    eventFilter,
    categoryFilter,
    statusFilter,
    dateFilter,
  ]);

  // Get unique values for filters
  const uniqueEvents = useMemo(() => {
    return [
      ...new Set(
        tickets.map((ticket) => ({
          id: ticket.eventId,
          title: ticket.eventTitle,
        }))
      ),
    ];
  }, [tickets]);

  const uniqueCategories = useMemo(() => {
    return [...new Set(tickets.map((ticket) => ticket.category))];
  }, [tickets]);

  const uniqueDates = useMemo(() => {
    return [
      ...new Set(tickets.map((ticket) => ticket.purchaseDate.substring(0, 7))),
    ];
  }, [tickets]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "valid":
        return "bg-green-100 text-green-800";
      case "used":
        return "bg-blue-100 text-blue-800";
      case "refunded":
        return "bg-yellow-100 text-yellow-800";
      case "banned":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "valid":
        return "Valid";
      case "used":
        return "Used";
      case "refunded":
        return "Refunded";
      case "banned":
        return "Banned";
      default:
        return status;
    }
  };

  const getScanResultColor = (result: string) => {
    switch (result) {
      case "success":
        return "bg-green-100 text-green-800";
      case "already_used":
        return "bg-yellow-100 text-yellow-800";
      case "invalid":
        return "bg-red-100 text-red-800";
      case "expired":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getScanResultText = (result: string) => {
    switch (result) {
      case "success":
        return "Success";
      case "already_used":
        return "Already Used";
      case "invalid":
        return "Invalid";
      case "expired":
        return "Expired";
      default:
        return result;
    }
  };

  const handleEditTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsEditDialogOpen(true);
  };

  const handleBanTicket = (ticketId: string) => {
    toast({
      title: "Ticket banned",
      description: "Ticket has been successfully banned",
    });
  };

  const handleRefundTicket = (ticketId: string) => {
    toast({
      title: "Ticket refunded",
      description: "Ticket has been successfully refunded",
    });
  };

  const handleExportTickets = () => {
    toast({
      title: "Export successful",
      description: "Tickets data has been exported to Excel",
    });
  };

  const handleAssignTicket = () => {
    setIsAssignDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tickets Management</h2>
          <p className="text-muted-foreground">
            Manage tickets, check-in logs, and ticket operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCheckInLogs(!showCheckInLogs)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Check-in Logs
          </Button>
          <Button variant="outline" onClick={handleExportTickets}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleAssignTicket}>
            <Plus className="h-4 w-4 mr-2" />
            Assign Ticket
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {uniqueEvents.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="used">Used</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Purchase Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                {uniqueDates.map((date) => (
                  <SelectItem key={date} value={date}>
                    {format(parseISO(date + "-01"), "MMMM yyyy")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets ({filteredTickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ticket.ticketNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          Dependents: {ticket.dependents}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ticket.customerName}</p>
                        <p className="text-sm text-muted-foreground">
                          ID: {ticket.customerId}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{ticket.eventTitle}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ticket.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {format(parseISO(ticket.purchaseDate), "MMM dd, yyyy")}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(ticket.status)}>
                        {getStatusText(ticket.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">E£ {ticket.price}</p>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleEditTicket(ticket)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Ticket
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <QrCode className="h-4 w-4 mr-2" />
                            View QR Code
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {ticket.status === "valid" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleRefundTicket(ticket.id)}
                                className="text-yellow-600"
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refund Ticket
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleBanTicket(ticket.id)}
                                className="text-red-600"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Ban Ticket
                              </DropdownMenuItem>
                            </>
                          )}
                          {ticket.status === "banned" && (
                            <DropdownMenuItem className="text-green-600">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Unban Ticket
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Check-in Logs */}
      {showCheckInLogs && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Real-time Check-in Logs
            </CardTitle>
            <CardDescription>
              Live check-in activity and scan results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Scan Result</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Usher</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkInLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <p className="font-medium">{log.customerName}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{log.eventTitle}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {format(
                            parseISO(log.checkInTime),
                            "MMM dd, yyyy HH:mm"
                          )}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge className={getScanResultColor(log.scanResult)}>
                          {getScanResultText(log.scanResult)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{log.location}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{log.usherName}</p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Ticket Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ticket</DialogTitle>
            <DialogDescription>
              Update ticket details and status
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Ticket Number</label>
                  <Input defaultValue={selectedTicket.ticketNumber} />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select defaultValue={selectedTicket.category}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIP">VIP</SelectItem>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Student">Student</SelectItem>
                      <SelectItem value="Early Bird">Early Bird</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Price</label>
                  <Input type="number" defaultValue={selectedTicket.price} />
                </div>
                <div>
                  <label className="text-sm font-medium">Dependents</label>
                  <Input
                    type="number"
                    defaultValue={selectedTicket.dependents}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select defaultValue={selectedTicket.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="valid">Valid</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => setIsEditDialogOpen(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Ticket Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Ticket</DialogTitle>
            <DialogDescription>
              Manually assign a ticket to a customer without payment flow
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Customer</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="C001">Ahmed Hassan</SelectItem>
                    <SelectItem value="C002">Sarah Mohamed</SelectItem>
                    <SelectItem value="C003">Omar Ali</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Event</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Summer Music Festival</SelectItem>
                    <SelectItem value="2">Tech Innovators Meetup</SelectItem>
                    <SelectItem value="3">Stand-up Comedy Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="Regular">Regular</SelectItem>
                    <SelectItem value="Student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Dependents</label>
                <Input type="number" placeholder="0" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAssignDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => setIsAssignDialogOpen(false)}>
              Assign Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketsManagement;
