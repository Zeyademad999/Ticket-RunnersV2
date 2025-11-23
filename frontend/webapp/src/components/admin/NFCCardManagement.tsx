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
  CreditCard,
  User,
  Calendar,
  DollarSign,
  MoreHorizontal,
  Key,
  QrCode,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  UserCheck,
  UserX,
  CalendarX,
  CreditCardOff,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO, addYears, isAfter } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface NFCCard {
  id: string;
  serialNumber: string;
  customerId: string;
  customerName: string;
  status: "active" | "inactive" | "expired";
  issueDate: string;
  expiryDate: string;
  balance: number;
  lastUsed: string;
  usageCount: number;
  cardType: "standard" | "premium" | "vip";
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  hasCard: boolean;
}

const NFCCardManagement: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [selectedCard, setSelectedCard] = useState<NFCCard | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isGenerateKeyDialogOpen, setIsGenerateKeyDialogOpen] = useState(false);

  // Mock NFC cards data
  const nfcCards: NFCCard[] = [
    {
      id: "1",
      serialNumber: "NFC-001-2025",
      customerId: "C001",
      customerName: "Ahmed Hassan",
      status: "active",
      issueDate: "2025-01-15",
      expiryDate: "2026-01-15",
      balance: 500,
      lastUsed: "2025-08-15T10:30:00",
      usageCount: 25,
      cardType: "premium",
    },
    {
      id: "2",
      serialNumber: "NFC-002-2025",
      customerId: "C002",
      customerName: "Sarah Mohamed",
      status: "active",
      issueDate: "2025-02-20",
      expiryDate: "2026-02-20",
      balance: 300,
      lastUsed: "2025-08-14T15:45:00",
      usageCount: 18,
      cardType: "standard",
    },
    {
      id: "3",
      serialNumber: "NFC-003-2025",
      customerId: "C003",
      customerName: "Omar Ali",
      status: "inactive",
      issueDate: "2025-03-10",
      expiryDate: "2026-03-10",
      balance: 0,
      lastUsed: "2025-07-20T09:15:00",
      usageCount: 5,
      cardType: "standard",
    },
    {
      id: "4",
      serialNumber: "NFC-004-2025",
      customerId: "C004",
      customerName: "Fatima Ahmed",
      status: "expired",
      issueDate: "2024-06-15",
      expiryDate: "2025-06-15",
      balance: 0,
      lastUsed: "2025-05-30T14:20:00",
      usageCount: 12,
      cardType: "vip",
    },
    {
      id: "5",
      serialNumber: "NFC-005-2025",
      customerId: "C005",
      customerName: "Youssef Ibrahim",
      status: "active",
      issueDate: "2025-04-05",
      expiryDate: "2026-04-05",
      balance: 750,
      lastUsed: "2025-08-16T11:00:00",
      usageCount: 32,
      cardType: "vip",
    },
  ];

  // Mock customers data
  const customers: Customer[] = [
    {
      id: "C001",
      name: "Ahmed Hassan",
      email: "ahmed@example.com",
      phone: "+20 10 1234 5678",
      hasCard: true,
    },
    {
      id: "C002",
      name: "Sarah Mohamed",
      email: "sarah@example.com",
      phone: "+20 10 2345 6789",
      hasCard: true,
    },
    {
      id: "C003",
      name: "Omar Ali",
      email: "omar@example.com",
      phone: "+20 10 3456 7890",
      hasCard: true,
    },
    {
      id: "C004",
      name: "Fatima Ahmed",
      email: "fatima@example.com",
      phone: "+20 10 4567 8901",
      hasCard: true,
    },
    {
      id: "C005",
      name: "Youssef Ibrahim",
      email: "youssef@example.com",
      phone: "+20 10 5678 9012",
      hasCard: true,
    },
    {
      id: "C006",
      name: "Nour Hassan",
      email: "nour@example.com",
      phone: "+20 10 6789 0123",
      hasCard: false,
    },
    {
      id: "C007",
      name: "Mariam Ali",
      email: "mariam@example.com",
      phone: "+20 10 7890 1234",
      hasCard: false,
    },
  ];

  // Filter cards based on search and filters
  const filteredCards = useMemo(() => {
    return nfcCards.filter((card) => {
      const matchesSearch =
        card.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || card.status === statusFilter;
      const matchesCustomer =
        customerFilter === "all" || card.customerId === customerFilter;

      return matchesSearch && matchesStatus && matchesCustomer;
    });
  }, [nfcCards, searchTerm, statusFilter, customerFilter]);

  // Get unique customers for filter
  const uniqueCustomers = useMemo(() => {
    return customers.filter((customer) => customer.hasCard);
  }, [customers]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-yellow-100 text-yellow-800";
      case "expired":
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
      case "expired":
        return "Expired";
      default:
        return status;
    }
  };

  const getCardTypeColor = (type: string) => {
    switch (type) {
      case "vip":
        return "bg-purple-100 text-purple-800";
      case "premium":
        return "bg-blue-100 text-blue-800";
      case "standard":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCardTypeText = (type: string) => {
    switch (type) {
      case "vip":
        return "VIP";
      case "premium":
        return "Premium";
      case "standard":
        return "Standard";
      default:
        return type;
    }
  };

  const isExpired = (expiryDate: string) => {
    return isAfter(new Date(), parseISO(expiryDate));
  };

  const handleEditCard = (card: NFCCard) => {
    setSelectedCard(card);
    setIsEditDialogOpen(true);
  };

  const handleDeleteCard = (cardId: string) => {
    toast({
      title: "Card deleted",
      description: "NFC card has been successfully deleted",
    });
  };

  const handleExportCards = () => {
    toast({
      title: "Export successful",
      description: "NFC cards data has been exported to Excel",
    });
  };

  const handleGenerateKey = (cardId: string) => {
    setIsGenerateKeyDialogOpen(true);
    toast({
      title: "Key generated",
      description: "New key has been generated for the card",
    });
  };

  const handleTransferCard = (cardId: string) => {
    toast({
      title: "Card transferred",
      description: "NFC card has been successfully transferred",
    });
  };

  const handleDeactivateCard = (cardId: string) => {
    toast({
      title: "Card deactivated",
      description: "NFC card has been successfully deactivated",
    });
  };

  const handleReactivateCard = (cardId: string) => {
    toast({
      title: "Card reactivated",
      description: "NFC card has been successfully reactivated",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">NFC Card Management</h2>
          <p className="text-muted-foreground">
            Manage NFC cards, assign to users, and track usage
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCards}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsAssignDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Card
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
                placeholder="Search by serial number or customer..."
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
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {uniqueCustomers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* NFC Cards Table */}
      <Card>
        <CardHeader>
          <CardTitle>NFC Cards ({filteredCards.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{card.serialNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          ID: {card.id}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{card.customerName}</p>
                        <p className="text-sm text-muted-foreground">
                          ID: {card.customerId}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getCardTypeColor(card.cardType)}>
                        {getCardTypeText(card.cardType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(card.status)}>
                        {getStatusText(card.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {format(parseISO(card.issueDate), "MMM dd, yyyy")}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">
                          {format(parseISO(card.expiryDate), "MMM dd, yyyy")}
                        </p>
                        {isExpired(card.expiryDate) && (
                          <p className="text-xs text-red-600">Expired</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">E£ {card.balance}</p>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{card.usageCount}</p>
                        <p className="text-sm text-muted-foreground">
                          Last:{" "}
                          {card.lastUsed
                            ? format(parseISO(card.lastUsed), "MMM dd")
                            : "Never"}
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
                            onClick={() => handleEditCard(card)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Card
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleGenerateKey(card.id)}
                          >
                            <Key className="h-4 w-4 mr-2" />
                            Generate Key
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <QrCode className="h-4 w-4 mr-2" />
                            View QR Code
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Transfer Card
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {card.status === "active" && (
                            <DropdownMenuItem
                              onClick={() => handleDeactivateCard(card.id)}
                              className="text-yellow-600"
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          )}
                          {card.status === "inactive" && (
                            <DropdownMenuItem
                              onClick={() => handleReactivateCard(card.id)}
                              className="text-green-600"
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Reactivate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDeleteCard(card.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Card
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="flex-1">
              <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            </div>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nfcCards.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="flex-1">
              <CardTitle className="text-sm font-medium">
                Active Cards
              </CardTitle>
            </div>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {nfcCards.filter((card) => card.status === "active").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="flex-1">
              <CardTitle className="text-sm font-medium">
                Inactive Cards
              </CardTitle>
            </div>
            <XCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {nfcCards.filter((card) => card.status === "inactive").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <div className="flex-1">
              <CardTitle className="text-sm font-medium">
                Expired Cards
              </CardTitle>
            </div>
            <CalendarX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {nfcCards.filter((card) => card.status === "expired").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Card Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit NFC Card</DialogTitle>
            <DialogDescription>
              Update card details and settings
            </DialogDescription>
          </DialogHeader>
          {selectedCard && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Serial Number</label>
                  <Input defaultValue={selectedCard.serialNumber} />
                </div>
                <div>
                  <label className="text-sm font-medium">Customer</label>
                  <Select defaultValue={selectedCard.customerId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Card Type</label>
                  <Select defaultValue={selectedCard.cardType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select defaultValue={selectedCard.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Issue Date</label>
                  <Input type="date" defaultValue={selectedCard.issueDate} />
                </div>
                <div>
                  <label className="text-sm font-medium">Expiry Date</label>
                  <Input type="date" defaultValue={selectedCard.expiryDate} />
                </div>
                <div>
                  <label className="text-sm font-medium">Balance</label>
                  <Input type="number" defaultValue={selectedCard.balance} />
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

      {/* Assign Card Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign New NFC Card</DialogTitle>
            <DialogDescription>
              Assign a new NFC card to a customer
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
                    {customers
                      .filter((customer) => !customer.hasCard)
                      .map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Card Type</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Initial Balance</label>
                <Input type="number" placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium">Expiry Period</label>
                <Select defaultValue="1">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Year</SelectItem>
                    <SelectItem value="2">2 Years</SelectItem>
                    <SelectItem value="3">3 Years</SelectItem>
                  </SelectContent>
                </Select>
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
              Assign Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Key Dialog */}
      <Dialog
        open={isGenerateKeyDialogOpen}
        onOpenChange={setIsGenerateKeyDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New Key</DialogTitle>
            <DialogDescription>
              Generate a new key for the selected NFC card
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-2">Generated Key:</p>
              <p className="font-mono text-lg bg-white p-2 rounded border">
                NFC-KEY-{Math.random().toString(36).substr(2, 9).toUpperCase()}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Note: This key will not be automatically written to the card.
                You need to manually write it using the NFC writer.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsGenerateKeyDialogOpen(false)}
            >
              Close
            </Button>
            <Button onClick={() => setIsGenerateKeyDialogOpen(false)}>
              Copy Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NFCCardManagement;
