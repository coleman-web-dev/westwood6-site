# DuesIQ - HOA Management Portal

Follow these instructions carefully and do not deviate from them.

## Project Overview

DuesIQ is a multi-tenant HOA (Homeowners Association) management portal. Each community gets its own tenant URL at `/{slug}` (e.g., `/westwood6`). Board members manage dues, announcements, amenities, voting, and documents. Homeowners view invoices, make payments, reserve amenities, and vote on ballots.

**First client:** Westwood Community Six (329 homes, 260 Stripe customers). Migrating from Membershine (HOA Start) to DuesIQ. Their Stripe account is a Connect Express account under Membershine with saved payment methods (Visa, Mastercard, ACH) but ZERO Stripe Subscriptions.

**Deployment:** Vercel (vercel.json has cron config for email queue processing)

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript 5.9
- **Database:** Supabase (Postgres + Auth + RLS + Edge Functions + Storage)
- **Payments:** Stripe (supports both Connect Express and Direct modes)
- **Email:** Resend + React Email templates, queue-based with cron processing
- **Styling:** Tailwind CSS 3.4 + shadcn/ui component library (~40 primitives)
- **UI Libraries:** Radix UI (full suite), Framer Motion, Lucide icons, Recharts, TanStack Table, React Day Picker, cmdk (command palette), vaul (drawer), embla-carousel, react-grid-layout, dnd-kit
- **Forms:** React Hook Form + Zod validation
- **Node:** >=22.0.0

## Commands

```bash
npm run dev        # Dev server on port 6006
npm run build      # Production build
npm run serve      # Start production server
npm run lint       # ESLint with auto-fix
npm run pretty     # Prettier
```

## Project Structure

```
app/
  layout.tsx                              # Root layout (fonts, providers, analytics)
  page.tsx                                # Marketing homepage
  (auth)/                                 # Auth pages (centered card layout)
    layout.tsx
    login/page.tsx                        # Login with first-timer detection
    signup/page.tsx                       # Signup (creates signup_request)
    reset-password/page.tsx               # Dual-mode: set password (with session) or request reset
  auth/callback/route.ts                  # Supabase OAuth code exchange
  [slug]/                                 # Community tenant routing
    layout.tsx                            # Fetches community + member, wraps CommunityProvider
    page.tsx                              # Public community landing page
    (protected)/                          # Auth-required pages
      layout.tsx                          # App shell (sidebar + topbar)
      dashboard/page.tsx
      announcements/page.tsx
      amenities/page.tsx
      bulletin-board/page.tsx
      documents/page.tsx
      events/page.tsx
      household/page.tsx
      maintenance/page.tsx
      onboarding/page.tsx                 # Board-only 5-step wizard
      payments/page.tsx
      settings/page.tsx
      voting/page.tsx
  api/
    email/
      process-queue/route.ts              # Cron: batch send queued emails (every 5 min)
      send-immediate/route.ts             # Synchronous email send
      unsubscribe/route.ts                # HMAC-verified unsubscribe
    newsletter/route.ts                   # Landing page newsletter signup
    stripe/
      checkout/route.ts                   # Create Checkout Session (one-off invoice payment)
      connect/route.ts                    # Create Express connected account
      connect/callback/route.ts           # Stripe Connect onboarding callback
      create-subscriptions/route.ts       # Bulk create recurring subscriptions
      customer-portal/route.ts            # Stripe Customer Portal session
      pre-create-accounts/route.ts        # Bulk pre-create Supabase Auth accounts
      sync-customers/route.ts             # Sync Stripe customers to members by email
      webhook/route.ts                    # Stripe webhook handler

components/
  amenities/                              # Amenity list, reservations, agreements, calendar
  announcements/                          # Announcement CRUD
  bulletin-board/                         # Posts, comments
  dashboard/                             # Sidebar, topbar, view-mode toggle
    cards/                                # 11 dashboard card components
  documents/                              # Document list, upload
  events/                                 # Event list, create
  household/                              # Member management, move-out, agreements
  landing/                                # Marketing page components (Shipixen/pliny)
  maintenance/                            # Maintenance requests
  notifications/                          # Notification bell
  onboarding/                             # 5 step components for setup wizard
  payments/                               # Invoices, assessments, wallet, ledger, pay button
  search/                                 # Search UI
  settings/                               # Community settings, profile, Stripe, email prefs
  shared/                                 # Header, Footer, Nav, ThemeSwitch
    ui/                                   # Full shadcn/ui library (~40 components)
  voting/                                 # Ballots, voting, quorum, results, proxy

lib/
  actions/
    auth-actions.ts                       # checkMemberExists, sendPasswordSetupLink
    email-actions.ts                      # sendAnnouncementEmails, sendWelcomeInvites
  email/
    resend.ts                             # getResendClient, sendEmailDirect
    queue.ts                              # queueEmail, queueBulkEmails, + specific queuers
    unsubscribe.ts                        # HMAC token generation/verification
    templates/                            # React Email templates (announcement, payment, welcome, etc.)
  providers/
    community-provider.tsx                # CommunityContext with viewMode toggle
  stripe.ts                               # getStripeClient singleton
  supabase/
    client.ts                             # Browser Supabase client
    server.ts                             # Server Supabase client (cookie-based)
    admin.ts                              # Service role client (bypasses RLS)
    middleware.ts                         # Session refresh
  types/
    database.ts                           # All DB row types and enums
    stripe.ts                             # Stripe request/response types
    dashboard.ts                          # Dashboard card visibility config
  utils/
    generate-assessment-invoices.ts       # Period calculation + invoice generation
  utils.ts                                # cn() helper (clsx + tailwind-merge)

supabase/
  migrations/                             # 20 numbered migration files (run in order)
  functions/                              # Edge functions (analyze-agreement)

middleware.ts                              # Auth guard (public routes, dev bypass)
```

