import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("customer"), // customer, guardian, admin
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Guardian profiles - users who accept packages
export const guardians = pgTable("guardians", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  bio: text("bio"),
  address: text("address").notNull(),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  zipCode: varchar("zip_code").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  pricePerPackage: decimal("price_per_package", { precision: 10, scale: 2 }).notNull(),
  maxPackages: integer("max_packages").notNull().default(5),
  porchImageUrl: varchar("porch_image_url"),
  isActive: boolean("is_active").notNull().default(true),
  verificationStatus: varchar("verification_status").notNull().default("pending"), // pending, verified, rejected
  identityDocumentUrl: varchar("identity_document_url"),
  stripeIdentitySessionId: varchar("stripe_identity_session_id"),
  stripeConnectAccountId: varchar("stripe_connect_account_id"),
  stripeOnboardingComplete: boolean("stripe_onboarding_complete").default(false),
  payoutsEnabled: boolean("payouts_enabled").default(false),
  verifiedAt: timestamp("verified_at"),
  responseTime: varchar("response_time").default("within 1 hour"),
  acceptanceRate: integer("acceptance_rate").default(95),
  totalBookings: integer("total_bookings").default(0),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("5.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const guardiansRelations = relations(guardians, ({ one, many }) => ({
  user: one(users, {
    fields: [guardians.userId],
    references: [users.id],
  }),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const insertGuardianSchema = createInsertSchema(guardians).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalBookings: true,
  averageRating: true,
});

export type InsertGuardian = z.infer<typeof insertGuardianSchema>;
export type Guardian = typeof guardians.$inferSelect;

// Bookings - package acceptance requests
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  guardianId: varchar("guardian_id").notNull().references(() => guardians.id, { onDelete: 'cascade' }),
  deliveryDate: timestamp("delivery_date").notNull(),
  pickupDate: timestamp("pickup_date"),
  packageCount: integer("package_count").notNull().default(1),
  packageDetails: text("package_details"),
  specialInstructions: text("special_instructions"),
  status: varchar("status").notNull().default("pending"), // pending, confirmed, in_progress, completed, cancelled
  paymentStatus: varchar("payment_status").notNull().default("held"), // held, released, refunded
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }),
  guardianPayout: decimal("guardian_payout", { precision: 10, scale: 2 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  stripeTransferId: varchar("stripe_transfer_id"),
  pickupConfirmedAt: timestamp("pickup_confirmed_at"),
  paymentReleasedAt: timestamp("payment_released_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  customer: one(users, {
    fields: [bookings.customerId],
    references: [users.id],
  }),
  guardian: one(guardians, {
    fields: [bookings.guardianId],
    references: [guardians.id],
  }),
  messages: many(messages),
  packages: many(packages),
  review: one(reviews),
}));

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// Messages between customers and guardians
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  booking: one(bookings, {
    fields: [messages.bookingId],
    references: [bookings.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Reviews for guardians
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id, { onDelete: 'cascade' }).unique(),
  guardianId: varchar("guardian_id").notNull().references(() => guardians.id, { onDelete: 'cascade' }),
  customerId: varchar("customer_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviewsRelations = relations(reviews, ({ one }) => ({
  booking: one(bookings, {
    fields: [reviews.bookingId],
    references: [bookings.id],
  }),
  guardian: one(guardians, {
    fields: [reviews.guardianId],
    references: [guardians.id],
  }),
  customer: one(users, {
    fields: [reviews.customerId],
    references: [users.id],
  }),
}));

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// Packages - individual packages received by guardians
export const packages = pgTable("packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  guardianId: varchar("guardian_id").notNull().references(() => guardians.id, { onDelete: 'cascade' }),
  customerId: varchar("customer_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  trackingNumber: varchar("tracking_number"),
  carrier: varchar("carrier"), // USPS, FedEx, UPS, Amazon, etc.
  status: varchar("status").notNull().default("expected"), // expected, received, picked_up
  receivedAt: timestamp("received_at"),
  pickedUpAt: timestamp("picked_up_at"),
  notes: text("notes"),
  photoUrl: varchar("photo_url"), // Photo of package when received
  createdAt: timestamp("created_at").defaultNow(),
});

export const packagesRelations = relations(packages, ({ one }) => ({
  booking: one(bookings, {
    fields: [packages.bookingId],
    references: [bookings.id],
  }),
  guardian: one(guardians, {
    fields: [packages.guardianId],
    references: [guardians.id],
  }),
  customer: one(users, {
    fields: [packages.customerId],
    references: [users.id],
  }),
}));

export const insertPackageSchema = createInsertSchema(packages).omit({
  id: true,
  createdAt: true,
});

export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Package = typeof packages.$inferSelect;
