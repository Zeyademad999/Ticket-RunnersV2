import { useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to check admin user permissions
 */
export const usePermissions = () => {
  const { toast } = useToast();

  // Listen for permission denied events from API interceptor
  useEffect(() => {
    const handlePermissionDenied = (event: CustomEvent) => {
      toast({
        title: "Access Denied",
        description: event.detail?.message || "You do not have permission to access this feature. Please contact your administrator.",
        variant: "destructive",
      });
    };

    window.addEventListener('permission-denied', handlePermissionDenied as EventListener);
    return () => {
      window.removeEventListener('permission-denied', handlePermissionDenied as EventListener);
    };
  }, [toast]);

  // Get current user from localStorage
  const currentUser = useMemo(() => {
    try {
      const userStr = localStorage.getItem("admin_user");
      if (userStr) {
        return JSON.parse(userStr);
      }
    } catch (error) {
      console.error("Error parsing admin user:", error);
    }
    return null;
  }, []);

  // Get user permissions
  const userPermissions = useMemo(() => {
    if (!currentUser) return [];
    
    // Super admins have all permissions
    if (currentUser.role === "SUPER_ADMIN" || currentUser.is_superuser) {
      return ["system_all_permissions"]; // All permissions
    }
    
    // Return user's permissions array
    return currentUser.permissions || [];
  }, [currentUser]);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    
    // Super admins have all permissions
    if (currentUser.role === "SUPER_ADMIN" || currentUser.is_superuser) {
      return true;
    }
    
    // Check if user has all permissions (either "*" or "system_all_permissions")
    if (userPermissions.includes("*") || userPermissions.includes("system_all_permissions")) {
      return true; // All permissions
    }
    
    return userPermissions.includes(permission);
  };

  /**
   * Require permission - shows error toast if user doesn't have permission
   */
  const requirePermission = (permission: string): boolean => {
    if (hasPermission(permission)) {
      return true;
    }
    
    toast({
      title: "Access Denied",
      description: "You do not have permission to access this feature. Please contact your administrator.",
      variant: "destructive",
    });
    
    return false;
  };

  /**
   * Check multiple permissions (AND logic - user must have all)
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every((perm) => hasPermission(perm));
  };

  /**
   * Check multiple permissions (OR logic - user must have at least one)
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some((perm) => hasPermission(perm));
  };

  return {
    currentUser,
    userPermissions,
    hasPermission,
    requirePermission,
    hasAllPermissions,
    hasAnyPermission,
    isSuperAdmin: currentUser?.role === "SUPER_ADMIN" || currentUser?.is_superuser || false,
  };
};