## Database Schema

### Key Tables

- **communities** - tenant config (name, slug, address, theme JSON, payment_settings JSON)
- **units** - physical units/lots (unit_number, address, status, payment_frequency, stripe_subscription_id, stripe_subscription_status)
- **members** - people in units (user_id FK to auth.users, unit_id, system_role, member_role, email, stripe_customer_id)
- **invoices** - charges (unit_id, assessment_id, amount, amount_paid, status, due_date, stripe_payment_id, stripe_session_id, stripe_invoice_id)
- **payments** - payment records (invoice_id, unit_id, amount, stripe_session_id, stripe_payment_intent)
- **assessments** - recurring dues config (title, annual_amount, fiscal_year_start/end, community default_frequency)
- **unit_wallets** - per-unit wallet balance (auto-created by trigger)
- **wallet_transactions** - wallet activity log (overpayment, manual_credit, manual_debit, etc.)
- **stripe_accounts** - Stripe config per community (mode: 'connect'|'direct', stripe_account_id, webhook_secret, stripe_product_id)
- **announcements** - community announcements with priority levels
- **amenities** - reservable amenities with booking_type, agreements, time slots
- **reservations** - amenity bookings with deposit tracking
- **signed_agreements** - e-signed rental agreements
- **ballots** - voting (board_election, budget_approval, amendment, etc.)
- **ballot_options, ballot_votes, ballot_eligibility, proxy_authorizations**
- **maintenance_requests** - maintenance tickets
- **documents** - uploaded community documents
- **events** - community events
- **bulletin_posts, bulletin_comments** - community bulletin board
- **email_queue** - queued outbound emails (processed by cron)
- **email_preferences** - per-member per-category opt-out
- **signup_requests** - pending signup approvals
- **notifications** - in-app notification feed
- **user_preferences** - per-user settings (theme, layout)

### Key Enums

- `MemberRole`: owner, member, tenant, minor
- `SystemRole`: resident, board, manager, super_admin
- `InvoiceStatus`: pending, paid, overdue, partial, waived, voided
- `PaymentFrequency`: monthly, quarterly, semi_annual, annual
- `BallotStatus`: draft, scheduled, open, closed, certified, cancelled
- `ReservationStatus`: pending, approved, denied, cancelled
- `EmailStatus`: queued, sending, sent, failed, bounced

### RLS Helper Functions (SECURITY DEFINER)

- `get_my_community_id()` - returns current user's community_id
- `is_board_member()` - returns true if system_role in (board, manager, super_admin)
- `get_my_unit_id()` - returns current user's unit_id
- `link_auth_user_to_member()` - trigger on auth.users that auto-links members by email
- `cast_vote()`, `open_ballot()`, `close_and_tally_ballot()`, `get_ballot_quorum_status()` - voting RPCs
- `create_board_notifications()`, `create_member_notifications()` - notification RPCs

### RLS Pattern

