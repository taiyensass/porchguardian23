import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Shield, Clock, Star, MapPin, Package } from "lucide-react";
import heroImage from "@assets/generated_images/Hero_image_friendly_neighbor_packages_ddf9ba2c.png";
import porchImage from "@assets/generated_images/Guardian_porch_exterior_view_218f300d.png";
import happyCustomer from "@assets/generated_images/Happy_customer_receiving_package_ed3df0bc.png";

export default function Landing() {
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
            <Link href="/guardians">
              <Button variant="ghost" data-testid="button-browse-guardians">
                Browse Guardians
              </Button>
            </Link>
            <Link href="/become-guardian">
              <Button variant="outline" data-testid="button-become-guardian">
                Become a Guardian
              </Button>
            </Link>
            <Button asChild data-testid="button-login">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[600px] md:min-h-[700px] flex items-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        
        <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-20 md:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold text-white mb-6 leading-tight">
            Your Neighborhood Package Guardian
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
            Never worry about missed deliveries again. Connect with trusted neighbors who can accept your packages while you're away.
          </p>

          {/* Search Component */}
          <div className="bg-background/95 backdrop-blur rounded-lg p-6 shadow-xl max-w-2xl mx-auto">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Enter your city or zip code"
                  className="pl-10"
                  data-testid="input-search-location"
                />
              </div>
              <Link href="/guardians">
                <Button size="lg" className="w-full md:w-auto" data-testid="button-find-guardians">
                  <Search className="mr-2 h-5 w-5" />
                  Find Guardians
                </Button>
              </Link>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 flex flex-wrap justify-center gap-6 md:gap-8 text-white/90">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm md:text-base">10,000+ Trusted Guardians</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <span className="text-sm md:text-base">500,000+ Packages Protected</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              <span className="text-sm md:text-base">99% Positive Reviews</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple, secure, and convenient package protection in three easy steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover-elevate transition-all">
              <CardContent className="p-6">
                <div className="mb-4 rounded-lg overflow-hidden">
                  <img
                    src={porchImage}
                    alt="Search for guardians"
                    className="w-full h-48 object-cover"
                  />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-semibold">
                    1
                  </div>
                  <h3 className="text-xl font-semibold">Find a Guardian</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Search for verified neighbors in your area. Browse profiles, read reviews, and choose the perfect guardian for your packages.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardContent className="p-6">
                <div className="mb-4 rounded-lg overflow-hidden bg-muted flex items-center justify-center h-48">
                  <Package className="h-20 w-20 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-semibold">
                    2
                  </div>
                  <h3 className="text-xl font-semibold">Book & Pay Securely</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Select your delivery dates, provide package details, and complete secure payment. Your guardian will be notified immediately.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all">
              <CardContent className="p-6">
                <div className="mb-4 rounded-lg overflow-hidden">
                  <img
                    src={happyCustomer}
                    alt="Pick up your package"
                    className="w-full h-48 object-cover"
                  />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-semibold">
                    3
                  </div>
                  <h3 className="text-xl font-semibold">Relax & Retrieve</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Your packages are safe! Pick them up at your convenience and rate your experience to help the community.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Built on Trust & Safety</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your peace of mind is our priority. Every guardian is verified and rated by the community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6">
              <div className="mb-4 flex justify-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Verified Guardians</h3>
              <p className="text-sm text-muted-foreground">
                Every guardian undergoes identity verification before joining our community
              </p>
            </div>

            <div className="text-center p-6">
              <div className="mb-4 flex justify-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10">
                  <Star className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Community Reviews</h3>
              <p className="text-sm text-muted-foreground">
                Read honest reviews from real customers to make informed decisions
              </p>
            </div>

            <div className="text-center p-6">
              <div className="mb-4 flex justify-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">24/7 Support</h3>
              <p className="text-sm text-muted-foreground">
                Our team is always here to help with any questions or concerns
              </p>
            </div>

            <div className="text-center p-6">
              <div className="mb-4 flex justify-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10">
                  <Package className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Secure Payments</h3>
              <p className="text-sm text-muted-foreground">
                All transactions are processed securely through industry-leading payment systems
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">Ready to Join Our Community?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Whether you need a guardian or want to help your neighbors, getting started is easy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/guardians">
              <Button size="lg" data-testid="button-find-guardian-cta">
                <Search className="mr-2 h-5 w-5" />
                Find a Guardian
              </Button>
            </Link>
            <Link href="/become-guardian">
              <Button size="lg" variant="outline" data-testid="button-become-guardian-cta">
                Become a Guardian
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold mb-4">About</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">How It Works</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Our Mission</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Guardians</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/become-guardian"><span className="hover:text-foreground transition-colors">Become a Guardian</span></Link></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Guardian Resources</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Earnings Calculator</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Trust & Safety</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Insurance Info</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; 2025 Porchguardian. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
