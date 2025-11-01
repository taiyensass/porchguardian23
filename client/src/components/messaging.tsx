import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageCircle, Send, Package, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { Booking, Guardian, User, Message } from "@shared/schema";
import { insertMessageSchema } from "@shared/schema";

type BookingWithDetails = Booking & {
  guardian: Guardian & { user: User };
  customer?: User;
};

type MessageWithSender = Message & {
  sender: User;
};

export function MessagingView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");

  const { data: bookings, isLoading: loadingBookings } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: messages, isLoading: loadingMessages } = useQuery<MessageWithSender[]>({
    queryKey: selectedBookingId ? [`/api/bookings/${selectedBookingId}/messages`] : [],
    enabled: !!selectedBookingId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { bookingId: string; content: string }) => {
      return apiRequest("POST", "/api/messages", data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${variables.bookingId}/messages`] });
      setMessageText("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!selectedBookingId || !messageText.trim()) return;

    sendMessageMutation.mutate({
      bookingId: selectedBookingId,
      content: messageText.trim(),
    });
  };

  const selectedBooking = bookings?.find(b => b.id === selectedBookingId);

  if (loadingBookings) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No bookings yet. Book a guardian to start messaging.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversations ({bookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="space-y-1 p-4">
              {bookings.map((booking) => {
                const otherUser = user?.id === booking.customerId 
                  ? booking.guardian.user 
                  : booking.customer;
                const otherUserName = otherUser 
                  ? `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim() || "User"
                  : "User";
                const isSelected = booking.id === selectedBookingId;

                return (
                  <div
                    key={booking.id}
                    onClick={() => setSelectedBookingId(booking.id)}
                    className={`p-3 rounded-md cursor-pointer hover-elevate ${
                      isSelected ? "bg-accent" : ""
                    }`}
                    data-testid={`conversation-${booking.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={otherUser?.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {otherUserName.split(" ").map(n => n[0]).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm truncate">{otherUserName}</p>
                          <Badge variant={booking.status === "confirmed" ? "default" : "secondary"} className="text-xs">
                            {booking.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Package className="h-3 w-3" />
                          <span className="truncate">{booking.guardian.city}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        {selectedBooking ? (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={
                    (user?.id === selectedBooking.customerId 
                      ? selectedBooking.guardian.user.profileImageUrl 
                      : selectedBooking.customer?.profileImageUrl) || undefined
                  } />
                  <AvatarFallback>
                    {(user?.id === selectedBooking.customerId 
                      ? `${selectedBooking.guardian.user.firstName || ""} ${selectedBooking.guardian.user.lastName || ""}`
                      : `${selectedBooking.customer?.firstName || ""} ${selectedBooking.customer?.lastName || ""}`
                    ).trim().split(" ").map(n => n[0]).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">
                    {user?.id === selectedBooking.customerId 
                      ? `${selectedBooking.guardian.user.firstName || ""} ${selectedBooking.guardian.user.lastName || ""}`.trim() || "Guardian"
                      : `${selectedBooking.customer?.firstName || ""} ${selectedBooking.customer?.lastName || ""}`.trim() || "Customer"}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(new Date(selectedBooking.deliveryDate), "MMM d")} - {selectedBooking.pickupDate ? format(new Date(selectedBooking.pickupDate), "MMM d") : "TBD"}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex flex-col h-[440px]">
              <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : messages && messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isOwnMessage = message.senderId === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                          data-testid={`message-${message.id}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              isOwnMessage
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            {message.createdAt && (
                              <p className={`text-xs mt-1 ${isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                {format(new Date(message.createdAt), "MMM d, h:mm a")}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                )}
              </ScrollArea>
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    data-testid="input-message"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to view messages</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
