import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { insertGuardianSchema, insertBookingSchema, insertMessageSchema, insertReviewSchema, insertPackageSchema, insertPricingTierSchema } from "@shared/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover" as any,
});

const PLATFORM_FEE_PERCENTAGE = 0.15; // 15% platform fee

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check if user has a guardian profile
      const guardianProfile = await storage.getGuardianByUserId(userId);
      
      // Calculate available roles
      const availableRoles: string[] = ['customer']; // Everyone can be a customer
      
      if (guardianProfile) {
        availableRoles.push('guardian');
      }
      
      if (user?.role === 'admin') {
        availableRoles.push('admin');
      }
      
      res.json({
        ...user,
        availableRoles,
        guardianProfile: guardianProfile ? {
          id: guardianProfile.id,
          verificationStatus: guardianProfile.verificationStatus,
          isActive: guardianProfile.isActive,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Guardian routes
  app.get("/api/guardians", async (req, res) => {
    try {
      const guardians = await storage.getAllGuardians();
      res.json(guardians);
    } catch (error) {
      console.error("Error fetching guardians:", error);
      res.status(500).json({ message: "Failed to fetch guardians" });
    }
  });

  app.get("/api/guardians/:id", async (req, res) => {
    try {
      const guardian = await storage.getGuardian(req.params.id);
      if (!guardian) {
        return res.status(404).json({ message: "Guardian not found" });
      }
      res.json(guardian);
    } catch (error) {
      console.error("Error fetching guardian:", error);
      res.status(500).json({ message: "Failed to fetch guardian" });
    }
  });

  app.get("/api/guardians/:id/reviews", async (req, res) => {
    try {
      const reviews = await storage.getReviewsByGuardian(req.params.id);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.get("/api/guardians/by-user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const guardian = await storage.getGuardianByUserId(userId);
      
      if (!guardian) {
        return res.status(404).json({ message: "Guardian profile not found" });
      }

      res.json(guardian);
    } catch (error) {
      console.error("Error fetching guardian by user:", error);
      res.status(500).json({ message: "Failed to fetch guardian" });
    }
  });

  app.post("/api/guardians", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user already has a guardian profile
      const existing = await storage.getGuardianByUserId(userId);
      if (existing) {
        return res.status(400).json({ message: "Guardian profile already exists" });
      }

      const validatedData = insertGuardianSchema.parse({
        ...req.body,
        userId,
        verificationStatus: 'pending',
      });

      const guardian = await storage.createGuardian(validatedData);
      
      // Update user role to guardian
      await storage.updateUserRole(userId, 'guardian');
      
      res.status(201).json(guardian);
    } catch (error: any) {
      console.error("Error creating guardian:", error);
      res.status(400).json({ message: error.message || "Failed to create guardian" });
    }
  });

  // Guardian verification routes
  app.post("/api/guardians/:id/create-verification-session", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const guardian = await storage.getGuardian(req.params.id);

      if (!guardian) {
        return res.status(404).json({ message: "Guardian not found" });
      }

      if (guardian.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Create Stripe Identity verification session
      const verificationSession = await stripe.identity.verificationSessions.create({
        type: 'document',
        metadata: {
          guardian_id: guardian.id,
          user_id: userId,
        },
      });

      // Update guardian with session ID
      await storage.updateGuardian(guardian.id, {
        stripeIdentitySessionId: verificationSession.id,
      });

      res.json({
        clientSecret: verificationSession.client_secret,
        sessionId: verificationSession.id,
      });
    } catch (error: any) {
      console.error("Error creating verification session:", error);
      res.status(500).json({ message: error.message || "Failed to create verification session" });
    }
  });

  app.get("/api/guardians/:id/verification-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const guardian = await storage.getGuardian(req.params.id);

      if (!guardian) {
        return res.status(404).json({ message: "Guardian not found" });
      }

      if (guardian.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (!guardian.stripeIdentitySessionId) {
        return res.json({
          status: guardian.verificationStatus,
          verifiedAt: guardian.verifiedAt,
        });
      }

      // Check Stripe Identity verification status
      const verificationSession = await stripe.identity.verificationSessions.retrieve(
        guardian.stripeIdentitySessionId
      );

      // Auto-approve if verification succeeded
      if (verificationSession.status === 'verified' && guardian.verificationStatus === 'pending') {
        await storage.updateGuardian(guardian.id, {
          verificationStatus: 'verified',
          verifiedAt: new Date(),
        });
      }

      res.json({
        status: verificationSession.status === 'verified' ? 'verified' : guardian.verificationStatus,
        verifiedAt: guardian.verifiedAt,
        stripeStatus: verificationSession.status,
      });
    } catch (error: any) {
      console.error("Error checking verification status:", error);
      res.status(500).json({ message: error.message || "Failed to check verification status" });
    }
  });

  // Admin routes for guardian approval
  app.post("/api/admin/guardians/:id/approve", isAdmin, async (req, res) => {
    try {
      const guardian = await storage.getGuardian(req.params.id);

      if (!guardian) {
        return res.status(404).json({ message: "Guardian not found" });
      }

      await storage.updateGuardian(req.params.id, {
        verificationStatus: 'verified',
        verifiedAt: new Date(),
      });

      res.json({ message: "Guardian approved successfully" });
    } catch (error: any) {
      console.error("Error approving guardian:", error);
      res.status(500).json({ message: error.message || "Failed to approve guardian" });
    }
  });

  app.post("/api/admin/guardians/:id/reject", isAdmin, async (req, res) => {
    try {
      const guardian = await storage.getGuardian(req.params.id);

      if (!guardian) {
        return res.status(404).json({ message: "Guardian not found" });
      }

      await storage.updateGuardian(req.params.id, {
        verificationStatus: 'rejected',
      });

      res.json({ message: "Guardian rejected successfully" });
    } catch (error: any) {
      console.error("Error rejecting guardian:", error);
      res.status(500).json({ message: error.message || "Failed to reject guardian" });
    }
  });

  app.get("/api/admin/guardians/pending", isAdmin, async (req, res) => {
    try {
      const pendingGuardians = await storage.getPendingGuardians();
      res.json(pendingGuardians);
    } catch (error) {
      console.error("Error fetching pending guardians:", error);
      res.status(500).json({ message: "Failed to fetch pending guardians" });
    }
  });

  // Admin metrics endpoint
  app.get("/api/admin/metrics", isAdmin, async (req, res) => {
    try {
      const [allBookings, allGuardians, allUsers] = await Promise.all([
        storage.getAllBookingsForAdmin(),
        storage.getAllGuardiansForAdmin(),
        storage.getAllUsers(),
      ]);

      const totalBookings = allBookings.length;
      const completedBookings = allBookings.filter(b => b.status === 'completed').length;
      const totalRevenue = allBookings
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + parseFloat(b.totalPrice || '0'), 0);
      
      const activeGuardians = allGuardians.filter(g => g.verificationStatus === 'verified' && g.isActive).length;
      const pendingGuardians = allGuardians.filter(g => g.verificationStatus === 'pending').length;
      
      res.json({
        totalBookings,
        completedBookings,
        totalRevenue,
        platformRevenue: totalRevenue * PLATFORM_FEE_PERCENTAGE,
        activeGuardians,
        pendingGuardians,
        totalUsers: allUsers.length,
      });
    } catch (error) {
      console.error("Error fetching admin metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // Admin users endpoint
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin update user role
  app.patch("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const { role } = req.body;
      if (!['customer', 'guardian', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const user = await storage.updateUserRole(req.params.id, role);
      res.json(user);
    } catch (error: any) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: error.message || "Failed to update user" });
    }
  });

  // Admin all bookings endpoint
  app.get("/api/admin/bookings", isAdmin, async (req, res) => {
    try {
      const status = req.query.status as string;
      const bookings = await storage.getAllBookingsForAdmin();
      
      const filteredBookings = status
        ? bookings.filter(b => b.status === status)
        : bookings;
      
      res.json(filteredBookings);
    } catch (error) {
      console.error("Error fetching admin bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Credit Management Routes
  
  // Get current user's credit balance and transaction history
  app.get("/api/credits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Ensure user has a credit record
      const userCredits = await storage.ensureUserCredits(userId);
      const transactions = await storage.getCreditTransactions(userId);
      
      res.json({
        balance: userCredits.balance,
        lifetimeEarned: userCredits.lifetimeEarned,
        lifetimeSpent: userCredits.lifetimeSpent,
        transactions,
      });
    } catch (error) {
      console.error("Error fetching credits:", error);
      res.status(500).json({ message: "Failed to fetch credits" });
    }
  });

  // Get active pricing tiers for credit purchase
  app.get("/api/pricing-tiers", async (req, res) => {
    try {
      const tiers = await storage.getActivePricingTiers();
      res.json(tiers);
    } catch (error) {
      console.error("Error fetching pricing tiers:", error);
      res.status(500).json({ message: "Failed to fetch pricing tiers" });
    }
  });

  // Admin Pricing Tier Routes
  
  // Get all pricing tiers (including inactive)
  app.get("/api/admin/pricing-tiers", isAdmin, async (req, res) => {
    try {
      const tiers = await storage.getPricingTiers();
      res.json(tiers);
    } catch (error) {
      console.error("Error fetching pricing tiers:", error);
      res.status(500).json({ message: "Failed to fetch pricing tiers" });
    }
  });

  // Create new pricing tier
  app.post("/api/admin/pricing-tiers", isAdmin, async (req, res) => {
    try {
      const validatedData = insertPricingTierSchema.parse(req.body);
      const tier = await storage.createPricingTier(validatedData);
      res.status(201).json(tier);
    } catch (error: any) {
      console.error("Error creating pricing tier:", error);
      res.status(400).json({ message: error.message || "Failed to create pricing tier" });
    }
  });

  // Update pricing tier
  app.patch("/api/admin/pricing-tiers/:id", isAdmin, async (req, res) => {
    try {
      const tier = await storage.getPricingTier(req.params.id);
      
      if (!tier) {
        return res.status(404).json({ message: "Pricing tier not found" });
      }

      const updated = await storage.updatePricingTier(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating pricing tier:", error);
      res.status(400).json({ message: error.message || "Failed to update pricing tier" });
    }
  });

  // Credit Purchase Route
  
  // Create Stripe payment intent for credit purchase
  app.post("/api/purchase-credits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tierId } = req.body;

      if (!tierId) {
        return res.status(400).json({ message: "tierId is required" });
      }

      // Validate tier exists and is active
      const tier = await storage.getPricingTier(tierId);
      
      if (!tier) {
        return res.status(404).json({ message: "Pricing tier not found" });
      }

      if (!tier.isActive) {
        return res.status(400).json({ message: "This pricing tier is no longer available" });
      }

      // Create payment intent for credit purchase
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(tier.priceUsd) * 100), // Convert to cents
        currency: "usd",
        metadata: {
          tier_id: tier.id,
          user_id: userId,
          credits: tier.credits.toString(),
          purchase_type: 'credits',
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating credit purchase payment intent:", error);
      res.status(500).json({ message: error.message || "Failed to create payment intent" });
    }
  });

  // Credit Purchase Confirmation Webhook (placeholder)
  app.post("/api/stripe-webhook", async (req, res) => {
    // TODO: Implement Stripe webhook handler for credit purchase confirmation
    // This will be implemented separately with proper signature verification
    res.status(501).json({ message: "Webhook handler not yet implemented" });
  });

  // Booking routes
  app.get("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookings = await storage.getBookingsByCustomer(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const userId = req.user.claims.sub;
      if (booking.customerId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  app.post("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const validatedData = insertBookingSchema.parse({
        ...req.body,
        customerId: userId,
      });

      // Critical: Verify guardian is verified before allowing booking
      const guardian = await storage.getGuardian(validatedData.guardianId);
      
      if (!guardian) {
        return res.status(404).json({ message: "Guardian not found" });
      }

      if (guardian.verificationStatus !== 'verified') {
        return res.status(403).json({ 
          message: "Cannot book with unverified guardian. Guardian must be verified first." 
        });
      }

      const booking = await storage.createBooking(validatedData);
      res.status(201).json(booking);
    } catch (error: any) {
      console.error("Error creating booking:", error);
      res.status(400).json({ message: error.message || "Failed to create booking" });
    }
  });

  app.patch("/api/bookings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const booking = await storage.getBooking(req.params.id);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.customerId !== userId && booking.guardian.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const updated = await storage.updateBooking(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating booking:", error);
      res.status(400).json({ message: error.message || "Failed to update booking" });
    }
  });

  // Message routes
  app.get("/api/bookings/:bookingId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const booking = await storage.getBooking(req.params.bookingId);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.customerId !== userId && booking.guardian.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const messages = await storage.getMessagesByBooking(req.params.bookingId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const booking = await storage.getBooking(req.body.bookingId);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.customerId !== userId && booking.guardian.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertMessageSchema.parse({
        ...req.body,
        senderId: userId,
      });

      const message = await storage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error creating message:", error);
      res.status(400).json({ message: error.message || "Failed to create message" });
    }
  });

  // Review routes
  app.post("/api/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const booking = await storage.getBooking(req.body.bookingId);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.customerId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Check if review already exists
      const existing = await storage.getReviewByBooking(req.body.bookingId);
      if (existing) {
        return res.status(400).json({ message: "Review already exists for this booking" });
      }

      const validatedData = insertReviewSchema.parse({
        ...req.body,
        customerId: userId,
        guardianId: booking.guardianId,
      });

      const review = await storage.createReview(validatedData);
      res.status(201).json(review);
    } catch (error: any) {
      console.error("Error creating review:", error);
      res.status(400).json({ message: error.message || "Failed to create review" });
    }
  });

  // Stripe payment route with manual capture (escrow)
  app.post("/api/create-payment-intent", isAuthenticated, async (req, res) => {
    try {
      const { amount, bookingId } = req.body;
      
      // Create payment intent with manual capture to hold funds
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        capture_method: 'manual', // Hold funds until manual capture
        metadata: {
          booking_id: bookingId,
        },
      });
      
      // Update booking with payment intent ID
      if (bookingId) {
        await storage.updateBooking(bookingId, {
          stripePaymentIntentId: paymentIntent.id,
          paymentStatus: 'held',
        });
      }
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res
        .status(500)
        .json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Confirm package pickup (triggers payment release)
  app.post("/api/bookings/:id/confirm-pickup", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const booking = await storage.getBooking(req.params.id);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Only customer can confirm pickup
      if (booking.customerId !== userId) {
        return res.status(403).json({ message: "Forbidden - Only customer can confirm pickup" });
      }

      // Update booking status
      await storage.updateBooking(req.params.id, {
        status: 'completed',
        pickupConfirmedAt: new Date(),
      });

      let finalPaymentStatus: 'released' | 'held' = 'held';
      let finalTransferId: string | null = null;

      // Release payment if payment intent exists
      if (booking.stripePaymentIntentId && booking.paymentStatus === 'held') {
        try {
          // Capture the payment
          await stripe.paymentIntents.capture(booking.stripePaymentIntentId);
          
          // Calculate platform fee and guardian payout
          const totalAmount = parseFloat(booking.totalPrice);
          const platformFee = totalAmount * PLATFORM_FEE_PERCENTAGE;
          const guardianPayout = totalAmount - platformFee;
          
          // Transfer to guardian if they have Connect account
          const guardian = booking.guardian;
          let transferId = null;
          let paymentStatus: 'released' | 'held' = 'held';
          let transferErrorMessage = '';
          
          if (guardian.stripeConnectAccountId && guardian.payoutsEnabled) {
            try {
              const transfer = await stripe.transfers.create({
                amount: Math.round(guardianPayout * 100), // Convert to cents
                currency: 'usd',
                destination: guardian.stripeConnectAccountId,
                transfer_group: booking.id,
                metadata: {
                  booking_id: booking.id,
                  guardian_id: guardian.id,
                },
              });
              transferId = transfer.id;
              paymentStatus = 'released';
            } catch (transferError: any) {
              console.error("Error transferring to guardian:", transferError);
              // Payment captured but transfer failed - mark for manual review
              paymentStatus = 'held';
              transferErrorMessage = `[ADMIN REVIEW NEEDED: Transfer to guardian failed - ${transferError.message}]`;
            }
          }
          
          // Update booking with final payment state
          await storage.updateBooking(req.params.id, {
            paymentStatus,
            paymentReleasedAt: paymentStatus === 'released' ? new Date() : null,
            platformFee: platformFee.toString(),
            guardianPayout: guardianPayout.toString(),
            stripeTransferId: transferId,
            specialInstructions: transferErrorMessage ? 
              ((booking.specialInstructions || '') + '\n' + transferErrorMessage) : 
              booking.specialInstructions,
          });

          finalPaymentStatus = paymentStatus;
          finalTransferId = transferId;
        } catch (error: any) {
          console.error("Error capturing payment:", error);
          // Payment capture failed - rollback booking completion and mark for manual review
          await storage.updateBooking(req.params.id, {
            status: 'in_progress', // Rollback from completed
            pickupConfirmedAt: null,
            paymentStatus: 'held', // Ensure payment remains held
            platformFee: null,
            guardianPayout: null,
            stripeTransferId: null,
            specialInstructions: (booking.specialInstructions || '') + 
              `\n[ADMIN REVIEW NEEDED: Payment capture failed - ${error.message}]`,
          });
          throw new Error(`Payment capture failed: ${error.message}`);
        }
      }

      const responseMessage = finalPaymentStatus === 'released' 
        ? "Pickup confirmed and payment transferred to guardian successfully!"
        : "Pickup confirmed! Payment will be manually transferred to guardian.";
      
      res.json({ 
        message: responseMessage,
        paymentStatus: finalPaymentStatus,
        transferId: finalTransferId 
      });
    } catch (error: any) {
      console.error("Error confirming pickup:", error);
      res.status(500).json({ message: error.message || "Failed to confirm pickup" });
    }
  });

  // Manual payment release (admin only, for edge cases)
  app.post("/api/admin/bookings/:id/release-payment", isAdmin, async (req, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (!booking.stripePaymentIntentId) {
        return res.status(400).json({ message: "No payment intent found for this booking" });
      }

      if (booking.paymentStatus === 'released') {
        return res.status(400).json({ message: "Payment already released" });
      }

      // Capture the payment
      await stripe.paymentIntents.capture(booking.stripePaymentIntentId);
      
      await storage.updateBooking(req.params.id, {
        paymentStatus: 'released',
        paymentReleasedAt: new Date(),
      });

      res.json({ message: "Payment released successfully" });
    } catch (error: any) {
      console.error("Error releasing payment:", error);
      res.status(500).json({ message: error.message || "Failed to release payment" });
    }
  });

  // Stripe Connect Routes for Guardian Payouts
  
  app.post("/api/guardians/:id/create-connect-account", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const guardian = await storage.getGuardian(req.params.id);

      if (!guardian) {
        return res.status(404).json({ message: "Guardian not found" });
      }

      if (guardian.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (guardian.stripeConnectAccountId) {
        return res.status(400).json({ message: "Stripe Connect account already exists" });
      }

      const user = await storage.getUser(userId);
      
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user?.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      await storage.updateGuardian(req.params.id, {
        stripeConnectAccountId: account.id,
      });

      res.json({ accountId: account.id });
    } catch (error: any) {
      console.error("Error creating Connect account:", error);
      res.status(500).json({ message: error.message || "Failed to create Connect account" });
    }
  });

  app.post("/api/guardians/:id/create-account-link", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const guardian = await storage.getGuardian(req.params.id);

      if (!guardian) {
        return res.status(404).json({ message: "Guardian not found" });
      }

      if (guardian.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (!guardian.stripeConnectAccountId) {
        return res.status(400).json({ message: "No Stripe Connect account found" });
      }

      const accountLink = await stripe.accountLinks.create({
        account: guardian.stripeConnectAccountId,
        refresh_url: `${req.headers.origin || 'https://' + req.headers.host}/dashboard?stripe_refresh=true`,
        return_url: `${req.headers.origin || 'https://' + req.headers.host}/dashboard?stripe_onboarding=complete`,
        type: 'account_onboarding',
      });

      res.json({ url: accountLink.url });
    } catch (error: any) {
      console.error("Error creating account link:", error);
      res.status(500).json({ message: error.message || "Failed to create account link" });
    }
  });

  app.get("/api/guardians/:id/connect-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const guardian = await storage.getGuardian(req.params.id);

      if (!guardian) {
        return res.status(404).json({ message: "Guardian not found" });
      }

      if (guardian.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (!guardian.stripeConnectAccountId) {
        return res.json({ 
          hasAccount: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
        });
      }

      const account = await stripe.accounts.retrieve(guardian.stripeConnectAccountId);

      const status = {
        hasAccount: true,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirementsCurrentlyDue: account.requirements?.currently_due || [],
      };

      if (account.charges_enabled !== guardian.stripeOnboardingComplete ||
          account.payouts_enabled !== guardian.payoutsEnabled) {
        await storage.updateGuardian(req.params.id, {
          stripeOnboardingComplete: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
        });
      }

      res.json(status);
    } catch (error: any) {
      console.error("Error fetching Connect status:", error);
      res.status(500).json({ message: error.message || "Failed to fetch Connect status" });
    }
  });

  // Package Management Routes
  
  // Get packages for a booking
  app.get("/api/bookings/:bookingId/packages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const booking = await storage.getBooking(req.params.bookingId);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Only customer or guardian can view packages
      if (booking.customerId !== userId && booking.guardian.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const packages = await storage.getPackagesByBooking(req.params.bookingId);
      res.json(packages);
    } catch (error) {
      console.error("Error fetching packages:", error);
      res.status(500).json({ message: "Failed to fetch packages" });
    }
  });

  // Get all packages for a guardian
  app.get("/api/guardians/:guardianId/packages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const guardian = await storage.getGuardian(req.params.guardianId);

      if (!guardian) {
        return res.status(404).json({ message: "Guardian not found" });
      }

      // Only the guardian can view their packages
      if (guardian.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const packages = await storage.getPackagesByGuardian(req.params.guardianId);
      res.json(packages);
    } catch (error) {
      console.error("Error fetching packages:", error);
      res.status(500).json({ message: "Failed to fetch packages" });
    }
  });

  // Create a new package (typically done by system when booking is confirmed)
  app.post("/api/packages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const booking = await storage.getBooking(req.body.bookingId);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Only customer can create packages for their booking
      if (booking.customerId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertPackageSchema.parse({
        ...req.body,
        customerId: userId,
        guardianId: booking.guardianId,
      });

      const pkg = await storage.createPackage(validatedData);
      res.status(201).json(pkg);
    } catch (error: any) {
      console.error("Error creating package:", error);
      res.status(400).json({ message: error.message || "Failed to create package" });
    }
  });

  // Mark package as received (guardian)
  app.post("/api/packages/:id/mark-received", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pkg = await storage.getPackage(req.params.id);

      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }

      const guardian = await storage.getGuardian(pkg.guardianId);
      if (!guardian || guardian.userId !== userId) {
        return res.status(403).json({ message: "Forbidden - Only guardian can mark as received" });
      }

      const updated = await storage.updatePackage(req.params.id, {
        status: 'received',
        receivedAt: new Date(),
        photoUrl: req.body.photoUrl,
        notes: req.body.notes,
      });

      res.json(updated);
    } catch (error: any) {
      console.error("Error marking package as received:", error);
      res.status(500).json({ message: error.message || "Failed to mark package as received" });
    }
  });

  // Mark package as picked up (guardian)
  app.post("/api/packages/:id/mark-picked-up", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pkg = await storage.getPackage(req.params.id);

      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }

      const guardian = await storage.getGuardian(pkg.guardianId);
      if (!guardian || guardian.userId !== userId) {
        return res.status(403).json({ message: "Forbidden - Only guardian can mark as picked up" });
      }

      const updated = await storage.updatePackage(req.params.id, {
        status: 'picked_up',
        pickedUpAt: new Date(),
      });

      res.json(updated);
    } catch (error: any) {
      console.error("Error marking package as picked up:", error);
      res.status(500).json({ message: error.message || "Failed to mark package as picked up" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
