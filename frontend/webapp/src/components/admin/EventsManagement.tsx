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
import { Switch } from "@/components/ui/switch";
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
  BarChart3,
  Users,
  Ticket,
  DollarSign,
  Calendar,
  MapPin,
  MoreHorizontal,
  Settings,
  UserCheck,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Event {
  id: string;
  title: string;
  organizer: string;
  date: string;
  time: string;
  location: string;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  category: string;
  totalTickets: number;
  ticketsSold: number;
  revenue: number;
  commission: number;
  payout: number;
  ticketTransferEnabled: boolean;
  ticketLimit: number;
  usheringAccounts: number;
  imageUrl: string;
  description: string;
}

const EventsManagement: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [organizerFilter, setOrganizerFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Mock events data
  const events: Event[] = [
    {
      id: "1",
      title: "Summer Music Festival",
      organizer: "EventPro LLC",
      date: "2025-08-15",
      time: "18:00",
      location: "El Sawy Culturewheel, Zamalek",
      status: "upcoming",
      category: "Music",
      totalTickets: 500,
      ticketsSold: 470,
      revenue: 117500,
      commission: 11750,
      payout: 105750,
      ticketTransferEnabled: true,
      ticketLimit: 5,
      usheringAccounts: 3,
      imageUrl: "/public/event1.jpg",
      description:
        "A spectacular summer music festival featuring local and international artists.",
    },
    {
      id: "2",
      title: "Tech Innovators Meetup",
      organizer: "TechHub Egypt",
      date: "2025-09-01",
      time: "10:00",
      location: "Greek Campus, Downtown Cairo",
      status: "upcoming",
      category: "Technology",
      totalTickets: 200,
      ticketsSold: 150,
      revenue: 45000,
      commission: 4500,
      payout: 40500,
      ticketTransferEnabled: false,
      ticketLimit: 2,
      usheringAccounts: 2,
      imageUrl: "/public/event2.jpg",
      description:
        "Join tech enthusiasts and innovators for a day of networking and learning.",
    },
    {
      id: "3",
      title: "Stand-up Comedy Night",
      organizer: "Comedy Club Cairo",
      date: "2025-08-22",
      time: "20:30",
      location: "Room Art Space, New Cairo",
      status: "ongoing",
      category: "Entertainment",
      totalTickets: 150,
      ticketsSold: 120,
      revenue: 18000,
      commission: 1800,
      payout: 16200,
      ticketTransferEnabled: true,
      ticketLimit: 4,
      usheringAccounts: 1,
      imageUrl: "/public/event3.jpg",
      description: "An evening of laughter with Egypt's top comedians.",
    },
    {
      id: "4",
      title: "Modern Art Exhibition",
      organizer: "Art Gallery Egypt",
      date: "2025-07-10",
      time: "16:00",
      location: "Cairo Opera House",
      status: "completed",
      category: "Art",
      totalTickets: 300,
      ticketsSold: 280,
      revenue: 56000,
      commission: 5600,
      payout: 50400,
      ticketTransferEnabled: false,
      ticketLimit: 3,
      usheringAccounts: 2,
      imageUrl: "/public/event4.jpg",
      description: "Exhibition showcasing contemporary Egyptian artists.",
    },
  ];

  // Filter events based on search and filters
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.organizer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || event.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || event.category === categoryFilter;
      const matchesLocation =
        locationFilter === "all" || event.location.includes(locationFilter);
      const matchesOrganizer =
        organizerFilter === "all" || event.organizer === organizerFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory &&
        matchesLocation &&
        matchesOrganizer
      );
    });
  }, [
    events,
    searchTerm,
    statusFilter,
    categoryFilter,
    locationFilter,
    organizerFilter,
  ]);

  // Get unique values for filters
  const uniqueCategories = useMemo(() => {
    return [...new Set(events.map((event) => event.category))];
  }, [events]);

  const uniqueLocations = useMemo(() => {
    return [
      ...new Set(events.map((event) => event.location.split(",")[0].trim())),
    ];
  }, [events]);

  const uniqueOrganizers = useMemo(() => {
    return [...new Set(events.map((event) => event.organizer))];
  }, [events]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800";
      case "ongoing":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "upcoming":
        return "Upcoming";
      case "ongoing":
        return "Ongoing";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsEditDialogOpen(true);
  };

  const handleViewEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsViewDialogOpen(true);
  };

  const handleDeleteEvent = (eventId: string) => {
    toast({
      title: "Event deleted",
      description: "Event has been successfully deleted",
    });
  };

  const handleExportEvents = () => {
    toast({
      title: "Export successful",
      description: "Events data has been exported to Excel",
    });
  };

  const handleToggleTransfer = (eventId: string, enabled: boolean) => {
    toast({
      title: "Transfer settings updated",
      description: `Ticket transfers ${
        enabled ? "enabled" : "disabled"
      } for this event`,
    });
  };

  const calculatePercentage = (sold: number, total: number) => {
    return total > 0 ? (sold / total) * 100 : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Events Management</h2>
          <p className="text-muted-foreground">
            Manage all events, their details, and analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportEvents}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Event
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
                placeholder="Search events..."
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
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
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

            <Select value={organizerFilter} onValueChange={setOrganizerFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Organizer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizers</SelectItem>
                {uniqueOrganizers.map((organizer) => (
                  <SelectItem key={organizer} value={organizer}>
                    {organizer}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Events ({filteredEvents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Organizer</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <img
                          src={event.imageUrl}
                          alt={event.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {event.category}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{event.organizer}</p>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {format(parseISO(event.date), "MMM dd, yyyy")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {event.time}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{event.location}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(event.status)}>
                        {getStatusText(event.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {event.ticketsSold}/{event.totalTickets}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {calculatePercentage(
                            event.ticketsSold,
                            event.totalTickets
                          ).toFixed(1)}
                          %
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          E£ {event.revenue.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Commission: E£ {event.commission.toLocaleString()}
                        </p>
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
                            onClick={() => handleViewEvent(event)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEditEvent(event)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Event
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Users className="h-4 w-4 mr-2" />
                            Manage Ushers
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Ticket className="h-4 w-4 mr-2" />
                            Manage Tickets
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Event
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

      {/* Event Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected event
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <img
                    src={selectedEvent.imageUrl}
                    alt={selectedEvent.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold">{selectedEvent.title}</h3>
                    <p className="text-muted-foreground">
                      {selectedEvent.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Organizer</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedEvent.organizer}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Category</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedEvent.category}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Date & Time</p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(selectedEvent.date), "MMM dd, yyyy")}{" "}
                        at {selectedEvent.time}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedEvent.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge className={getStatusColor(selectedEvent.status)}>
                      {getStatusText(selectedEvent.status)}
                    </Badge>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={selectedEvent.ticketTransferEnabled}
                        onCheckedChange={(checked) =>
                          handleToggleTransfer(selectedEvent.id, checked)
                        }
                      />
                      <span className="text-sm">Ticket Transfers</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Ticket Sales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {selectedEvent.ticketsSold}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      of {selectedEvent.totalTickets} sold
                    </p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs">
                        <span>Progress</span>
                        <span>
                          {calculatePercentage(
                            selectedEvent.ticketsSold,
                            selectedEvent.totalTickets
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${calculatePercentage(
                              selectedEvent.ticketsSold,
                              selectedEvent.totalTickets
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      E£ {selectedEvent.revenue.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Commission: E£ {selectedEvent.commission.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Payout</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      E£ {selectedEvent.payout.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pending payout
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </Button>
            <Button onClick={() => handleEditEvent(selectedEvent!)}>
              Edit Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update event details and settings
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Event Title</label>
                  <Input defaultValue={selectedEvent.title} />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select defaultValue={selectedEvent.category}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Music">Music</SelectItem>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Art">Art</SelectItem>
                      <SelectItem value="Entertainment">
                        Entertainment
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <Input type="date" defaultValue={selectedEvent.date} />
                </div>
                <div>
                  <label className="text-sm font-medium">Time</label>
                  <Input type="time" defaultValue={selectedEvent.time} />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input defaultValue={selectedEvent.location} />
                </div>
                <div>
                  <label className="text-sm font-medium">Total Tickets</label>
                  <Input
                    type="number"
                    defaultValue={selectedEvent.totalTickets}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Ticket Limit</label>
                  <Input
                    type="number"
                    defaultValue={selectedEvent.ticketLimit}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch defaultChecked={selectedEvent.ticketTransferEnabled} />
                <span className="text-sm">Enable Ticket Transfers</span>
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
    </div>
  );
};

export default EventsManagement;
