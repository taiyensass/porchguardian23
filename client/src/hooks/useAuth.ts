import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface UserWithExtras extends User {
  availableRoles: string[];
  guardianProfile: {
    id: string;
    verificationStatus: string;
    isActive: boolean;
  } | null;
  credits: {
    balance: number;
    lifetimeEarned: number;
    lifetimeSpent: number;
  } | null;
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<UserWithExtras>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
