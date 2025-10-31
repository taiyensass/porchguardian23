import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Package } from "lucide-react";

export default function PaymentSuccess() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1]);
  const bookingId = params.get("bookingId");

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

      <div className="mx-auto max-w-2xl px-4 py-12 md:px-6 lg:px-8">
        <Card className="text-center">
          <CardContent className="p-12">
            <div className="mb-6 flex justify-center">
              <div className="flex items-center justify-center h-20 w-20 rounded-full bg-green-100">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>

            <h1 className="text-3xl font-semibold mb-4" data-testid="text-success-title">
              Payment Successful!
            </h1>

            <p className="text-lg text-muted-foreground mb-2">
              Your booking has been confirmed and payment processed successfully.
            </p>

            <p className="text-muted-foreground mb-8">
              Your guardian will be notified and will accept packages on your behalf. You can track your booking status in your dashboard.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/dashboard">
                <Button size="lg" data-testid="button-view-dashboard">
                  View Dashboard
                </Button>
              </Link>
              <Link href="/guardians">
                <Button size="lg" variant="outline" data-testid="button-find-more">
                  Find More Guardians
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
