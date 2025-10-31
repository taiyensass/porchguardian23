import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ReviewModal } from "@/components/review-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Package,
  Calendar,
  MapPin,
  Star,
  Check,
  DollarSign,
  Shield,
  X,
  CheckCircle2,
} from "lucide-react";
import type { Booking, Guardian, User } from "@shared/schema";

type BookingWithDetails = Booking & {
  guardian: Guardian & { user: User };
  customer?: User;
};

type GuardianWithUser = Guardian & { user: User };

type UserRole = "customer" | "guardian" | "admin";

// Extended User type with backend-calculated fields
type ExtendedUser = User & {
  availableRoles?: UserRole[];
  guardianProfile?: {
    id: string;
    verificationStatus: string;
    isActive: boolean;
  } | null;
};

export default function Dashboard() {
  const { toast } = useToast();
  const { user: baseUser, isLoading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  // Cast to extended user type (backend adds these fields)
  const user = baseUser as ExtendedUser | undefined;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <DashboardLayout user={user} />;
}

// ===== DASHBOARD LAYOUT WITH ROLE SWITCHER =====
function DashboardLayout({ user }: { user: ExtendedUser }) {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1]);
  const roleParam = searchParams.get('role') as UserRole | null;

  // Use available roles from backend API response (calculated server-side)
  const availableRoles: UserRole[] = user.availableRoles || ['customer'];

  // Determine selected role with priority: URL param > localStorage > default priority (admin > guardian > customer)
  const getInitialRole = (): UserRole => {
    // 1. Check URL parameter first
    if (roleParam && availableRoles.includes(roleParam)) {
      return roleParam;
    }

    // 2. Check localStorage
    const storedRole = localStorage.getItem('selectedRole') as UserRole | null;
    if (storedRole && availableRoles.includes(storedRole)) {
      return storedRole;
    }

    // 3. Default priority: admin > guardian > customer
    if (availableRoles.includes('admin')) return 'admin';
    if (availableRoles.includes('guardian')) return 'guardian';
    return 'customer';
  };

  const [selectedRole, setSelectedRole] = useState<UserRole>(getInitialRole());

  // Re-evaluate role when availableRoles changes (fixes guardian landing on customer dashboard)
  useEffect(() => {
    const newRole = getInitialRole();
    if (newRole !== selectedRole) {
      setSelectedRole(newRole);
      localStorage.setItem('selectedRole', newRole);
    }
  }, [availableRoles.join(',')]); // Depend on roles array content

  // Update URL and localStorage when role changes
  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    localStorage.setItem('selectedRole', role);
    
    // Update URL with role parameter
    const newSearchParams = new URLSearchParams(location.split('?')[1]);
    newSearchParams.set('role', role);
    setLocation(`/dashboard?${newSearchParams.toString()}`);
  };

  // Sync selectedRole with URL changes
  useEffect(() => {
    if (roleParam && availableRoles.includes(roleParam) && roleParam !== selectedRole) {
      setSelectedRole(roleParam);
      localStorage.setItem('selectedRole', roleParam);
    }
  }, [roleParam, availableRoles.join(','), selectedRole]);

  const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6 lg:px-8">
          <Link href="/">
            <div className="flex items-center gap-2 hover-elevate rounded-md px-2 py-1" data-testid="link-home">
              <Package className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold">Porchguardian</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {availableRoles.length > 1 && (
              <RoleSwitcher
                availableRoles={availableRoles}
                selectedRole={selectedRole}
                onRoleChange={handleRoleChange}
              />
            )}
            <Button variant="ghost" asChild data-testid="button-logout">
              <a href="/api/logout">Sign Out</a>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback className="text-lg">
                {userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-semibold mb-1" data-testid="text-user-name">
                Welcome, {userName}
              </h1>
              <p className="text-muted-foreground">
                {selectedRole === 'admin' && "Manage guardian approvals and platform oversight"}
                {selectedRole === 'guardian' && "Manage your guardian profile and bookings"}
                {selectedRole === 'customer' && "Manage your package deliveries"}
              </p>
            </div>
          </div>
        </div>

        {selectedRole === 'customer' && <CustomerDashboardView />}
        {selectedRole === 'guardian' && <GuardianDashboardView />}
        {selectedRole === 'admin' && <AdminDashboardView />}
      </div>
    </div>
  );
}

