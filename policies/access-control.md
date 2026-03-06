# Access Control Policy

**Effective Date:** March 5, 2026
**Last Reviewed:** March 5, 2026
**Review Cadence:** Annually

---

## 1. Identity Provider

DuesIQ uses **Supabase Auth** as its centralized identity and access management system. All user authentication flows through a single identity provider:

- User accounts are stored in `auth.users` (managed by Supabase)
- Application-level member records in the `members` table are linked via `user_id` foreign key
- A database trigger (`link_auth_user_to_member`) automatically links auth accounts to member records by email on signup
- No separate identity systems or local password stores exist outside of Supabase Auth

## 2. Authentication Methods

- **Password-based authentication:** Primary method using `signInWithPassword()`
- **Multi-factor authentication (TOTP):** Available for all users. Required for board, manager, and super_admin roles. Uses authenticator apps (Google Authenticator, Authy, etc.)
- **Password recovery:** Secure recovery links generated via Supabase Auth with PKCE flow

## 3. Role Hierarchy

### System Roles (access tiers)

| Role | Access Level | Description |
|---|---|---|
| `super_admin` | Full platform access | Platform administrators with cross-community visibility |
| `manager` | Full community access | Community managers with all administrative functions |
| `board` | Administrative access | Board members who manage community operations |
| `resident` | Personal access | Homeowners and tenants with access to their own data |

### Member Roles (household classification)

| Role | Description |
|---|---|
| `owner` | Property owner, head of household |
| `member` | Additional household member |
| `tenant` | Renter in the unit |
| `minor` | Minor child in household (restricted access) |

## 4. Authorization Enforcement

### Row-Level Security (RLS)

All tables containing user data have PostgreSQL Row-Level Security policies enabled. Key enforcement functions:

- **`get_my_community_id()`**: Returns the authenticated user's community ID. All SELECT, INSERT, UPDATE, and DELETE policies include `community_id = get_my_community_id()` to enforce tenant isolation.
- **`is_board_member()`**: Returns true if the authenticated user's `system_role` is `board`, `manager`, or `super_admin`. Administrative operations require this check.
- **`get_my_unit_id()`**: Returns the authenticated user's unit ID. Financial data (invoices, payments, wallet) is restricted to the owning household.

### Examples

- **Invoices:** Residents see only their unit's invoices. Board members see all invoices in their community.
- **Members:** Residents see basic directory information. Board members can manage all members.
- **Payments:** Restricted to the unit that made the payment, plus board access.
- **Audit logs:** Board members only. No resident access.

### Service Role Usage

The `createAdminClient()` (service role) bypasses RLS and is used exclusively in:
- Server actions (`lib/actions/`)
- API route handlers (`app/api/`)
- Webhook processors
- Cron jobs

The service role key is never exposed to the browser.

## 5. Principle of Least Privilege

- New members start with `resident` system role and see only their own household data
- Board privileges are assigned by existing board members or during onboarding
- The dev-bypass cookie (`dev-bypass=1`) is only functional when `NODE_ENV=development` and has no effect in production
- Public routes are explicitly allowlisted in middleware; all other routes require authentication

## 6. Account Provisioning

1. Board imports members via CSV during onboarding
2. Auth accounts are pre-created using the Supabase admin API
3. Database trigger auto-links the auth account to the member record
4. Welcome emails are sent with password setup links
5. Members set their password and log in

Self-signup creates a `signup_request` that requires board approval before the account becomes active (`is_approved = true`).

## 7. Account De-provisioning

When a member is removed (move-out):
1. The member record is unlinked from their unit (`unit_id = null`)
2. If the member has no other active memberships, their auth account is disabled (banned)
3. All active sessions are revoked immediately
4. The de-provisioning action is logged in the audit trail

## 8. Multi-Factor Authentication Requirements

| Role | MFA Requirement |
|---|---|
| `super_admin` | Required |
| `manager` | Required |
| `board` | Required |
| `resident` (with Plaid access) | Required |
| `resident` (general) | Available, opt-in |

Board members who have not enrolled MFA are prompted to do so and cannot access administrative functions until enrollment is complete.

## 9. Periodic Access Reviews

**Frequency:** Quarterly (January, April, July, October)

**Process:**
1. Board reviews the member directory for accuracy (active members, correct roles, correct unit assignments)
2. Board reviews the audit log for unusual access patterns (failed logins, role changes, de-provisioning events)
3. Inactive accounts (no login in 180+ days) are flagged for review
4. Findings are documented and any corrective actions are taken immediately

**Responsibility:** Community board members, with platform-level oversight by super admins.
