import {
  users,
  guardians,
  bookings,
  messages,
  reviews,
  packages,
  userCredits,
  creditTransactions,
  pricingTiers,
  type User,
  type UpsertUser,
  type Guardian,
  type InsertGuardian,
  type Booking,
  type InsertBooking,
  type Message,
  type InsertMessage,
  type Review,
  type InsertReview,
  type Package,
  type InsertPackage,
  type UserCredits,
  type InsertUserCredits,
  type CreditTransaction,
  type InsertCreditTransaction,
  type PricingTier,
  type InsertPricingTier,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Guardian operations
  getGuardian(id: string): Promise<any | undefined>;
  getGuardianByUserId(userId: string): Promise<Guardian | undefined>;
  getAllGuardians(): Promise<any[]>;
  getAllGuardiansForAdmin(): Promise<Guardian[]>;
  getPendingGuardians(): Promise<any[]>;
  createGuardian(guardian: InsertGuardian): Promise<Guardian>;
  updateGuardian(id: string, guardian: Partial<InsertGuardian>): Promise<Guardian>;

  // Booking operations
  getBooking(id: string): Promise<any | undefined>;
  getBookingsByCustomer(customerId: string): Promise<any[]>;
  getBookingsByGuardian(guardianId: string): Promise<any[]>;
  getAllBookingsForAdmin(): Promise<any[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking>;

  // Message operations
  getMessagesByBooking(bookingId: string): Promise<any[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Review operations
  getReviewsByGuardian(guardianId: string): Promise<any[]>;
  getReviewByBooking(bookingId: string): Promise<Review | undefined>;
  createReview(review: InsertReview): Promise<Review>;

  // Package operations
  getPackage(id: string): Promise<Package | undefined>;
  getPackagesByBooking(bookingId: string): Promise<Package[]>;
  getPackagesByGuardian(guardianId: string): Promise<Package[]>;
  createPackage(pkg: InsertPackage): Promise<Package>;
  updatePackage(id: string, pkg: Partial<InsertPackage>): Promise<Package>;

  // Credit operations
  getUserCredits(userId: string): Promise<UserCredits | undefined>;
  ensureUserCredits(userId: string): Promise<UserCredits>;
  addCredits(userId: string, amount: number, type: string, description: string, stripePaymentIntentId?: string): Promise<UserCredits>;
  deductCredits(userId: string, amount: number, bookingId: string, description: string): Promise<UserCredits>;
  getCreditTransactions(userId: string): Promise<CreditTransaction[]>;

  // Pricing tier operations
  getPricingTiers(): Promise<PricingTier[]>;
  getActivePricingTiers(): Promise<PricingTier[]>;
  getPricingTier(id: string): Promise<PricingTier | undefined>;
  createPricingTier(tier: InsertPricingTier): Promise<PricingTier>;
  updatePricingTier(id: string, tier: Partial<InsertPricingTier>): Promise<PricingTier>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Guardian operations
  async getGuardian(id: string): Promise<any | undefined> {
    const [guardian] = await db
      .select()
      .from(guardians)
      .leftJoin(users, eq(guardians.userId, users.id))
      .where(eq(guardians.id, id));

    if (!guardian) return undefined;

    return {
      ...guardian.guardians,
      user: guardian.users,
    };
  }

  async getGuardianByUserId(userId: string): Promise<Guardian | undefined> {
    const [guardian] = await db
      .select()
      .from(guardians)
      .where(eq(guardians.userId, userId));
    return guardian;
  }

  async getAllGuardians(): Promise<any[]> {
    const results = await db
      .select()
      .from(guardians)
      .leftJoin(users, eq(guardians.userId, users.id))
      .where(and(eq(guardians.isActive, true), eq(guardians.verificationStatus, 'verified')));

    return results.map((row) => ({
      ...row.guardians,
      user: row.users,
    }));
  }

  async getAllGuardiansForAdmin(): Promise<Guardian[]> {
    return await db.select().from(guardians).orderBy(desc(guardians.createdAt));
  }

  async getPendingGuardians(): Promise<any[]> {
    const results = await db
      .select()
      .from(guardians)
      .leftJoin(users, eq(guardians.userId, users.id))
      .where(eq(guardians.verificationStatus, 'pending'))
      .orderBy(desc(guardians.createdAt));

    return results.map((row) => ({
      ...row.guardians,
      user: row.users,
    }));
  }

  async createGuardian(guardianData: InsertGuardian): Promise<Guardian> {
    const [guardian] = await db
      .insert(guardians)
      .values(guardianData)
      .returning();
    return guardian;
  }

  async updateGuardian(id: string, guardianData: Partial<InsertGuardian>): Promise<Guardian> {
    const [guardian] = await db
      .update(guardians)
      .set({ ...guardianData, updatedAt: new Date() })
      .where(eq(guardians.id, id))
      .returning();
    return guardian;
  }

  // Booking operations
  async getBooking(id: string): Promise<any | undefined> {
    const [booking] = await db
      .select()
      .from(bookings)
      .leftJoin(guardians, eq(bookings.guardianId, guardians.id))
      .leftJoin(users, eq(guardians.userId, users.id))
      .where(eq(bookings.id, id));

    if (!booking) return undefined;

    return {
      ...booking.bookings,
      guardian: {
        ...booking.guardians,
        user: booking.users,
      },
    };
  }

  async getBookingsByCustomer(customerId: string): Promise<any[]> {
    const results = await db
      .select()
      .from(bookings)
      .leftJoin(guardians, eq(bookings.guardianId, guardians.id))
      .leftJoin(users, eq(guardians.userId, users.id))
      .where(eq(bookings.customerId, customerId))
      .orderBy(desc(bookings.createdAt));

    return results.map((row) => ({
      ...row.bookings,
      guardian: {
        ...row.guardians,
        user: row.users,
      },
    }));
  }

  async getBookingsByGuardian(guardianId: string): Promise<any[]> {
    const results = await db
      .select()
      .from(bookings)
      .leftJoin(users, eq(bookings.customerId, users.id))
      .where(eq(bookings.guardianId, guardianId))
      .orderBy(desc(bookings.createdAt));

    return results.map((row) => ({
      ...row.bookings,
      customer: row.users,
    }));
  }

  async getAllBookingsForAdmin(): Promise<any[]> {
    // Create alias for customer users to avoid join conflict
    const customerUsers = alias(users, 'customerUsers');
    const guardianUsers = alias(users, 'guardianUsers');
    
    const results = await db
      .select()
      .from(bookings)
      .leftJoin(guardians, eq(bookings.guardianId, guardians.id))
      .leftJoin(guardianUsers, eq(guardians.userId, guardianUsers.id))
      .leftJoin(customerUsers, eq(bookings.customerId, customerUsers.id))
      .orderBy(desc(bookings.createdAt));

    return results.map((row) => ({
      ...row.bookings,
      guardian: {
        ...row.guardians,
        user: row.guardianUsers,
      },
      customer: row.customerUsers,
    }));
  }

  async createBooking(bookingData: InsertBooking): Promise<Booking> {
    const [booking] = await db
      .insert(bookings)
      .values(bookingData)
      .returning();
    return booking;
  }

  async updateBooking(id: string, bookingData: Partial<InsertBooking>): Promise<Booking> {
    const [booking] = await db
      .update(bookings)
      .set({ ...bookingData, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  // Message operations
  async getMessagesByBooking(bookingId: string): Promise<any[]> {
    const results = await db
      .select()
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.bookingId, bookingId))
      .orderBy(messages.createdAt);

    return results.map((row) => ({
      ...row.messages,
      sender: row.users,
    }));
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    return message;
  }

  // Review operations
  async getReviewsByGuardian(guardianId: string): Promise<any[]> {
    const results = await db
      .select()
      .from(reviews)
      .leftJoin(users, eq(reviews.customerId, users.id))
      .where(eq(reviews.guardianId, guardianId))
      .orderBy(desc(reviews.createdAt));

    return results.map((row) => ({
      ...row.reviews,
      customer: row.users,
    }));
  }

  async getReviewByBooking(bookingId: string): Promise<Review | undefined> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.bookingId, bookingId));
    return review;
  }

  async createReview(reviewData: InsertReview): Promise<Review> {
    const [review] = await db
      .insert(reviews)
      .values(reviewData)
      .returning();

    // Update guardian's average rating
    const allReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.guardianId, reviewData.guardianId));

    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await db
      .update(guardians)
      .set({ averageRating: avgRating.toFixed(2) })
      .where(eq(guardians.id, reviewData.guardianId));

    return review;
  }

  // Package operations
  async getPackage(id: string): Promise<Package | undefined> {
    const [pkg] = await db
      .select()
      .from(packages)
      .where(eq(packages.id, id));
    return pkg;
  }

  async getPackagesByBooking(bookingId: string): Promise<Package[]> {
    return await db
      .select()
      .from(packages)
      .where(eq(packages.bookingId, bookingId))
      .orderBy(desc(packages.createdAt));
  }

  async getPackagesByGuardian(guardianId: string): Promise<Package[]> {
    return await db
      .select()
      .from(packages)
      .where(eq(packages.guardianId, guardianId))
      .orderBy(desc(packages.createdAt));
  }

  async createPackage(packageData: InsertPackage): Promise<Package> {
    const [pkg] = await db
      .insert(packages)
      .values(packageData)
      .returning();
    return pkg;
  }

  async updatePackage(id: string, packageData: Partial<InsertPackage>): Promise<Package> {
    const [pkg] = await db
      .update(packages)
      .set(packageData)
      .where(eq(packages.id, id))
      .returning();
    return pkg;
  }

  // Credit operations
  async getUserCredits(userId: string): Promise<UserCredits | undefined> {
    const [credits] = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId));
    return credits;
  }

  async ensureUserCredits(userId: string): Promise<UserCredits> {
    const existing = await this.getUserCredits(userId);
    if (existing) return existing;

    const [credits] = await db
      .insert(userCredits)
      .values({ userId, balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 })
      .returning();
    return credits;
  }

  async addCredits(
    userId: string,
    amount: number,
    type: string,
    description: string,
    stripePaymentIntentId?: string
  ): Promise<UserCredits> {
    const credits = await this.ensureUserCredits(userId);
    
    const newBalance = credits.balance + amount;
    const newLifetimeEarned = credits.lifetimeEarned + amount;

    const [updatedCredits] = await db
      .update(userCredits)
      .set({
        balance: newBalance,
        lifetimeEarned: newLifetimeEarned,
        updatedAt: new Date(),
      })
      .where(eq(userCredits.userId, userId))
      .returning();

    await db.insert(creditTransactions).values({
      userId,
      type,
      amount,
      balanceAfter: newBalance,
      description,
      stripePaymentIntentId,
    });

    return updatedCredits;
  }

  async deductCredits(
    userId: string,
    amount: number,
    bookingId: string,
    description: string
  ): Promise<UserCredits> {
    const credits = await this.ensureUserCredits(userId);
    
    if (credits.balance < amount) {
      throw new Error('Insufficient credits');
    }

    const newBalance = credits.balance - amount;
    const newLifetimeSpent = credits.lifetimeSpent + amount;

    const [updatedCredits] = await db
      .update(userCredits)
      .set({
        balance: newBalance,
        lifetimeSpent: newLifetimeSpent,
        updatedAt: new Date(),
      })
      .where(eq(userCredits.userId, userId))
      .returning();

    await db.insert(creditTransactions).values({
      userId,
      type: 'booking_deduction',
      amount: -amount,
      balanceAfter: newBalance,
      description,
      bookingId,
    });

    return updatedCredits;
  }

  async getCreditTransactions(userId: string): Promise<CreditTransaction[]> {
    return await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt));
  }

  // Pricing tier operations
  async getPricingTiers(): Promise<PricingTier[]> {
    return await db
      .select()
      .from(pricingTiers)
      .orderBy(pricingTiers.displayOrder);
  }

  async getActivePricingTiers(): Promise<PricingTier[]> {
    return await db
      .select()
      .from(pricingTiers)
      .where(eq(pricingTiers.isActive, true))
      .orderBy(pricingTiers.displayOrder);
  }

  async getPricingTier(id: string): Promise<PricingTier | undefined> {
    const [tier] = await db
      .select()
      .from(pricingTiers)
      .where(eq(pricingTiers.id, id));
    return tier;
  }

  async createPricingTier(tierData: InsertPricingTier): Promise<PricingTier> {
    const [tier] = await db
      .insert(pricingTiers)
      .values(tierData)
      .returning();
    return tier;
  }

  async updatePricingTier(id: string, tierData: Partial<InsertPricingTier>): Promise<PricingTier> {
    const [tier] = await db
      .update(pricingTiers)
      .set({ ...tierData, updatedAt: new Date() })
      .where(eq(pricingTiers.id, id))
      .returning();
    return tier;
  }
}

export const storage = new DatabaseStorage();