// ===== ROLE SWITCHER COMPONENT =====
function RoleSwitcher({
  availableRoles,
  selectedRole,
  onRoleChange,
}: {
  availableRoles: UserRole[];
  selectedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}) {
  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'customer':
        return 'Customer';
      case 'guardian':
        return 'Guardian';
      case 'admin':
        return 'Admin';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'customer':
        return <Package className="h-4 w-4" />;
      case 'guardian':
        return <Shield className="h-4 w-4" />;
      case 'admin':
        return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <Tabs value={selectedRole} onValueChange={(value) => onRoleChange(value as UserRole)}>
      <TabsList data-testid="role-switcher">
        {availableRoles.map((role) => (
          <TabsTrigger
            key={role}
            value={role}
            data-testid={`role-tab-${role}`}
            className="gap-2"
          >
            {getRoleIcon(role)}
            {getRoleLabel(role)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

// ===== CUSTOMER DASHBOARD VIEW =====
function CustomerDashboardView() {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: bookings, isLoading: bookingsLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings"],
  });

  const confirmPickupMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiRequest("POST", `/api/bookings/${bookingId}/confirm-pickup`);
      return response.json();
    },
    onSuccess: (data: { message: string; paymentStatus: string; transferId: string | null }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Success",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pendingBookings = bookings?.filter((b) => b.status === "pending") || [];
  const activeBookings = bookings?.filter((b) => b.status === "confirmed" || b.status === "in_progress") || [];
  const completedBookings = bookings?.filter((b) => b.status === "completed") || [];

  return (
    <div data-testid="customer-dashboard-view">
      <div className="flex flex-wrap gap-3 mb-8">
        <Link href="/guardians">
          <Button data-testid="button-new-booking">
            <Package className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </Link>
        <Link href="/become-guardian">
          <Button variant="outline" data-testid="button-become-guardian">
            Become a Guardian
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">
            All ({bookings?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({pendingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active">
            Active ({activeBookings.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Completed ({completedBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {bookingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : bookings && bookings.length > 0 ? (
            bookings.map((booking) => (
              <CustomerBookingCard 
                key={booking.id} 
                booking={booking} 
                onConfirmPickup={confirmPickupMutation.mutate}
                isConfirming={confirmPickupMutation.isPending}
              />
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No bookings yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start by finding a guardian in your neighborhood
                </p>
                <Link href="/guardians">
                  <Button data-testid="button-find-guardian">Find a Guardian</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingBookings.length > 0 ? (
            pendingBookings.map((booking) => (
              <CustomerBookingCard 
                key={booking.id} 
                booking={booking}
                onConfirmPickup={confirmPickupMutation.mutate}
                isConfirming={confirmPickupMutation.isPending}
              />
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                No pending bookings
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeBookings.length > 0 ? (
            activeBookings.map((booking) => (
              <CustomerBookingCard 
                key={booking.id} 
                booking={booking}
                onConfirmPickup={confirmPickupMutation.mutate}
                isConfirming={confirmPickupMutation.isPending}
              />
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                No active bookings
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedBookings.length > 0 ? (
            completedBookings.map((booking) => (
              <CustomerBookingCard 
                key={booking.id} 
                booking={booking}
                onConfirmPickup={confirmPickupMutation.mutate}
                isConfirming={confirmPickupMutation.isPending}
              />
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                No completed bookings
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CustomerBookingCard({ 
  booking, 
  onConfirmPickup,
  isConfirming 
}: { 
  booking: BookingWithDetails;
  onConfirmPickup: (id: string) => void;
  isConfirming: boolean;
}) {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const guardianName = `${booking.guardian.user.firstName || ""} ${booking.guardian.user.lastName || ""}`.trim() || "Guardian";
  const guardianInitials = guardianName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      pending: { className: "bg-yellow-600", label: "Pending" },
      confirmed: { className: "bg-blue-600", label: "Confirmed" },
      in_progress: { className: "bg-purple-600", label: "In Progress" },
      completed: { className: "bg-green-600", label: "Completed" },
      cancelled: { className: "bg-red-600", label: "Cancelled" },
    };
    const variant = variants[status] || variants.pending;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const getPaymentBadge = (paymentStatus: string) => {
    if (paymentStatus === 'held') {
      return <Badge variant="outline" className="border-yellow-600 text-yellow-600"><DollarSign className="h-3 w-3 mr-1" />Payment Held</Badge>;
    } else if (paymentStatus === 'released') {
      return <Badge variant="outline" className="border-green-600 text-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Payment Released</Badge>;
    }
    return null;
  };

  return (
    <Card className="hover-elevate transition-all" data-testid={`card-booking-${booking.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={booking.guardian.user.profileImageUrl || undefined} />
              <AvatarFallback>{guardianInitials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg mb-1">{guardianName}</CardTitle>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{booking.guardian.city}, {booking.guardian.state}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {getStatusBadge(booking.status)}
            {getPaymentBadge(booking.paymentStatus)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Delivery:</span>
            <span className="font-medium">
              {new Date(booking.deliveryDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Packages:</span>
            <span className="font-medium">{booking.packageCount}</span>
          </div>
        </div>

        {booking.packageDetails && (
          <div className="text-sm">
            <span className="text-muted-foreground">Details:</span>
            <p className="mt-1">{booking.packageDetails}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-lg font-semibold" data-testid={`text-booking-price-${booking.id}`}>
            ${booking.totalPrice}
          </span>
          <div className="flex gap-2">
            <Link href={`/guardian/${booking.guardianId}`}>
              <Button variant="outline" size="sm" data-testid={`button-view-guardian-${booking.id}`}>
                View Guardian
              </Button>
            </Link>
            {booking.status === "in_progress" && !booking.pickupConfirmedAt && (
              <Button
                size="sm"
                onClick={() => onConfirmPickup(booking.id)}
                disabled={isConfirming}
                data-testid={`button-confirm-pickup-${booking.id}`}
              >
                <Check className="mr-1 h-4 w-4" />
                Confirm Pickup
              </Button>
            )}
            {booking.status === "completed" && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowReviewModal(true)}
                data-testid={`button-review-${booking.id}`}
              >
                <Star className="mr-1 h-4 w-4" />
                Leave Review
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      <ReviewModal
        booking={booking}
        open={showReviewModal}
        onOpenChange={setShowReviewModal}
      />
    </Card>
  );
}

// ===== GUARDIAN DASHBOARD VIEW =====
function GuardianDashboardView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1]);

  // Fetch guardian profile for current user
  const { data: guardianProfile, isLoading: loadingProfile } = useQuery<GuardianWithUser>({
    queryKey: ["/api/guardians/by-user"],
    retry: false,
  });

  const { data: connectStatus, refetch: refetchConnectStatus } = useQuery<{
    hasAccount: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    requirementsCurrentlyDue?: string[];
  }>({
    queryKey: guardianProfile?.id ? [`/api/guardians/${guardianProfile.id}/connect-status`] : [],
    enabled: !!guardianProfile?.id,
  });

  const createAccountMutation = useMutation({
    mutationFn: async () => {
      if (!guardianProfile?.id) throw new Error("Guardian profile not found");
      return apiRequest("POST", `/api/guardians/${guardianProfile.id}/create-connect-account`);
    },
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Stripe account created. Setting up onboarding...",
      });
      await refetchConnectStatus();
      startOnboardingMutation.mutate();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startOnboardingMutation = useMutation({
    mutationFn: async () => {
      if (!guardianProfile?.id) throw new Error("Guardian profile not found");
      const response = await apiRequest("POST", `/api/guardians/${guardianProfile.id}/create-account-link`);
      return response.json();
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle return from Stripe onboarding
  useEffect(() => {
    if (searchParams.get('stripe_onboarding') === 'complete') {
      refetchConnectStatus();
      toast({
        title: "Onboarding Complete",
        description: "Your bank account is being verified. You'll be able to receive payouts soon!",
      });
      window.history.replaceState({}, '', '/dashboard?role=guardian');
    }

    if (searchParams.get('stripe_refresh') === 'true') {
      toast({
        title: "Session Expired",
        description: "Please try setting up your payouts again.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/dashboard?role=guardian');
    }
  }, [searchParams, refetchConnectStatus, toast]);

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="guardian-dashboard-view">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!guardianProfile) {
    return (
      <div className="text-center py-12" data-testid="guardian-dashboard-view">
        <p className="text-muted-foreground">Guardian profile not found. Please complete your guardian application.</p>
      </div>
    );
  }

  return (
    <div data-testid="guardian-dashboard-view">
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Verification Status</CardTitle>
          </CardHeader>
          <CardContent>
            {guardianProfile?.verificationStatus === 'verified' ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Verified</span>
              </div>
            ) : guardianProfile?.verificationStatus === 'pending' ? (
              <div className="flex items-center gap-2 text-yellow-600">
                <Shield className="h-5 w-5" />
                <span className="font-semibold">Pending Approval</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <X className="h-5 w-5" />
                <span className="font-semibold">Not Verified</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{guardianProfile?.totalBookings || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <p className="text-3xl font-semibold">{guardianProfile?.averageRating || "5.00"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {guardianProfile && (
        <Card className="mb-8" data-testid="card-payout-setup">
          <CardHeader>
            <CardTitle>Payout Setup</CardTitle>
          </CardHeader>
          <CardContent>
            {connectStatus?.payoutsEnabled ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-600">Payouts Enabled</p>
                  <p className="text-sm text-muted-foreground">You can now receive payments for completed bookings</p>
                </div>
              </div>
            ) : connectStatus?.hasAccount && connectStatus?.detailsSubmitted ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-yellow-100">
                  <Shield className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-semibold text-yellow-600">Verification Pending</p>
                  <p className="text-sm text-muted-foreground">Your bank account is being verified. This usually takes 1-2 business days.</p>
                </div>
              </div>
            ) : connectStatus?.hasAccount ? (
              <div>
                <p className="mb-4 text-muted-foreground">
                  Complete your payout setup to receive earnings from bookings. You'll be redirected to Stripe to securely connect your bank account.
                </p>
                <Button 
                  onClick={() => startOnboardingMutation.mutate()}
                  disabled={startOnboardingMutation.isPending}
                  data-testid="button-complete-payout-setup"
                >
                  {startOnboardingMutation.isPending ? "Loading..." : "Complete Payout Setup"}
                </Button>
              </div>
            ) : (
              <div>
                <p className="mb-4 text-muted-foreground">
                  Set up your bank account to receive earnings from package deliveries. We use Stripe to securely process payouts. Platform fee: 15%
                </p>
                <Button 
                  onClick={() => createAccountMutation.mutate()}
                  disabled={createAccountMutation.isPending}
                  data-testid="button-setup-payouts"
                >
                  {createAccountMutation.isPending ? "Creating Account..." : "Set Up Payouts"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Package Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Package tracking and management features coming soon. You'll be able to mark packages as received and track pickups.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== ADMIN DASHBOARD VIEW =====
function AdminDashboardView() {
  const { toast } = useToast();

  const { data: pendingGuardians, isLoading } = useQuery<GuardianWithUser[]>({
    queryKey: ["/api/admin/guardians/pending"],
  });

  const approveMutation = useMutation({
    mutationFn: async (guardianId: string) => {
      return apiRequest("POST", `/api/admin/guardians/${guardianId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guardians/pending"] });
      toast({
        title: "Success",
        description: "Guardian approved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (guardianId: string) => {
      return apiRequest("POST", `/api/admin/guardians/${guardianId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guardians/pending"] });
      toast({
        title: "Success",
        description: "Guardian rejected successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div data-testid="admin-dashboard-view">
      <Card>
        <CardHeader>
          <CardTitle>Pending Guardian Approvals ({pendingGuardians?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : pendingGuardians && pendingGuardians.length > 0 ? (
            <div className="space-y-4">
              {pendingGuardians.map((guardian) => {
                const guardianName = `${guardian.user.firstName || ""} ${guardian.user.lastName || ""}`.trim() || "Guardian";
                return (
                  <Card key={guardian.id} className="hover-elevate" data-testid={`card-pending-guardian-${guardian.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">{guardianName}</h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                            <MapPin className="h-4 w-4" />
                            <span>{guardian.city}, {guardian.state}</span>
                          </div>
                          <p className="text-sm">{guardian.bio}</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Price: ${guardian.pricePerPackage}/package • Max: {guardian.maxPackages} packages
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => approveMutation.mutate(guardian.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            data-testid={`button-approve-${guardian.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => rejectMutation.mutate(guardian.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            data-testid={`button-reject-${guardian.id}`}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              No pending guardian approvals
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
