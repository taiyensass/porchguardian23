# Porchguardian

## Overview

Porchguardian is a neighborhood package guardian platform that connects neighbors who need package delivery services with trusted local guardians willing to accept packages. The application facilitates secure package handling through a booking system, Stripe Connect payout processing with automatic platform fee deduction, and review mechanisms to build community trust.

The platform is built as a full-stack TypeScript application with a React frontend and Express backend, utilizing Replit Auth for authentication, Stripe for payment processing, and Stripe Connect for guardian payouts.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack Query for server state management and data fetching

**UI & Styling**
- Tailwind CSS for utility-first styling with custom design system
- shadcn/ui component library (Radix UI primitives) for accessible, pre-built components
- Design guidelines follow Airbnb/Nextdoor patterns emphasizing trust and community
- Custom color scheme with HSL variables for light/dark mode support
- Typography uses Inter for body text and DM Sans for headings

**State Management Pattern**
- Server state managed by TanStack Query with centralized `queryClient`
- Authentication state through custom `useAuth` hook
- Optimistic updates and cache invalidation for booking/review operations
- No global client state management library (Redux/Zustand) - relies on React Query's cache

### Backend Architecture

**Server Framework**
- Express.js with TypeScript
- Development mode uses Vite middleware for HMR (Hot Module Replacement)
- Production build uses esbuild to bundle server code
- Custom logging middleware for API request monitoring

**Authentication Strategy**
- Replit Auth with OpenID Connect (OIDC) integration
- Passport.js for authentication middleware
- Session-based authentication using `connect-pg-simple` for PostgreSQL session storage
- User roles: customer, guardian, admin
- Protected routes with `isAuthenticated` and `isAdmin` middleware

**Database Layer**
- PostgreSQL database (Neon serverless driver with WebSocket support)
- Drizzle ORM for type-safe database operations
- Schema-first approach with generated TypeScript types
- Storage abstraction layer (`storage.ts`) isolating database operations from route handlers

**Database Schema Design**
Key entities:
- **Users**: Core user table required by Replit Auth (id, email, role, profile data)
- **Sessions**: Session storage for authentication
- **Guardians**: Extended profile for users accepting packages (address, pricing, availability)
- **Bookings**: Package delivery requests (customer, guardian, dates, status, pricing)
- **Packages**: Individual package tracking within bookings
- **Messages**: Communication between customers and guardians per booking
- **Reviews**: Post-booking feedback and ratings

Relationships:
- One-to-one: User → Guardian (optional)
- One-to-many: Guardian → Bookings, User (as customer) → Bookings
- One-to-many: Booking → Messages, Booking → Packages, Guardian → Reviews

**API Design**
RESTful endpoints organized by resource:
- `/api/auth/*` - Authentication (login, logout, user session with availableRoles)
- `/api/guardians/*` - Guardian profiles and discovery
- `/api/admin/*` - Admin-only routes (guardian approval, metrics, user management)
- `/api/bookings/*` - Booking lifecycle management
- `/api/messages/*` - Booking-related messaging
- `/api/reviews/*` - Review submission and retrieval
- `/api/packages/*` - Package tracking updates

All API routes use JSON request/response format with credential-based sessions.

### Payment Integration

**Stripe Implementation**
- Server-side Stripe SDK integration using secret key
- Payment Intent workflow for secure payment processing with authorization hold
- Stripe Connect Express accounts for guardian payouts
- Checkout flow:
  1. Booking created with "pending" status
  2. Payment Intent generated on backend with manual capture
  3. Frontend displays Stripe Payment Element
  4. Payment authorized and held (not captured) until pickup confirmation
  5. Customer confirms pickup → payment captured → 15% platform fee deducted → 85% transferred to guardian
- Payout flow:
  1. Guardian creates Stripe Connect Express account via dashboard
  2. Guardian completes onboarding (bank account details, identity verification)
  3. On pickup confirmation, automatic transfer to guardian's connected account
  4. If transfer fails: payment remains held, booking flagged for admin review
  5. If capture fails: booking status rolled back, payment remains authorized, admin review flagged
