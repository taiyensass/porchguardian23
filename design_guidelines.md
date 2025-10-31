# Porchguardian.com Design Guidelines

## Design Approach

**Reference-Based Approach**: Drawing inspiration from Airbnb's trust-building patterns and Nextdoor's community focus. This platform requires visual warmth and credibility to facilitate neighbor-to-neighbor transactions.

**Core Principle**: Build trust through authentic imagery, clear information hierarchy, and approachable design that emphasizes community over transactions.

---

## Typography System

**Font Families** (via Google Fonts):
- Primary: 'Inter' - Clean, modern sans-serif for UI elements and body text
- Headings: 'Cal Sans' or 'DM Sans' (600-700 weight) - Friendly, approachable for headlines

**Type Scale**:
- Hero Headline: text-5xl md:text-6xl lg:text-7xl, font-semibold
- Section Headings: text-3xl md:text-4xl, font-semibold
- Card Titles: text-xl md:text-2xl, font-semibold
- Body Text: text-base md:text-lg, font-normal (leading-relaxed for readability)
- Captions/Meta: text-sm, font-medium

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, and 16 consistently
- Micro spacing: space-2, space-4 (between related elements)
- Component padding: p-6, p-8
- Section spacing: py-12, py-16, py-20 (mobile to desktop)
- Large gaps: gap-8, gap-12, gap-16

**Container Strategy**:
- Full-width sections with inner max-w-7xl mx-auto px-4 md:px-6 lg:px-8
- Content-focused areas: max-w-6xl
- Form containers: max-w-2xl

---

## Component Library

### Navigation
**Primary Header**: Sticky top navigation with semi-transparent backdrop blur
- Logo left, search bar center (on desktop), user menu right
- Mobile: Hamburger menu with full-screen overlay
- Include: "Become a Guardian" CTA button, Login/Signup
- Height: h-16 md:h-20

### Hero Section
**Design**: Full-width hero with authentic neighborhood imagery (friendly porch/package delivery scene)
- Height: min-h-[600px] md:min-h-[700px] (not forced 100vh)
- Overlay: Gradient overlay (top-to-bottom) for text readability
- Content: Centered with max-w-4xl
  - Large headline: "Your Neighborhood Package Guardian"
  - Subheading explaining value proposition
  - Search component (location input + date range + "Find Guardians" button with blurred background)
  - Trust indicators below: "10,000+ Trusted Guardians" | "500,000+ Packages Protected" | "99% Positive Reviews"

### Search & Discovery

**Guardian Cards Grid**: 
- Layout: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Card structure:
  - Guardian photo (rounded-2xl, aspect-video or square)
  - Name + verified badge
  - Location (neighborhood, distance)
  - Star rating + review count
  - Pricing per package
  - Availability indicator (e.g., "Available this week")
  - Quick stats: Response time, acceptance rate
- Hover: Subtle lift (shadow-lg) and slight scale

**Map View Integration**: 
- Split layout option: 50/50 map and list on desktop (lg:grid-cols-2)
- Mobile: Toggleable tabs between map and list view
- Map markers showing guardian locations with pricing preview on click

### Guardian Profile Page

**Layout Structure**:
- Hero: Full-width guardian photo gallery (main + 4-5 thumbnails)
- Two-column below hero (lg:grid-cols-3, with 2-col for main content):
  
**Left Column (2/3 width)**:
- About section with photo and bio
- Address/location details with mini map
- Package acceptance capabilities (size limits, special handling)
- Reviews section (cards with reviewer photo, rating, date, comment)
- House rules/instructions

**Right Column (1/3 width, sticky)**:
- Pricing card with booking widget
  - Date picker for package arrival
  - Package count selector
  - Total price calculation
  - "Request Guardian" CTA button
  - Cancellation policy summary
- Trust indicators: Verified ID, response rate, completion rate
- Contact guardian button (secondary)

### Booking Flow

**Multi-step Process** (Modal or dedicated page):
1. **Package Details**: Form with fields for package info, special instructions
2. **Dates & Timing**: Delivery date, estimated pickup date
3. **Payment**: Stripe integration interface
4. **Confirmation**: Summary with guardian contact info and next steps

**Design**: Card-based steps with progress indicator at top (1/3 → 2/3 → 3/3)

### Dashboard (Customers & Guardians)

**Unified Layout**:
- Left sidebar navigation (bookings, messages, profile, earnings for guardians)
- Main content area with tab navigation for status filters
- Booking cards showing:
  - Guardian/customer photo and name
  - Dates and status badge
  - Package count and details
  - Action buttons (Contact, View Details, Confirm Receipt)

**Status Indicators**: Use badge components (rounded-full px-3 py-1) with clear states:
- Pending, Confirmed, In Progress, Completed, Cancelled

### Messaging System

**Thread List + Chat View**:
- Split layout: Conversations list (1/3) + active chat (2/3)
- Message bubbles with sender alignment
- Booking context card at top of each conversation
- Quick actions: Send booking details, Request update

### Trust & Safety Elements

**Distributed Throughout**:
- Verification badges (email, phone, ID, background check)
- Insurance coverage messaging
- Community guidelines links
- Report/flag functionality
- Star ratings + written reviews prominently displayed

### Footer

**Comprehensive Multi-column** (grid-cols-2 md:grid-cols-4):
- About Porchguardian + mission statement
- Quick links (How it Works, Become a Guardian, Trust & Safety)
- Support (Help Center, Contact Us, Community Guidelines)
- Social media links + newsletter signup
- Legal links at bottom (Terms, Privacy, Insurance Info)

---

## Responsive Behavior

**Mobile-First Approach**:
- Stack all multi-column layouts to single column on mobile
- Bottom navigation bar for key actions on mobile dashboards
- Full-screen search and filters on mobile
- Simplified guardian cards (vertical orientation)

**Breakpoints**:
- Mobile: base (all)
- Tablet: md: (768px+)
- Desktop: lg: (1024px+)
- Wide: xl: (1280px+)

---

## Images

**Required Images**:

1. **Hero Section**: Warm, welcoming image of a friendly neighbor receiving/holding packages on a front porch. Should feel authentic, diverse, and community-focused. Dimensions: 1920x1080 minimum

2. **Guardian Profile Photos**: Authentic headshots and porch/home exterior photos showing the package acceptance area

3. **How It Works Section**: 3 illustrative photos showing: 1) Searching for guardians, 2) Package being delivered to guardian, 3) Happy customer picking up package

4. **Trust Section**: Photos showing security features (ID verification, insurance documentation) or happy community members

5. **Guardian Cards**: Square or landscape profile images for each guardian listing (600x600 or 800x600)

The website includes a large hero image with blurred-background CTA buttons overlaid on the imagery.

---

## Animation & Interaction

**Minimal, Purposeful Motion**:
- Card hover states: Subtle lift with shadow transition
- Button hover: Slight scale (scale-105) and shadow enhancement
- Page transitions: Simple fade
- Loading states: Skeleton screens for cards and lists
- No scroll-based animations

**Focus States**: Clear focus rings (ring-2 ring-offset-2) for accessibility

---

## Icon System

**Library**: Heroicons (outline for most UI, solid for active states)
- Navigation icons
- Feature indicators (verified badge, star ratings, location pins)
- Action buttons (message, calendar, payment)
- Status indicators

Use via CDN, consistent sizing (w-5 h-5 for inline, w-6 h-6 for standalone)