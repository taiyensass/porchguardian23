import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MapPin, Star, Package, ArrowLeft, Map } from "lucide-react";
import type { Guardian, User } from "@shared/schema";

type GuardianWithUser = Guardian & { user: User };

export default function Guardians() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const { data: guardians, isLoading } = useQuery<GuardianWithUser[]>({
    queryKey: ["/api/guardians"],
  });

  const filteredGuardians = guardians?.filter((guardian) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      guardian.city.toLowerCase().includes(query) ||
      guardian.state.toLowerCase().includes(query) ||
      guardian.zipCode.includes(query) ||
      guardian.address.toLowerCase().includes(query)
    );
  });

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
        {/* Back Button & Title */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl md:text-4xl font-semibold mb-2">Find Your Guardian</h1>
          <p className="text-lg text-muted-foreground">
            Browse trusted neighbors in your community
          </p>
        </div>

        {/* Search Bar & View Toggle */}
        <div className="mb-8 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by city, state, or zip code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-guardians"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
              data-testid="button-list-view"
            >
              <Package className="mr-2 h-4 w-4" />
              List
            </Button>
            <Button
              variant={viewMode === "map" ? "default" : "outline"}
              onClick={() => setViewMode("map")}
              data-testid="button-map-view"
            >
              <Map className="mr-2 h-4 w-4" />
              Map
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-48 bg-muted animate-pulse" />
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded animate-pulse mb-3" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Map View */}
        {viewMode === "map" && !isLoading && filteredGuardians && (
          <Card className="p-6">
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
              <div className="relative text-center z-10">
                <Map className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Interactive Map View</h3>
                <p className="text-muted-foreground max-w-md">
                  Guardian locations would be displayed here with interactive markers showing pricing and availability
                </p>
                <div className="mt-6 flex flex-wrap gap-3 justify-center">
                  {filteredGuardians.slice(0, 5).map((guardian) => (
                    <Link key={guardian.id} href={`/guardian/${guardian.id}`}>
                      <Badge variant="outline" className="hover-elevate cursor-pointer px-4 py-2">
                        <MapPin className="h-3 w-3 mr-1" />
                        {guardian.city} - ${guardian.pricePerPackage}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Guardian Grid */}
        {viewMode === "list" && !isLoading && filteredGuardians && filteredGuardians.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuardians.map((guardian) => {
              const userName = `${guardian.user.firstName || ""} ${guardian.user.lastName || ""}`.trim() || "Guardian";
              const initials = userName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <Link key={guardian.id} href={`/guardian/${guardian.id}`}>
                  <Card className="overflow-hidden hover-elevate transition-all cursor-pointer h-full" data-testid={`card-guardian-${guardian.id}`}>
                    {/* Guardian Image */}
                    <div className="h-48 bg-muted relative">
                      {guardian.porchImageUrl ? (
                        <img
                          src={guardian.porchImageUrl}
                          alt={`${userName}'s porch`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-16 w-16 text-muted-foreground" />
                        </div>
                      )}
                      {guardian.isActive && (
                        <Badge className="absolute top-3 right-3 bg-green-600 text-white">
                          Available
                        </Badge>
                      )}
                    </div>

                    <CardContent className="p-6">
                      {/* Guardian Info */}
                      <div className="flex items-start gap-3 mb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={guardian.user.profileImageUrl || undefined} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold mb-1 truncate" data-testid={`text-guardian-name-${guardian.id}`}>
                            {userName}
                          </h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{guardian.city}, {guardian.state}</span>
                          </div>
                        </div>
                      </div>

                      {/* Rating & Stats */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-primary text-primary" />
                          <span className="font-semibold">{guardian.averageRating}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          ({guardian.totalBookings} bookings)
                        </span>
                      </div>

                      {/* Quick Stats */}
                      <div className="space-y-2 mb-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Response time:</span>
                          <span className="font-medium">{guardian.responseTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Acceptance rate:</span>
                          <span className="font-medium">{guardian.acceptanceRate}%</span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="pt-4 border-t">
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-semibold" data-testid={`text-price-${guardian.id}`}>
                            ${guardian.pricePerPackage}
                          </span>
                          <span className="text-sm text-muted-foreground">per package</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredGuardians && filteredGuardians.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No guardians found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? "Try adjusting your search criteria"
                : "Be the first guardian in your area!"}
            </p>
            <Link href="/become-guardian">
              <Button data-testid="button-become-guardian-empty">
                Become a Guardian
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
