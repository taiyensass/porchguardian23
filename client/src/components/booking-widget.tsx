import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Calendar } from "lucide-react";
import type { Guardian } from "@shared/schema";

interface BookingWidgetProps {
  guardian: Guardian;
}

export function BookingWidget({ guardian }: BookingWidgetProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [deliveryDate, setDeliveryDate] = useState("");
  const [packageCount, setPackageCount] = useState(1);
  const [packageDetails, setPackageDetails] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      const totalPrice = Number(guardian.pricePerPackage) * packageCount;
      return apiRequest("POST", "/api/bookings", {
        guardianId: guardian.id,
        deliveryDate: new Date(deliveryDate).toISOString(),
        packageCount,
        packageDetails,
        specialInstructions,
        totalPrice,
        status: "pending",
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      // Navigate to checkout page for payment
      navigate(`/checkout/${data.id}`);
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
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to book a guardian.",
      });
      window.location.href = "/api/login";
      return;
    }
    createBookingMutation.mutate();
  };

  const totalPrice = Number(guardian.pricePerPackage) * packageCount;
  const minDate = new Date().toISOString().split("T")[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between">
          <span className="text-3xl font-semibold" data-testid="text-booking-price">
            ${guardian.pricePerPackage}
          </span>
          <span className="text-sm text-muted-foreground font-normal">per package</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="deliveryDate">Expected Delivery Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="deliveryDate"
                type="date"
                required
                min={minDate}
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="pl-10"
                data-testid="input-delivery-date"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="packageCount">Number of Packages</Label>
            <Input
              id="packageCount"
              type="number"
              min={1}
              max={guardian.maxPackages}
              required
              value={packageCount}
              onChange={(e) => setPackageCount(Math.min(Math.max(1, parseInt(e.target.value) || 1), guardian.maxPackages))}
              data-testid="input-package-count"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Max {guardian.maxPackages} packages
            </p>
          </div>

          <div>
            <Label htmlFor="packageDetails">Package Details (Optional)</Label>
            <Textarea
              id="packageDetails"
              placeholder="Describe your packages (size, contents, etc.)"
              value={packageDetails}
              onChange={(e) => setPackageDetails(e.target.value)}
              rows={3}
              data-testid="input-package-details"
            />
          </div>

          <div>
            <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
            <Textarea
              id="specialInstructions"
              placeholder="Any special handling or delivery instructions"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={3}
              data-testid="input-special-instructions"
            />
          </div>

          <div className="pt-4 border-t space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                ${guardian.pricePerPackage} × {packageCount} package{packageCount > 1 ? "s" : ""}
              </span>
              <span className="font-semibold">${totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span data-testid="text-total-price">${totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={createBookingMutation.isPending || !deliveryDate}
            data-testid="button-request-booking"
          >
            {createBookingMutation.isPending ? "Processing..." : "Request Guardian"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You won't be charged until the guardian accepts your request
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
