import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Package, ArrowLeft } from "lucide-react";

export default function BecomeGuardian() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();

  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [pricePerPackage, setPricePerPackage] = useState("5.00");
  const [maxPackages, setMaxPackages] = useState(5);

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

  const createGuardianMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/guardians", {
        userId: user?.id,
        bio,
        address,
        city,
        state,
        zipCode,
        pricePerPackage,
        maxPackages,
        isActive: true,
      });
      return response.json();
    },
    onSuccess: async (createdGuardian) => {
      // Set the guardian data in the cache immediately to avoid 404
      queryClient.setQueryData(["/api/guardians/by-user"], createdGuardian);
      
      // Invalidate all guardian-related queries to refetch later
      queryClient.invalidateQueries({ queryKey: ["/api/guardians"] });
      
      // CRITICAL: Invalidate auth user to refresh availableRoles
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Success!",
        description: "You're now a Porchguardian! Customers can now find you.",
      });
      
      // Small delay to ensure database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Redirect to guardian dashboard with explicit role parameter
      navigate("/dashboard?role=guardian");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to create guardian profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createGuardianMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6 lg:px-8">
          <Link href="/">
            <div className="flex items-center gap-2 hover-elevate rounded-md px-2 py-1" data-testid="link-home">
              <Package className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold">Porchguardian</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" data-testid="button-dashboard">
                Dashboard
              </Button>
            </Link>
            <Button variant="ghost" asChild data-testid="button-logout">
              <a href="/api/logout">Sign Out</a>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 lg:px-8">
        {/* Back Button */}
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold mb-2">Become a Guardian</h1>
          <p className="text-lg text-muted-foreground">
            Help your neighbors and earn money by accepting packages while they're away
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Guardian Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="bio">About You</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell potential customers about yourself and why you'd make a great guardian..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  data-testid="input-bio"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Share your background and what makes you trustworthy
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Address</h3>
                
                <div>
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St"
                    data-testid="input-address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="San Francisco"
                      data-testid="input-city"
                    />
                  </div>

                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="CA"
                      maxLength={2}
                      data-testid="input-state"
                    />
                  </div>

                  <div>
                    <Label htmlFor="zipCode">Zip Code</Label>
                    <Input
                      id="zipCode"
                      type="text"
                      required
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="94102"
                      maxLength={10}
                      data-testid="input-zip"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Pricing & Capacity</h3>

                <div>
                  <Label htmlFor="pricePerPackage">Price Per Package ($)</Label>
                  <Input
                    id="pricePerPackage"
                    type="number"
                    step="0.01"
                    min="1"
                    max="100"
                    required
                    value={pricePerPackage}
                    onChange={(e) => setPricePerPackage(e.target.value)}
                    data-testid="input-price"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Set a competitive price for your area (typically $3-$10 per package)
                  </p>
                </div>

                <div>
                  <Label htmlFor="maxPackages">Maximum Packages</Label>
                  <Input
                    id="maxPackages"
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={maxPackages}
                    onChange={(e) => setMaxPackages(parseInt(e.target.value) || 1)}
                    data-testid="input-max-packages"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    How many packages can you accept at once?
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={createGuardianMutation.isPending}
                  data-testid="button-submit"
                >
                  {createGuardianMutation.isPending ? "Creating Profile..." : "Become a Guardian"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Benefits Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2">Earn Money</div>
              <p className="text-sm text-muted-foreground">
                Set your own rates and earn extra income helping neighbors
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2">Flexible</div>
              <p className="text-sm text-muted-foreground">
                Choose when you're available and how many packages to accept
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2">Build Community</div>
              <p className="text-sm text-muted-foreground">
                Connect with your neighbors and strengthen your community
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
