import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Guardians from "@/pages/guardians";
import GuardianProfile from "@/pages/guardian-profile";
import Dashboard from "@/pages/dashboard";
import BecomeGuardian from "@/pages/become-guardian";
import BuyCredits from "@/pages/buy-credits";
import Checkout from "@/pages/checkout";
import PaymentSuccess from "@/pages/payment-success";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={isLoading || !isAuthenticated ? Landing : Dashboard} />
      <Route path="/guardians" component={Guardians} />
      <Route path="/guardian/:id" component={GuardianProfile} />
      
      {/* Protected routes */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/become-guardian" component={BecomeGuardian} />
      <Route path="/buy-credits" component={BuyCredits} />
      <Route path="/checkout/:bookingId" component={Checkout} />
      <Route path="/payment-success" component={PaymentSuccess} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
