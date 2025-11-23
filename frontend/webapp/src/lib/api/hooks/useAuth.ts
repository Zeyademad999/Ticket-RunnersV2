import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthService } from "../services/auth";
import { LoginRequest, SignupRequest, UserInfo } from "../types";

// Query keys
export const authKeys = {
  all: ["auth"] as const,
  user: () => [...authKeys.all, "user"] as const,
  profile: () => [...authKeys.all, "profile"] as const,
};

/**
 * Hook to get current user profile
 */
export const useCurrentUser = () => {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: () => AuthService.getCurrentUser(),
    enabled: AuthService.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors
      if (error.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * Hook for user login
 */
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => AuthService.login(credentials),
    onSuccess: (data) => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
      queryClient.invalidateQueries({ queryKey: authKeys.profile() });

      // Set user data in cache
      queryClient.setQueryData(authKeys.user(), data.user);
    },
    onError: (error: any) => {
      console.error("Login failed:", error);
    },
  });
};

/**
 * Hook for user signup
 */
export const useSignup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: SignupRequest) => AuthService.signup(userData),
    onSuccess: (data) => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
      queryClient.invalidateQueries({ queryKey: authKeys.profile() });

      // Set user data in cache
      queryClient.setQueryData(authKeys.user(), data.user);
    },
    onError: (error: any) => {
      console.error("Signup failed:", error);
    },
  });
};

/**
 * Hook for user logout
 */
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => AuthService.logout(),
    onSuccess: () => {
      // Clear all queries from cache
      queryClient.clear();

      // Remove user data from cache
      queryClient.removeQueries({ queryKey: authKeys.user() });
      queryClient.removeQueries({ queryKey: authKeys.profile() });
    },
    onError: (error: any) => {
      console.error("Logout failed:", error);
      // Still clear cache even if API call fails
      queryClient.clear();
    },
  });
};

/**
 * Hook for forgot password
 */
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (email: string) => AuthService.forgotPassword(email),
    onError: (error: any) => {
      console.error("Forgot password failed:", error);
    },
  });
};

/**
 * Hook for reset password
 */
export const useResetPassword = () => {
  return useMutation({
    mutationFn: ({
      token,
      newPassword,
    }: {
      token: string;
      newPassword: string;
    }) => AuthService.resetPassword(token, newPassword),
    onError: (error: any) => {
      console.error("Reset password failed:", error);
    },
  });
};

/**
 * Hook for email verification
 */
export const useVerifyEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => AuthService.verifyEmail(token),
    onSuccess: () => {
      // Refetch user data to update verification status
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
    },
    onError: (error: any) => {
      console.error("Email verification failed:", error);
    },
  });
};

/**
 * Hook for resending verification email
 */
export const useResendVerificationEmail = () => {
  return useMutation({
    mutationFn: (email: string) => AuthService.resendVerificationEmail(email),
    onError: (error: any) => {
      console.error("Resend verification email failed:", error);
    },
  });
};

/**
 * Hook for changing password
 */
export const useChangePassword = () => {
  return useMutation({
    mutationFn: ({
      oldPassword,
      newPassword,
    }: {
      oldPassword: string;
      newPassword: string;
    }) => AuthService.changePassword(oldPassword, newPassword),
    onError: (error: any) => {
      console.error("Change password failed:", error);
    },
  });
};

/**
 * Hook to check if user is authenticated
 */
export const useIsAuthenticated = () => {
  return useQuery({
    queryKey: authKeys.all,
    queryFn: () => AuthService.isAuthenticated(),
    staleTime: Infinity, // This doesn't change often
    cacheTime: Infinity,
  });
};

/**
 * Hook to get auth token
 */
export const useAuthToken = () => {
  return useQuery({
    queryKey: [...authKeys.all, "token"],
    queryFn: () => AuthService.getAuthToken(),
    staleTime: Infinity,
    cacheTime: Infinity,
  });
};