- Members SELECT rows where `community_id = get_my_community_id()`
- Members see their own unit's data for payments/invoices/reservations
- Board can do ALL operations on community data
- Admin client (`createAdminClient()`) bypasses RLS using service role key

## Auth Flow

### Pre-provisioned Members (CSV import by board)

1. Board imports members via onboarding wizard CSV upload
2. Members created in `members` table with `is_approved: true`, `user_id: null`
3. Board runs "Pre-create Auth Accounts" (`/api/stripe/pre-create-accounts`)
4. Supabase Auth accounts created, DB trigger `link_auth_user_to_member` auto-sets user_id
5. Board sends welcome emails via `sendWelcomeInvites` server action
6. Member receives email, clicks link to set password

### Smart Login (first-timer detection)

After `signInWithPassword` fails with "Invalid login credentials":
1. Calls `checkMemberExists(email)` server action
2. If member exists: shows "Set up your password" state with "Send password setup link" button
3. Calls `sendPasswordSetupLink(email)` which generates a Supabase recovery link
4. Member clicks email link, lands on `/reset-password` which detects the session and shows "Set new password" form

### Password Reset

- `/reset-password` has two modes: if session exists (from recovery callback), show "set new password" form; otherwise show "request reset" form
- After setting password, redirects to `/{slug}/dashboard` (looks up community from member record)

### OAuth Callback (`/auth/callback`)

- Exchanges `?code=` for session
- `?type=recovery` redirects to `/reset-password`
- Otherwise looks up member's community slug, redirects to `/{slug}`

### Middleware

- Public routes: `/`, `/login`, `/signup`, `/reset-password`, `/privacy`, `/terms`, `/cookies`, `/security`, `/status`, `/auth/*`
- Community landing pages (`/{slug}` single-segment) are public
- Dev bypass: `NODE_ENV=development` + cookie `dev-bypass=1` skips auth
- All other routes redirect to `/login?redirect={pathname}`

## Stripe Integration

### Two Modes

**Connect mode** (`stripe_accounts.mode = 'connect'`):
- Community has its own Express connected Stripe account
- Payments use `transfer_data.destination` + `application_fee_amount`
- Requires `stripe_account_id`

**Direct mode** (`stripe_accounts.mode = 'direct'`):
- Community uses their own Stripe API key directly
- Subscriptions billed directly against saved payment methods
- `stripe_account_id` is null
- Used for Westwood 6 migration from Membershine

### API Version

`2026-02-25.clover` - Important: In this version, Stripe Invoice `subscription` field moved to `parent.subscription_details.subscription`

### Webhook Events Handled

