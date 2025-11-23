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
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  MoreHorizontal,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  CreditCard,
  Ticket,
  MapPin,
  Star,
  StarOff,
  Repeat,
  Activity,
  Ban,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "banned";
  registrationDate: string;
  lastLogin: string;
  totalBookings: number;
  totalSpent: number;
  nfcCardId?: string;
  attendedEvents: number;
  recurrentUser: boolean;
  location: string;
  profileImage?: string;
}

interface CustomerBooking {
  id: string;
  eventTitle: string;
  date: string;
  tickets: number;
  amount: number;
  status: "confirmed" | "cancelled" | "refunded";
}

interface CustomerActivity {
  id: string;
  type: "login" | "booking" | "checkin" | "payment" | "refund";
  description: string;
  timestamp: string;
  eventTitle?: string;
  amount?: number;
}

const CustomerManagement: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);

  // Mock customers data
  const customers: Customer[] = [
    {
      id: "C001",
      name: "Ahmed Hassan",
      email: "ahmed.hassan@example.com",
      phone: "+20 10 1234 5678",
      status: "active",
      registrationDate: "2024-01-15",
      lastLogin: "2025-08-16T10:30:00",
      totalBookings: 8,
      totalSpent: 2500,
      nfcCardId: "NFC-001-2025",
      attendedEvents: 6,
      recurrentUser: true,
      location: "Cairo, Egypt",
      profileImage: "/public/Portrait_Placeholder.png",
    },
    {
      id: "C002",
      name: "Sarah Mohamed",
      email: "sarah.mohamed@example.com",
      phone: "+20 10 2345 6789",
      status: "active",
      registrationDate: "2024-02-20",
      lastLogin: "2025-08-15T15:45:00",
      totalBookings: 5,
      totalSpent: 1800,
      nfcCardId: "NFC-002-2025",
      attendedEvents: 4,
      recurrentUser: true,
      location: "Alexandria, Egypt",
      profileImage: "/public/Portrait_Placeholder.png",
    },
    {
      id: "C003",
      name: "Omar Ali",
      email: "omar.ali@example.com",
      phone: "+20 10 3456 7890",
      status: "inactive",
      registrationDate: "2024-03-10",
      lastLogin: "2025-07-20T09:15:00",
      totalBookings: 3,
      totalSpent: 900,
      attendedEvents: 2,
      recurrentUser: false,
      location: "Giza, Egypt",
      profileImage: "/public/Portrait_Placeholder.png",
    },
    {
      id: "C004",
      name: "Fatima Ahmed",
      email: "fatima.ahmed@example.com",
      phone: "+20 10 4567 8901",
      status: "banned",
      registrationDate: "2024-04-05",
      lastLogin: "2025-06-15T14:20:00",
      totalBookings: 2,
      totalSpent: 600,
      attendedEvents: 1,
      recurrentUser: false,
      location: "Cairo, Egypt",
      profileImage: "/public/Portrait_Placeholder.png",
    },
    {
      id: "C005",
      name: "Youssef Ibrahim",
      email: "youssef.ibrahim@example.com",
      phone: "+20 10 5678 9012",
      status: "active",
      registrationDate: "2024-05-12",
      lastLogin: "2025-08-16T11:00:00",
      totalBookings: 12,
      totalSpent: 4200,
      nfcCardId: "NFC-005-2025",
      attendedEvents: 10,
      recurrentUser: true,
      location: "Cairo, Egypt",
      profileImage: "/public/Portrait_Placeholder.png",
    },
  ];

  // Mock customer bookings
  const customerBookings: CustomerBooking[] = [
    {
      id: "B001",
      eventTitle: "Summer Music Festival",
      date: "2025-08-15",
      tickets: 2,
      amount: 500,
      status: "confirmed",
    },
    {
      id: "B002",
      eventTitle: "Tech Innovators Meetup",
      date: "2025-09-01",
      tickets: 1,
      amount: 200,
      status: "confirmed",
    },
    {
      id: "B003",
      eventTitle: "Stand-up Comedy Night",
      date: "2025-08-22",
      tickets: 3,
      amount: 450,
      status: "cancelled",
    },
  ];

  // Mock customer activities
  const customerActivities: CustomerActivity[] = [
    {
      id: "A001",
      type: "login",
      description: "User logged in",
      timestamp: "2025-08-16T10:30:00",
    },
    {
      id: "A002",
      type: "booking",
      description: "Booked tickets for Summer Music Festival",
      timestamp: "2025-07-15T14:20:00",
      eventTitle: "Summer Music Festival",
      amount: 500,
    },
    {
      id: "A003",
      type: "checkin",
      description: "Checked in at event",
      timestamp: "2025-08-15T18:30:00",
      eventTitle: "Summer Music Festival",
    },
    {
      id: "A004",
      type: "payment",
      description: "Payment processed",
      timestamp: "2025-07-15T14:25:00",
      amount: 500,
    },
  ];

  // Filter customers based on search and filters
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm);
      const matchesStatus =
        statusFilter === "all" || customer.status === statusFilter;
      const matchesLocation =
        locationFilter === "all" || customer.location.includes(locationFilter);

      return matchesSearch && matchesStatus && matchesLocation;
    });
  }, [customers, searchTerm, statusFilter, locationFilter]);

  // Get unique locations for filter
  const uniqueLocations = useMemo(() => {
    return [...new Set(customers.map((customer) => customer.location))];
  }, [customers]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-yellow-100 text-yellow-800";
      case "banned":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "inactive":
        return "Inactive";
      case "banned":
        return "Banned";
      default:
        return status;
    }
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case "login":
        return <User className="h-4 w-4" />;
      case "booking":
        return <Ticket className="h-4 w-4" />;
      case "checkin":
        return <CheckCircle className="h-4 w-4" />;
      case "payment":
        return <DollarSign className="h-4 w-4" />;
      case "refund":
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditDialogOpen(true);
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDetails(true);
  };

  const handleDeleteCustomer = (customerId: string) => {
    toast({
      title: "Customer deleted",
      description: "Customer has been successfully deleted",
    });
  };

  const handleExportCustomers = () => {
    toast({
      title: "Export successful",
      description: "Customers data has been exported to Excel",
    });
  };

  const handleDeactivateCustomer = (customerId: string) => {
    toast({
      title: "Customer deactivated",
      description: "Customer account has been deactivated",
    });
  };

  const handleReactivateCustomer = (customerId: string) => {
    toast({
      title: "Customer reactivated",
      description: "Customer account has been reactivated",
    });
  };

  const handleBanCustomer = (customerId: string) => {
    toast({
      title: "Customer banned",
      description: "Customer account has been banned",
    });
  };

  const handleUnbanCustomer = (customerId: string) => {
    toast({
      title: "Customer unbanned",
      description: "Customer account has been unbanned",
    });
  };

  const handleForcePasswordReset = (customerId: string) => {
    toast({
      title: "Password reset",
      description: "Password reset email has been sent to customer",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Customer Management</h2>
          <p className="text-muted-foreground">
            Manage customer accounts, profiles, and activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCustomers}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {uniqueLocations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Spent</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <img
                          src={
                            customer.profileImage ||
                            "/public/Portrait_Placeholder.png"
                          }
                          alt={customer.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ID: {customer.id}
                          </p>
                          {customer.recurrentUser && (
                            <Badge variant="outline" className="mt-1">
                              <Repeat className="h-3 w-3 mr-1" />
                              Recurrent
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{customer.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {customer.phone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(customer.status)}>
                        {getStatusText(customer.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {format(
                          parseISO(customer.registrationDate),
                          "MMM dd, yyyy"
                        )}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {customer.lastLogin
                          ? format(
                              parseISO(customer.lastLogin),
                              "MMM dd, HH:mm"
                            )
                          : "Never"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{customer.totalBookings}</p>
                        <p className="text-sm text-muted-foreground">
                          Attended: {customer.attendedEvents}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">E£ {customer.totalSpent}</p>
                        {customer.nfcCardId && (
                          <p className="text-sm text-muted-foreground">
                            NFC: {customer.nfcCardId}
                          </p>
                        )}
                      </div>
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
                            onClick={() => handleViewCustomer(customer)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEditCustomer(customer)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Customer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Ticket className="h-4 w-4 mr-2" />
                            View Bookings
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <CreditCard className="h-4 w-4 mr-2" />
                            View NFC Card
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Activity className="h-4 w-4 mr-2" />
                            View Activity
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {customer.status === "active" && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDeactivateCustomer(customer.id)
                                }
                                className="text-yellow-600"
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleBanCustomer(customer.id)}
                                className="text-red-600"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Ban Customer
                              </DropdownMenuItem>
                            </>
                          )}
                          {customer.status === "inactive" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleReactivateCustomer(customer.id)
                              }
                              className="text-green-600"
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Reactivate
                            </DropdownMenuItem>
                          )}
                          {customer.status === "banned" && (
                            <DropdownMenuItem
                              onClick={() => handleUnbanCustomer(customer.id)}
                              className="text-green-600"
                            >
                              <Unlock className="h-4 w-4 mr-2" />
                              Unban Customer
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() =>
                              handleForcePasswordReset(customer.id)
                            }
                            className="text-blue-600"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Force Password Reset
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteCustomer(customer.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Customer
                          </DropdownMenuItem>
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

      {/* Customer Details Dialog */}
      <Dialog open={showCustomerDetails} onOpenChange={setShowCustomerDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected customer
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <div className="text-center">
                    <img
                      src={
                        selectedCustomer.profileImage ||
                        "/public/Portrait_Placeholder.png"
                      }
                      alt={selectedCustomer.name}
                      className="w-32 h-32 rounded-full object-cover mx-auto mb-4"
                    />
                    <h3 className="text-xl font-bold">
                      {selectedCustomer.name}
                    </h3>
                    <p className="text-muted-foreground">
                      {selectedCustomer.email}
                    </p>
                    <Badge className={getStatusColor(selectedCustomer.status)}>
                      {getStatusText(selectedCustomer.status)}
                    </Badge>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCustomer.phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCustomer.location}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Registration Date</p>
                      <p className="text-sm text-muted-foreground">
                        {format(
                          parseISO(selectedCustomer.registrationDate),
                          "MMM dd, yyyy"
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Last Login</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCustomer.lastLogin
                          ? format(
                              parseISO(selectedCustomer.lastLogin),
                              "MMM dd, yyyy HH:mm"
                            )
                          : "Never"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Total Bookings</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCustomer.totalBookings}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Total Spent</p>
                      <p className="text-sm text-muted-foreground">
                        E£ {selectedCustomer.totalSpent}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Attended Events</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCustomer.attendedEvents}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">NFC Card</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCustomer.nfcCardId || "No NFC card"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Recent Activity</h4>
                <div className="space-y-2">
                  {customerActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                    >
                      {getActivityTypeIcon(activity.type)}
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {activity.description}
                        </p>
                        {activity.eventTitle && (
                          <p className="text-xs text-muted-foreground">
                            {activity.eventTitle}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {format(
                            parseISO(activity.timestamp),
                            "MMM dd, HH:mm"
                          )}
                        </p>
                        {activity.amount && (
                          <p className="text-xs font-medium">
                            E£ {activity.amount}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCustomerDetails(false)}
            >
              Close
            </Button>
            <Button onClick={() => handleEditCustomer(selectedCustomer!)}>
              Edit Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information and settings
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input defaultValue={selectedCustomer.name} />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" defaultValue={selectedCustomer.email} />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input defaultValue={selectedCustomer.phone} />
                </div>
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <Input defaultValue={selectedCustomer.location} />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select defaultValue={selectedCustomer.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
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

      {/* Add Customer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>Create a new customer account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input placeholder="Enter full name" />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input type="email" placeholder="Enter email address" />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input placeholder="Enter phone number" />
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <Input placeholder="Enter location" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsAddDialogOpen(false)}>
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerManagement;