- Environment variables: `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLIC_KEY`, `TESTING_STRIPE_SECRET_KEY`, `TESTING_VITE_STRIPE_PUBLIC_KEY`

### Routing & Page Structure

**Public Routes**
- `/` - Landing page (redirects to Dashboard if authenticated)
- `/guardians` - Browse available guardians with search/filter
- `/guardian/:id` - Individual guardian profile with booking widget

**Protected Routes** (require authentication)
- `/dashboard` - User dashboard with bookings and guardian management
- `/become-guardian` - Guardian application form
- `/checkout/:bookingId` - Stripe payment interface
- `/payment-success` - Post-payment confirmation

**Authentication Flow**
- Unauthenticated users redirected to `/api/login` (Replit Auth)
- After login, OAuth redirects back to application with session
- Session validated on protected routes, 401 triggers re-login

### Role-Based Dashboard System

**Dashboard Architecture**
- DashboardLayout component with RoleSwitcher for seamless role transitions
- Role selection priority: URL param (?role=) > localStorage > admin > guardian > customer
- Backend-driven availableRoles calculated from user.role and guardian profile existence
- Each role displays different dashboard views: CustomerDashboardView, GuardianDashboardView, AdminDashboardView

**Admin Dashboard**
- Guardian approval queue with approve/reject actions
- Platform metrics: total guardians, active bookings, total users
- User management tools with role assignment
- All admin routes secured with isAdmin middleware

**Guardian Application Flow**
- POST /api/guardians creates guardian profile with verificationStatus='pending'
- Optimistic cache update pattern prevents race conditions:
  1. Guardian creation returns created guardian object
  2. Immediately cache guardian data: `queryClient.setQueryData(["/api/guardians/by-user"], createdGuardian)`
  3. Invalidate /api/auth/user to refresh availableRoles
  4. 100ms delay before redirect ensures database commit
  5. Redirect to /dashboard?role=guardian
- GuardianDashboardView self-fetches guardian profile with loading states
- Pending guardians see "Pending Approval" status badge and payout setup guidance
- After admin approval, guardians can complete Stripe Connect onboarding

**Cache Strategy**
- Optimistic updates for guardian creation to avoid 404 on immediate navigation
- Background refetch reconciles cached data with database state
- Invalidation cascades: guardian changes invalidate auth user's availableRoles

## External Dependencies

### Authentication
- **Replit Auth**: OIDC-based authentication system
  - Environment variables: `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`
  - Handles user registration, login, profile management
  - Returns user claims (sub, email, name, profile image)

### Database
- **Neon Serverless Postgres**: Cloud PostgreSQL database
  - Environment variable: `DATABASE_URL`
  - WebSocket connection support for serverless environments
  - Connection pooling via `@neondatabase/serverless`

### Payment Processing
- **Stripe**: Payment infrastructure
  - Server key: `STRIPE_SECRET_KEY`
  - Client key: `VITE_STRIPE_PUBLIC_KEY`
  - API version: `2025-09-30.clover`
  - Elements integration for hosted payment forms

### UI Component Library
- **Radix UI**: Unstyled, accessible component primitives
  - Dialog, Dropdown, Popover, Tabs, Toast, and 20+ other components
  - Full keyboard navigation and ARIA compliance
  - Customized through Tailwind CSS

### Third-Party Services
- **Google Fonts**: Typography assets (Inter, DM Sans)
- **Replit Development Tools** (dev only):
  - `@replit/vite-plugin-runtime-error-modal` - Error overlay
  - `@replit/vite-plugin-cartographer` - Code navigation
  - `@replit/vite-plugin-dev-banner` - Development banner

### Build & Development Tools
- **Vite**: Frontend build tool with React plugin
- **esbuild**: Server-side bundler for production
- **TypeScript**: Type checking across full stack
- **Drizzle Kit**: Database migration management
- **PostCSS**: CSS processing with Tailwind and Autoprefixer