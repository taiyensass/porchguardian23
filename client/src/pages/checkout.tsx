import { useEffect, useState } from "react";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Package, ArrowLeft } from "lucide-react";
import type { Booking, Guardian, User } from "@shared/schema";

type BookingWithDetails = Booking & {
  guardian: Guardian & { user: User };
};

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function CheckoutForm({ booking }: { booking: BookingWithDetails }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success?bookingId=${booking.id}`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const guardianName = `${booking.guardian.user.firstName || ""} ${booking.guardian.user.lastName || ""}`.trim() || "Guardian";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Booking Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Guardian:</span>
            <span className="font-medium">{guardianName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Location:</span>
            <span className="font-medium">
              {booking.guardian.city}, {booking.guardian.state}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Delivery Date:</span>
            <span className="font-medium">
              {new Date(booking.deliveryDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Number of Packages:</span>
            <span className="font-medium">{booking.packageCount}</span>
          </div>
          <div className="pt-3 border-t flex justify-between">
            <span className="font-semibold">Total:</span>
            <span className="text-2xl font-bold text-primary" data-testid="text-total-amount">
              ${booking.totalPrice}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Element */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentElement />
        </CardContent>
      </Card>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!stripe || !elements || isProcessing}
        data-testid="button-submit-payment"
      >
        {isProcessing ? "Processing..." : `Pay $${booking.totalPrice}`}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Your payment is secured by Stripe. You will only be charged after the guardian accepts your request.
      </p>
    </form>
  );
}

export default function Checkout() {
  const [, params] = useRoute("/checkout/:bookingId");
  const bookingId = params?.bookingId;
  const [clientSecret, setClientSecret] = useState("");

  const { data: booking, isLoading } = useQuery<BookingWithDetails>({
    queryKey: ["/api/bookings", bookingId],
    enabled: !!bookingId,
  });

  useEffect(() => {
    if (booking && !clientSecret) {
      // Create PaymentIntent
      apiRequest("POST", "/api/create-payment-intent", {
        amount: Number(booking.totalPrice),
        bookingId: booking.id,
      })
        .then((data: any) => {
          setClientSecret(data.clientSecret);
        })
        .catch((error) => {
          console.error("Error creating payment intent:", error);
        });
    }
  }, [booking, clientSecret]);

  if (isLoading || !booking) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6 lg:px-8">
            <Link href="/">
              <div className="flex items-center gap-2 hover-elevate rounded-md px-2 py-1">
                <Package className="h-6 w-6 text-primary" />
                <span className="text-xl font-semibold">Porchguardian</span>
              </div>
            </Link>
          </div>
        </header>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6 lg:px-8">
            <Link href="/">
              <div className="flex items-center gap-2 hover-elevate rounded-md px-2 py-1">
                <Package className="h-6 w-6 text-primary" />
                <span className="text-xl font-semibold">Porchguardian</span>
              </div>
            </Link>
          </div>
        </header>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
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

      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 lg:px-8">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Complete Your Booking</h1>
          <p className="text-muted-foreground">
            Securely pay for your package guardian service
          </p>
        </div>

        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm booking={booking} />
        </Elements>
      </div>
    </div>
  );
}