- `checkout.session.completed` - one-off invoice payment via Checkout
- `invoice.paid` - subscription auto-payment (matches to DuesIQ invoice by unit's subscription)
- `invoice.payment_failed` - marks invoice overdue, sets unit status to past_due
- `customer.subscription.updated` - syncs subscription status to unit
- `customer.subscription.deleted` - clears subscription fields on unit
- `charge.refunded` - logged
- `charge.dispute.created` - logged

### Overpayment Handling

When `amount_paid > invoice.amount`, excess is credited to `unit_wallets` and logged as a `wallet_transaction` with type `overpayment`.

### Migration Wizard (board-facing)

5-step wizard in settings (`components/settings/stripe-migration-section.tsx`):
1. Verify Stripe Connection
2. Sync Customers (match by email, handles 260+)
3. Create Subscriptions (batches of 10, uses saved payment methods)
4. Pre-create Auth Accounts (batches of 20)
5. Summary/Complete

## Email System

- **Provider:** Resend (`RESEND_API_KEY`)
- **From:** `notifications@duesiq.com` (configurable per community)
- **Queue:** Emails inserted into `email_queue` table, cron processes every 5 min (up to 10 per batch, max 3 attempts)
- **Templates:** React Email components in `lib/email/templates/`
- **Unsubscribe:** HMAC-SHA256 signed tokens, per-member per-category opt-out via `email_preferences`
- **Cron endpoint:** `/api/email/process-queue` protected by `CRON_SECRET`

### Templates

- `announcement.tsx` - announcement with priority badge
- `payment-confirmation.tsx` - payment receipt
- `payment-reminder.tsx` - upcoming due reminder
- `welcome-invite.tsx` - onboarding invite with signup URL
- `weekly-digest.tsx` - weekly summary
- `layout.tsx` - base email layout wrapper

## CommunityProvider Context

Available via `useCommunity()` hook:
- `community`, `member`, `unit`, `householdMembers`
- `isBoard`, `isManager`, `isSuperAdmin` (respects viewMode toggle)
- `actualIsBoard` (always true if board, ignores viewMode)
- `isHeadOfHousehold` (owner role + no parent)
- `viewMode: 'admin' | 'personal'` (persisted in localStorage as `duesiq_view_mode`)
- `setViewMode(mode)`
- `visibleCards: DashboardCardId[]` (from community theme or defaults by role)

Board detection: `system_role IN ('board', 'manager', 'super_admin')`

## Design System

### Colors

- `primary` - Slate/Ink scale (50-950). Main: `primary-700: #1D2024`, `primary-800: #121416`
- `secondary` - Peach/Amber scale (50-950). CTA: `secondary-400: #F4AE90`
- `canvas` - dark: `#000000`, light: `#F3EEE8`
- `surface` - dark: `#101010`, dark-2: `#1F1F1F`, light: `#FFFFFF`, light-2: `#FAFAFA`
- `stroke` - dark: `rgba(255,255,255,0.06)`, light: `rgba(17,24,39,0.08)`
- `text-primary` - dark: `rgba(255,255,255,0.92)`, light: `rgba(17,24,39,0.92)`
- `text-secondary` - dark: `rgba(255,255,255,0.62)`, light: `rgba(17,24,39,0.64)`
- `text-muted` - dark: `rgba(255,255,255,0.40)`, light: `rgba(17,24,39,0.44)`
- `mint: #7BD6AA` (accent), `warning.dot: #FF5A5A` (danger/warning)

### Border Radius

- `rounded-app-frame: 28px`, `rounded-panel: 22px`, `rounded-inner-card: 18px`, `rounded-pill: 999px`

### Spacing

- `app-padding: 24px`, `grid-gap: 18px`, `card-padding: 18px`
- `sidebar: 72px`, `topbar: 64px`

### Typography

- `text-metric-xl: 28px/32px bold`
- `text-page-title: 22px/28px semibold`
- `text-section-title: 14px/20px semibold`
- `text-card-title: 14px/20px semibold`
- `text-body: 13px/18px medium`
- `text-label: 12px/16px medium`
- `text-meta: 11px/14px medium`

### Dark Mode

Uses `next-themes` with `darkMode: ['class']` in Tailwind config. Pattern: `className="bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark"`

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_CONNECT_RETURN_URL=https://duesiq.com

# Email (Resend)
RESEND_API_KEY=re_xxx
EMAIL_FROM_ADDRESS=notifications@duesiq.com
UNSUBSCRIBE_SECRET=random-secret-for-hmac

# Cron
CRON_SECRET=random-secret-for-cron

# App
NEXT_PUBLIC_APP_URL=https://duesiq.com
```

## Migrations

20 migration files in `supabase/migrations/`, numbered chronologically. Run in order. Key migrations:

1. `20260101000001_initial_schema.sql` - Core tables, RLS, helper functions, auth triggers, storage bucket
2. `20260303000006_amenity_both_booking_type.sql` through `000009` - Amenity enhancements
3. `20260303000010_notifications.sql` - Notification system
4. `20260303000011_voting.sql` - Full voting system with secret ballots, proxies, quorum tracking
5. `20260303000012_bulletin_board.sql` - Bulletin board with comments
6. `20260304000001_stripe_connect.sql` - Stripe Connect integration
7. `20260304000002_email_system.sql` - Email queue, preferences, logs
8. `20260304000003_stripe_direct.sql` - Direct Stripe mode (customer sync, subscriptions)

## Code Patterns

### Supabase Client Usage

```typescript
// Browser (client components)
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();

// Server (server components, route handlers)
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();

// Admin (bypasses RLS - for server actions, API routes, webhooks)
import { createAdminClient } from '@/lib/supabase/admin';
const supabase = createAdminClient();
```

### Server Actions

Defined in `lib/actions/` with `'use server'` directive. Used for operations that need admin client or server-side logic called from client components.

### Component Imports (shadcn/ui)

```typescript
import { Button } from '@/components/shared/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/shared/ui/dialog';
```

### Toast Notifications

```typescript
import { toast } from 'sonner';
toast.success('Saved successfully');
toast.error('Something went wrong');
```

### Board-Only UI Pattern

```tsx
const { isBoard } = useCommunity();
{isBoard && <AdminOnlyComponent />}
```

### Dev Bypass

In development, `[slug]/layout.tsx` injects a mock super_admin member when no real Supabase connection exists, so all features are accessible without auth setup.

## Security Guidelines

DuesIQ is a multi-tenant app handling financial data. Every feature must be built with security in mind. Follow these rules strictly:

### Authentication & Authorization

- **Every API route** (`app/api/**/route.ts`) that modifies data or returns sensitive data MUST verify authentication using `createClient()` + `getUser()` before doing anything else. Never use `createAdminClient()` without first authenticating the caller.
- **Every server action** (`'use server'` functions in `lib/actions/`) that performs privileged operations MUST verify the caller is authenticated and authorized (e.g., board member check) before executing. Server actions are callable from any client code.
- **Board-only operations** must check `system_role IN ('board', 'manager', 'super_admin')` on the server side, not just hide UI elements.
- **Cron/webhook endpoints** must verify their respective secrets (`CRON_SECRET`, `STRIPE_WEBHOOK_SECRET`) before processing.

### Multi-Tenant Data Isolation

- All database queries MUST be scoped to the user's `community_id`. Never allow cross-community data access.
- Storage bucket policies MUST scope access by community (e.g., file paths prefixed with `community_id`).
- RLS policies are the last line of defense but should not be the only line. Always add application-level checks too.

### Information Leakage

- Never reveal whether an email address exists in the system. Password reset flows should always return success regardless of whether the email was found.
- Error messages sent to clients should be generic. Log detailed errors server-side only.
- Use timing-safe comparison (`crypto.timingSafeEqual`) for any token/secret verification.

### Rate Limiting

- Public endpoints (no auth required) MUST have rate limiting using `lib/rate-limit.ts`.
- Password reset and email-sending endpoints should be rate-limited per email address.

### Input Validation

- Sanitize filenames before using in storage paths (strip `../` and special characters).
- Enforce file size limits on all upload endpoints.
- Validate and sanitize all user input on the server side, even if client-side validation exists.

### Environment & Secrets

- Never fall back to weak default values for secrets. If a required secret is missing, throw an error.
- The dev bypass in middleware must be protected against accidental activation in production (check `VERCEL_ENV`).

### Webhooks & Idempotency

- Webhook handlers must be idempotent. Check for duplicate events before processing (e.g., check if `stripe_session_id` already exists).
- Always verify webhook signatures before processing payloads.

### Reference Pattern for Authenticated API Routes

```typescript
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// 1. Authenticate first
const userClient = await createClient();
const { data: { user }, error: authError } = await userClient.auth.getUser();
if (authError || !user) {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

// 2. Then use admin client for authorized operations
const supabase = createAdminClient();

// 3. Verify community membership / role
const { data: member } = await supabase
  .from('members')
  .select('system_role')
  .eq('user_id', user.id)
  .eq('community_id', communityId)
  .single();
```

## Writing Style

- NEVER use em dashes or en dashes in any customer-facing material. Use commas, periods, or rewrite the sentence instead.
- Avoid AI writing tells: overly polished phrasing, excessive hedging, bullet-heavy formatting in emails.
- Keep communications sounding natural and human.

## Git

- Add and commit automatically whenever an entire task is finished
- Use descriptive commit messages that capture the full scope of changes

## Code Quality

Before completing any task:
- Check for TypeScript errors (`npm run build` or IDE diagnostics)
- Fix any linting or type errors before considering the task complete
- This is critical and must never be skipped

## Pending Deployment Steps

### Plaid Security Attestation (due 09/06/2026)

All 13 Plaid attestation requirements have been implemented. Before deploying:

1. **Run the audit_log migration** against Supabase: `supabase/migrations/20260305000004_audit_log.sql`
2. **Push to GitHub** to activate Dependabot and the security scanning workflow (`.github/workflows/security.yml`)
3. **Enable MFA in Supabase Dashboard**: Go to Authentication > Multi-Factor Authentication and enable TOTP

Key files for reference:
- Policy docs: `SECURITY.md`, `policies/access-control.md`, `policies/data-retention.md`, `policies/eol-management.md`
- MFA: `components/settings/mfa-settings.tsx`, login MFA challenge in `app/(auth)/login/page.tsx`
- Audit logging: `lib/audit.ts`, `components/settings/audit-log-viewer.tsx`
- De-provisioning: `lib/actions/deprovisioning-actions.ts`
- Data retention cron: `app/api/cron/data-retention/route.ts` (monthly, configured in `vercel.json`)
