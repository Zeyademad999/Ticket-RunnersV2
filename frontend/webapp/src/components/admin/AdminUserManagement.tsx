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
  Shield,
  Settings,
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
  Activity,
  Crown,
  Users,
  UserCog,
  Key,
  LogOut,
  Calendar,
  EyeOff,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: "super_admin" | "admin" | "usher" | "support";
  status: "active" | "inactive";
  lastLogin: string;
  permissions: string[];
  createdAt: string;
  profileImage?: string;
  fullName: string;
  phone?: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
}

const AdminUserManagement: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);

  // Mock admin users data
  const adminUsers: AdminUser[] = [
    {
      id: "A001",
      username: "admin",
      email: "admin@ticketrunners.com",
      fullName: "System Administrator",
      role: "super_admin",
      status: "active",
      lastLogin: "2025-08-16T10:30:00",
      permissions: ["all"],
      createdAt: "2024-01-01",
      profileImage: "/public/Portrait_Placeholder.png",
    },
    {
      id: "A002",
      username: "manager",
      email: "manager@ticketrunners.com",
      fullName: "Event Manager",
      role: "admin",
      status: "active",
      lastLogin: "2025-08-15T15:45:00",
      permissions: [
        "events_manage",
        "tickets_manage",
        "customers_view",
        "reports_view",
      ],
      createdAt: "2024-02-15",
      profileImage: "/public/Portrait_Placeholder.png",
    },
    {
      id: "A003",
      username: "usher1",
      email: "usher1@ticketrunners.com",
      fullName: "Ahmed Usher",
      role: "usher",
      status: "active",
      lastLogin: "2025-08-16T09:15:00",
      permissions: ["checkin_manage", "tickets_view"],
      createdAt: "2024-03-10",
      profileImage: "/public/Portrait_Placeholder.png",
      phone: "+20 10 1234 5678",
    },
    {
      id: "A004",
      username: "support1",
      email: "support1@ticketrunners.com",
      fullName: "Sarah Support",
      role: "support",
      status: "inactive",
      lastLogin: "2025-07-20T14:20:00",
      permissions: ["customers_manage", "tickets_view", "reports_view"],
      createdAt: "2024-04-05",
      profileImage: "/public/Portrait_Placeholder.png",
      phone: "+20 10 2345 6789",
    },
    {
      id: "A005",
      username: "usher2",
      email: "usher2@ticketrunners.com",
      fullName: "Omar Usher",
      role: "usher",
      status: "active",
      lastLogin: "2025-08-16T11:00:00",
      permissions: ["checkin_manage", "tickets_view"],
      createdAt: "2024-05-12",
      profileImage: "/public/Portrait_Placeholder.png",
      phone: "+20 10 3456 7890",
    },
  ];

  // Mock roles data
  const roles: Role[] = [
    {
      id: "super_admin",
      name: "Super Admin",
      description: "Full system access with all permissions",
      permissions: ["all"],
      userCount: 1,
    },
    {
      id: "admin",
      name: "Administrator",
      description: "Manage events, tickets, and view reports",
      permissions: [
        "events_manage",
        "tickets_manage",
        "customers_view",
        "reports_view",
      ],
      userCount: 1,
    },
    {
      id: "usher",
      name: "Usher",
      description: "Check-in tickets and view ticket information",
      permissions: ["checkin_manage", "tickets_view"],
      userCount: 2,
    },
    {
      id: "support",
      name: "Support",
      description: "Manage customers and view reports",
      permissions: ["customers_manage", "tickets_view", "reports_view"],
      userCount: 1,
    },
  ];

  // Mock permissions data
  const permissions: Permission[] = [
    {
      id: "all",
      name: "All Permissions",
      description: "Full system access",
      category: "System",
    },
    {
      id: "events_manage",
      name: "Manage Events",
      description: "Create, edit, and delete events",
      category: "Events",
    },
    {
      id: "tickets_manage",
      name: "Manage Tickets",
      description: "Create, edit, and manage tickets",
      category: "Tickets",
    },
    {
      id: "customers_manage",
      name: "Manage Customers",
      description: "View and manage customer accounts",
      category: "Customers",
    },
    {
      id: "checkin_manage",
      name: "Manage Check-ins",
      description: "Check-in tickets and view check-in logs",
      category: "Check-ins",
    },
    {
      id: "reports_view",
      name: "View Reports",
      description: "Access to analytics and reports",
      category: "Reports",
    },
    {
      id: "tickets_view",
      name: "View Tickets",
      description: "View ticket information",
      category: "Tickets",
    },
  ];

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    return adminUsers.filter((user) => {
      const matchesSearch =
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [adminUsers, searchTerm, roleFilter, statusFilter]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-purple-100 text-purple-800";
      case "admin":
        return "bg-blue-100 text-blue-800";
      case "usher":
        return "bg-green-100 text-green-800";
      case "support":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "super_admin":
        return "Super Admin";
      case "admin":
        return "Administrator";
      case "usher":
        return "Usher";
      case "support":
        return "Support";
      default:
        return role;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
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
      default:
        return status;
    }
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleViewUser = (user: AdminUser) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleDeleteUser = (userId: string) => {
    toast({
      title: "User deleted",
      description: "Admin user has been successfully deleted",
    });
  };

  const handleExportUsers = () => {
    toast({
      title: "Export successful",
      description: "Admin users data has been exported to Excel",
    });
  };

  const handleDeactivateUser = (userId: string) => {
    toast({
      title: "User deactivated",
      description: "Admin user account has been deactivated",
    });
  };

  const handleReactivateUser = (userId: string) => {
    toast({
      title: "User reactivated",
      description: "Admin user account has been reactivated",
    });
  };

  const handleForcePasswordReset = (userId: string) => {
    toast({
      title: "Password reset",
      description: "Password reset email has been sent to user",
    });
  };

  const getPermissionsForRole = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    return role ? role.permissions : [];
  };

  const getPermissionName = (permissionId: string) => {
    const permission = permissions.find((p) => p.id === permissionId);
    return permission ? permission.name : permissionId;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Admin User Management</h2>
          <p className="text-muted-foreground">
            Manage admin users, roles, and permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsRoleDialogOpen(true)}>
            <Shield className="h-4 w-4 mr-2" />
            Manage Roles
          </Button>
          <Button variant="outline" onClick={handleExportUsers}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Admin User
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
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="usher">Usher</SelectItem>
                <SelectItem value="support">Support</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Admin Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <img
                          src={
                            user.profileImage ||
                            "/public/Portrait_Placeholder.png"
                          }
                          alt={user.fullName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-medium">{user.fullName}</p>
                          <p className="text-sm text-muted-foreground">
                            @{user.username}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{user.email}</p>
                        {user.phone && (
                          <p className="text-sm text-muted-foreground">
                            {user.phone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleText(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(user.status)}>
                        {getStatusText(user.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {format(parseISO(user.createdAt), "MMM dd, yyyy")}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {user.lastLogin
                          ? format(parseISO(user.lastLogin), "MMM dd, HH:mm")
                          : "Never"}
                      </p>
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
                            onClick={() => handleViewUser(user)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Activity className="h-4 w-4 mr-2" />
                            View Activity
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Shield className="h-4 w-4 mr-2" />
                            Manage Permissions
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.status === "active" && (
                            <DropdownMenuItem
                              onClick={() => handleDeactivateUser(user.id)}
                              className="text-yellow-600"
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          )}
                          {user.status === "inactive" && (
                            <DropdownMenuItem
                              onClick={() => handleReactivateUser(user.id)}
                              className="text-green-600"
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Reactivate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleForcePasswordReset(user.id)}
                            className="text-blue-600"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Force Password Reset
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete User
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

      {/* User Details Dialog */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Admin User Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected admin user
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <div className="text-center">
                    <img
                      src={
                        selectedUser.profileImage ||
                        "/public/Portrait_Placeholder.png"
                      }
                      alt={selectedUser.fullName}
                      className="w-32 h-32 rounded-full object-cover mx-auto mb-4"
                    />
                    <h3 className="text-xl font-bold">
                      {selectedUser.fullName}
                    </h3>
                    <p className="text-muted-foreground">
                      @{selectedUser.username}
                    </p>
                    <Badge className={getRoleColor(selectedUser.role)}>
                      {getRoleText(selectedUser.role)}
                    </Badge>
                    <Badge className={getStatusColor(selectedUser.status)}>
                      {getStatusText(selectedUser.status)}
                    </Badge>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.email}
                      </p>
                    </div>
                    {selectedUser.phone && (
                      <div>
                        <p className="text-sm font-medium">Phone</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedUser.phone}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">Created Date</p>
                      <p className="text-sm text-muted-foreground">
                        {format(
                          parseISO(selectedUser.createdAt),
                          "MMM dd, yyyy"
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Last Login</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.lastLogin
                          ? format(
                              parseISO(selectedUser.lastLogin),
                              "MMM dd, yyyy HH:mm"
                            )
                          : "Never"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Permissions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedUser.permissions.map((permission) => (
                    <div
                      key={permission}
                      className="flex items-center space-x-2 p-2 bg-gray-50 rounded"
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        {getPermissionName(permission)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDetails(false)}>
              Close
            </Button>
            <Button onClick={() => handleEditUser(selectedUser!)}>
              Edit User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Admin User</DialogTitle>
            <DialogDescription>
              Update user information and role
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <Input defaultValue={selectedUser.fullName} />
                </div>
                <div>
                  <label className="text-sm font-medium">Username</label>
                  <Input defaultValue={selectedUser.username} />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" defaultValue={selectedUser.email} />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input defaultValue={selectedUser.phone || ""} />
                </div>
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <Select defaultValue={selectedUser.role}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="usher">Usher</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select defaultValue={selectedUser.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
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

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Admin User</DialogTitle>
            <DialogDescription>
              Create a new admin user account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <Input placeholder="Enter full name" />
              </div>
              <div>
                <label className="text-sm font-medium">Username</label>
                <Input placeholder="Enter username" />
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
                <label className="text-sm font-medium">Role</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="usher">Usher</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <Input type="password" placeholder="Enter password" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsAddDialogOpen(false)}>Add User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Roles Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Roles</DialogTitle>
            <DialogDescription>
              View and manage user roles and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((role) => (
                <Card key={role.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{role.name}</CardTitle>
                        <CardDescription>{role.description}</CardDescription>
                      </div>
                      <Badge className={getRoleColor(role.id)}>
                        {role.userCount} users
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Permissions:</p>
                      <div className="grid grid-cols-1 gap-1">
                        {role.permissions.map((permission) => (
                          <div
                            key={permission}
                            className="flex items-center space-x-2"
                          >
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-xs">
                              {getPermissionName(permission)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRoleDialogOpen(false)}
            >
              Close
            </Button>
            <Button onClick={() => setIsRoleDialogOpen(false)}>
              Edit Roles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUserManagement;
