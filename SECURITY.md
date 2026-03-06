# DuesIQ Information Security Policy

**Effective Date:** March 5, 2026
**Last Reviewed:** March 5, 2026
**Review Cadence:** Annually (next review: March 2027)
**Owner:** Coleman Web Development

---

## 1. Scope

This policy applies to DuesIQ, a multi-tenant SaaS platform for HOA (Homeowners Association) management. It covers all systems, data, and processes involved in operating the platform, including:

- Web application (Next.js on Vercel)
- Database (Supabase/PostgreSQL)
- Payment processing (Stripe)
- Banking data integration (Plaid)
- Email delivery (Resend)
- Source code and CI/CD infrastructure (GitHub)

## 2. Data Classification

| Classification | Examples | Handling |
|---|---|---|
| **Confidential** | Plaid access tokens, Stripe API keys, database credentials, webhook secrets | Environment variables only. Never stored in source code. Access restricted to service-role operations. |
| **Sensitive PII** | Email addresses, phone numbers, home addresses, payment history | Stored in Supabase with row-level security. Encrypted at rest (AES-256). Tenant-isolated. |
| **Financial** | Invoice amounts, payment records, wallet balances, bank transaction data | Retained for 7 years per financial recordkeeping requirements. Access restricted to unit owners and board members. |
| **Internal** | Audit logs, email queue, system configuration | Retained per data retention policy. Board-level access for audit logs. |
| **Public** | Community landing pages, marketing content | No access restrictions. |

## 3. Zero Trust Architecture

DuesIQ implements a zero-trust access model where no request is implicitly trusted. Every operation is validated at multiple layers:

### Layer 1: Edge Middleware
Every HTTP request passes through Next.js middleware (`middleware.ts`), which:
- Validates the user's session by calling `supabase.auth.getUser()` on every request
- Redirects unauthenticated users to the login page
- Maintains a strict allowlist of public routes

### Layer 2: Row-Level Security (RLS)
Every database query is enforced by PostgreSQL RLS policies:
- `get_my_community_id()` isolates all data by tenant, preventing cross-community access
- `is_board_member()` gates administrative operations
- `get_my_unit_id()` restricts financial data to the owning household
- No client-side trust: RLS executes server-side on every query, regardless of application logic

### Layer 3: API Route Authentication
Server-side API routes independently verify user identity and authorization:
- Stripe webhook routes verify event signatures using `stripe.webhooks.constructEvent()`
- Cron endpoints verify bearer tokens against `CRON_SECRET`
- Plaid API routes validate user sessions before issuing link tokens or exchanging public tokens

### Layer 4: Service Role Isolation
Administrative operations (bypassing RLS) are restricted to:
- Server actions using `createAdminClient()` with the service role key
- API route handlers that require cross-tenant operations
- The service role key is never exposed to the browser client

## 4. Secure Token and Certificate Management

### Session Tokens
- Managed by Supabase Auth using JWTs
- Stored in httpOnly, secure, SameSite cookies via `@supabase/ssr`
- Automatically refreshed on every request through middleware
- Short-lived access tokens with longer-lived refresh tokens

### HMAC Tokens
- Email unsubscribe links are signed using HMAC-SHA256 with a dedicated secret (`UNSUBSCRIBE_SECRET`)
- Tokens are verified server-side before processing any unsubscribe request

### Webhook Signatures
- Stripe webhook events are verified using `stripe.webhooks.constructEvent()` with the webhook signing secret
- Invalid signatures are rejected with a 400 response

### API Keys and Secrets
- All secrets stored as environment variables in Vercel (encrypted at rest)
- Secrets are never committed to source code
- `.env` files are in `.gitignore`

## 5. Multi-Factor Authentication (MFA)

- TOTP-based MFA is available for all users via the Security tab in Settings
- Board members, managers, and super admins are required to enable MFA
- MFA verification is enforced during login when a TOTP factor is enrolled
- MFA is implemented using Supabase Auth's native TOTP support

## 6. Vulnerability Management and Patching SLA

### Automated Scanning
- **Dependency scanning:** Dependabot monitors npm dependencies weekly and opens pull requests for security updates
- **CI security checks:** GitHub Actions runs `npm audit` on every push and pull request, plus a weekly scheduled scan
- **Build verification:** TypeScript compilation and ESLint run on every PR to catch code quality issues

### Patching Timeline

| Severity | CVSS Score | Response Time |
|---|---|---|
| Critical | 9.0 - 10.0 | Patch within 48 hours |
| High | 7.0 - 8.9 | Patch within 7 days |
| Medium | 4.0 - 6.9 | Patch within 30 days |
| Low | 0.1 - 3.9 | Patch in next scheduled release |

### Process
1. Dependabot or `npm audit` identifies a vulnerability
2. The severity is assessed using the CVSS score from the advisory
3. A fix is developed, tested, and deployed within the SLA window
4. The fix is documented in the commit history and release notes

## 7. Incident Response

### Reporting
Security incidents should be reported to: **security@duesiq.com**

### Response Process
1. **Identification:** Detect and confirm the incident via monitoring, user reports, or automated alerts
2. **Containment:** Isolate affected systems. Revoke compromised credentials. Disable affected accounts if necessary.
3. **Investigation:** Determine scope, root cause, and affected data using audit logs
4. **Remediation:** Apply fixes, rotate credentials, and restore normal operations
5. **Notification:** Notify affected users within 72 hours of confirmed data breach
6. **Post-mortem:** Document lessons learned and update security controls

## 8. Access Control

See [Access Control Policy](./policies/access-control.md) for the full access control policy including role hierarchy, RLS enforcement, and access review procedures.

## 9. Data Retention

See [Data Retention Policy](./policies/data-retention.md) for retention periods, automated cleanup procedures, and data subject request handling.

## 10. End-of-Life Software Management

See [EOL Management Policy](./policies/eol-management.md) for version tracking, upgrade timelines, and monitoring procedures.

## 11. Responsible Disclosure

If you discover a security vulnerability in DuesIQ, please report it responsibly:
- Email: security@duesiq.com
- Do not publicly disclose the vulnerability until a fix has been deployed
- We will acknowledge receipt within 48 hours and provide an estimated fix timeline within 7 days
