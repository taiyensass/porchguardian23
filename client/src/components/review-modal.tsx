import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Booking, Guardian, User } from "@shared/schema";

type BookingWithDetails = Booking & {
  guardian: Guardian & { user: User };
};

interface ReviewModalProps {
  booking: BookingWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewModal({ booking, open, onOpenChange }: ReviewModalProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);

  const createReviewMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/reviews", {
        bookingId: booking.id,
        guardianId: booking.guardianId,
        rating,
        comment: comment.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guardians", booking.guardianId, "reviews"] });
      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!",
      });
      onOpenChange(false);
      setRating(5);
      setComment("");
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
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createReviewMutation.mutate();
  };

  const guardianName = `${booking.guardian.user.firstName || ""} ${booking.guardian.user.lastName || ""}`.trim() || "Guardian";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Your Guardian</DialogTitle>
          <DialogDescription>
            Share your experience with {guardianName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>Rating</Label>
            <div className="flex gap-2 mt-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none focus:ring-2 focus:ring-ring rounded"
                  data-testid={`star-${value}`}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      value <= (hoveredRating || rating)
                        ? "fill-primary text-primary"
                        : "text-muted"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="comment">Your Review (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Share your experience with this guardian..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              data-testid="input-review-comment"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-review"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createReviewMutation.isPending}
              data-testid="button-submit-review"
            >
              {createReviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
