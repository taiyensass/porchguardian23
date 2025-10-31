import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  MapPin,
  Star,
  Clock,
  CheckCircle2,
  Package,
  Shield,
} from "lucide-react";
import type { Guardian, User, Review } from "@shared/schema";
import { BookingWidget } from "@/components/booking-widget";

type GuardianWithUser = Guardian & { user: User };
type ReviewWithUser = Review & { customer: User };

export default function GuardianProfile() {
  const [, params] = useRoute("/guardian/:id");
  const guardianId = params?.id;

  const { data: guardian, isLoading } = useQuery<GuardianWithUser>({
    queryKey: ["/api/guardians", guardianId],
    enabled: !!guardianId,
  });

  const { data: reviews } = useQuery<ReviewWithUser[]>({
    queryKey: ["/api/guardians", guardianId, "reviews"],
    enabled: !!guardianId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!guardian) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Guardian not found</h2>
          <Link href="/guardians">
            <Button>Browse Guardians</Button>
          </Link>
        </div>
      </div>
    );
  }

  const userName = `${guardian.user.firstName || ""} ${guardian.user.lastName || ""}`.trim() || "Guardian";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
            <Button asChild data-testid="button-login">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        {/* Back Button */}
        <Link href="/guardians">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Guardians
          </Button>
        </Link>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Image */}
            <div className="rounded-lg overflow-hidden">
              {guardian.porchImageUrl ? (
                <img
                  src={guardian.porchImageUrl}
                  alt={`${userName}'s porch`}
                  className="w-full h-64 md:h-96 object-cover"
                  data-testid="img-guardian-porch"
                />
              ) : (
                <div className="w-full h-64 md:h-96 bg-muted flex items-center justify-center">
                  <Package className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Guardian Info */}
            <div>
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={guardian.user.profileImageUrl || undefined} />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h1 className="text-3xl font-semibold mb-2" data-testid="text-guardian-name">
                    {userName}
                  </h1>
                  <div className="flex items-center gap-2 text-muted-foreground mb-3">
                    <MapPin className="h-4 w-4" />
                    <span data-testid="text-guardian-location">
                      {guardian.address}, {guardian.city}, {guardian.state} {guardian.zipCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 fill-primary text-primary" />
                      <span className="font-semibold text-lg">{guardian.averageRating}</span>
                      <span className="text-muted-foreground">
                        ({guardian.totalBookings} reviews)
                      </span>
                    </div>
                    {guardian.verificationStatus === 'verified' && (
                      <Badge className="bg-green-600 flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                    {guardian.isActive && (
                      <Badge className="bg-blue-600">Available Now</Badge>
                    )}
                  </div>
                </div>
              </div>

              {guardian.bio && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h2 className="text-xl font-semibold mb-3">About</h2>
                    <p className="text-muted-foreground leading-relaxed" data-testid="text-guardian-bio">
                      {guardian.bio}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Guardian Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Response Time</div>
                      <div className="text-sm text-muted-foreground">
                        {guardian.responseTime}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Acceptance Rate</div>
                      <div className="text-sm text-muted-foreground">
                        {guardian.acceptanceRate}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Max Packages</div>
                      <div className="text-sm text-muted-foreground">
                        Up to {guardian.maxPackages} packages
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Verified</div>
                      <div className="text-sm text-muted-foreground">
                        Identity verified
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reviews */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">Reviews</h2>
              {reviews && reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => {
                    const reviewerName = `${review.customer.firstName || ""} ${review.customer.lastName || ""}`.trim() || "Customer";
                    const reviewerInitials = reviewerName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <Card key={review.id} data-testid={`card-review-${review.id}`}>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-3 mb-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={review.customer.profileImageUrl || undefined} />
                              <AvatarFallback>{reviewerInitials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="font-semibold">{reviewerName}</div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${
                                        i < review.rating
                                          ? "fill-primary text-primary"
                                          : "text-muted"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span>•</span>
                                <span>
                                  {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}
                                </span>
                              </div>
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-muted-foreground leading-relaxed">
                              {review.comment}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No reviews yet. Be the first to book!
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Right Column - Booking Widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <BookingWidget guardian={guardian} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
