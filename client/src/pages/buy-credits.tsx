import { useState } from "react";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Package, CreditCard, Check } from "lucide-react";
import type { PricingTier } from "@shared/schema";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function PurchaseDialog({ 
  tier, 
  isOpen, 
  onClose 
}: { 
  tier: PricingTier; 
  isOpen: boolean; 
  onClose: () => void;
}) {
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
        return_url: `${window.location.origin}/buy-credits?success=true`,
      },
      redirect: 'if_required',
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else {
      // Payment succeeded
      toast({
        title: "Purchase Successful",
        description: `${tier.credits} credits have been added to your account!`,
      });
      
      // Invalidate queries to refresh credit balance
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      
      onClose();
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Credits:</span>
          <span className="text-2xl font-semibold">{tier.credits}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total:</span>
          <span className="text-2xl font-semibold text-primary">${tier.priceUsd}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentElement />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1"
          disabled={isProcessing}
          data-testid="button-cancel-purchase"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={!stripe || !elements || isProcessing}
          data-testid="button-complete-purchase"
        >
          {isProcessing ? "Processing..." : `Complete Purchase`}
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Your payment is secured by Stripe. Credits will be added to your account immediately after payment.
      </p>
    </form>
  );
}

function PurchaseDialogWrapper({ 
  tier, 
  isOpen, 
  onClose,
  clientSecret 
}: { 
  tier: PricingTier | null; 
  isOpen: boolean; 
  onClose: () => void;
  clientSecret: string | null;
}) {
  if (!tier || !clientSecret) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-purchase-credits">
        <DialogHeader>
          <DialogTitle>Purchase {tier.credits} Credits</DialogTitle>
          <DialogDescription>
            Complete your payment to add {tier.credits} credits to your account
          </DialogDescription>
        </DialogHeader>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PurchaseDialog tier={tier} isOpen={isOpen} onClose={onClose} />
        </Elements>
      </DialogContent>
    </Dialog>
  );
}

export default function BuyCredits() {
  const { user, isLoading: isLoadingAuth, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch pricing tiers
  const { data: tiers, isLoading: isLoadingTiers } = useQuery<PricingTier[]>({
    queryKey: ["/api/pricing-tiers"],
  });

  // Create payment intent mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (tierId: string) => {
      const response = await apiRequest("POST", "/api/purchase-credits", { tierId });
      return await response.json() as { clientSecret: string };
    },
    onSuccess: (data, tierId) => {
      const tier = tiers?.find(t => t.id === tierId);
      if (tier) {
        setSelectedTier(tier);
        setClientSecret(data.clientSecret);
        setIsDialogOpen(true);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment intent",
        variant: "destructive",
      });
    },
  });

  const handleBuyNow = (tier: PricingTier) => {
    createPaymentMutation.mutate(tier.id);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedTier(null);
    setClientSecret(null);
  };

  // Redirect to login if not authenticated
  if (!isLoadingAuth && !isAuthenticated) {
    navigate("/");
    return null;
  }

  // Calculate best value tier (lowest price per credit)
  const bestValueTierId = tiers?.reduce((bestId, tier) => {
    const currentPricePerCredit = parseFloat(tier.priceUsd) / tier.credits;
    const bestTier = tiers.find(t => t.id === bestId);
    const bestPricePerCredit = bestTier 
      ? parseFloat(bestTier.priceUsd) / bestTier.credits 
      : Infinity;
    
    return currentPricePerCredit < bestPricePerCredit ? tier.id : bestId;
  }, tiers?.[0]?.id || "");

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

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold">Buy Credits</h1>
            {user?.credits && (
              <Badge variant="secondary" className="text-base px-3 py-1" data-testid="badge-current-balance">
                <CreditCard className="mr-2 h-4 w-4" />
                {user.credits.balance} credits
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-lg">
            Purchase credit bundles to book package guardians
          </p>
        </div>

        {/* Loading State */}
        {isLoadingTiers && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" data-testid="loading-tiers" />
          </div>
        )}

        {/* Empty State */}
        {!isLoadingTiers && (!tiers || tiers.length === 0) && (
          <Card className="py-12">
            <CardContent className="text-center">
              <p className="text-muted-foreground text-lg" data-testid="text-no-packages">
                No credit packages available
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tiers Grid */}
        {!isLoadingTiers && tiers && tiers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tiers.map((tier) => {
              const pricePerCredit = parseFloat(tier.priceUsd) / tier.credits;
              const isBestValue = tier.id === bestValueTierId && tiers.length > 1;

              return (
                <Card 
                  key={tier.id} 
                  className="relative hover-elevate"
                  data-testid={`card-tier-${tier.id}`}
                >
                  {isBestValue && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground" data-testid={`badge-best-value-${tier.id}`}>
                        <Check className="mr-1 h-3 w-3" />
                        Best Value
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="space-y-3 pt-6">
                    <CardTitle className="text-xl" data-testid={`text-tier-name-${tier.id}`}>
                      {tier.name}
                    </CardTitle>
                    <div className="space-y-1">
                      <div className="text-4xl font-bold" data-testid={`text-tier-credits-${tier.id}`}>
                        {tier.credits}
                      </div>
                      <div className="text-sm text-muted-foreground">credits</div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <div className="text-3xl font-semibold text-primary" data-testid={`text-tier-price-${tier.id}`}>
                        ${tier.priceUsd}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ${pricePerCredit.toFixed(2)} per credit
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full"
                      onClick={() => handleBuyNow(tier)}
                      disabled={createPaymentMutation.isPending}
                      data-testid={`button-buy-tier-${tier.id}`}
                    >
                      {createPaymentMutation.isPending ? "Loading..." : "Buy Now"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info Section */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle>How Credits Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">1</span>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-1">Purchase Credits</h4>
                <p className="text-sm text-muted-foreground">
                  Buy credit bundles at discounted rates. Larger bundles offer better value.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">2</span>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-1">Book Guardians</h4>
                <p className="text-sm text-muted-foreground">
                  Use credits to book package guardians. Each package typically costs 1 credit.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">3</span>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-1">Never Expire</h4>
                <p className="text-sm text-muted-foreground">
                  Your credits never expire and can be used whenever you need package guardian services.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Dialog */}
      <PurchaseDialogWrapper
        tier={selectedTier}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        clientSecret={clientSecret}
      />
    </div>
  );
}
