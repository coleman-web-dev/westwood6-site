# Data Retention and Deletion Policy

**Effective Date:** March 5, 2026
**Last Reviewed:** March 5, 2026
**Review Cadence:** Annually

---

## 1. Retention Periods

| Data Category | Retention Period | Justification |
|---|---|---|
| **Financial records** (invoices, payments, wallet transactions) | 7 years | Financial recordkeeping requirements |
| **Audit logs** | 2 years | Security compliance and investigation needs |
| **Email logs** | 1 year | Delivery troubleshooting and compliance |
| **Email queue** (sent items) | 90 days | Operational reference |
| **Read notifications** | 90 days | User experience (unread notifications retained indefinitely) |
| **Denied signup requests** | 90 days | Operational reference |
| **Active member records** | Duration of membership | Required for system operation |
| **De-provisioned member records** | 2 years after de-provisioning | Audit trail and potential re-activation |
| **Community data** | Duration of community subscription | Required for system operation |
| **Plaid access tokens** | Until bank connection is disconnected | Required for transaction sync |
| **Plaid transaction data** | 7 years (as financial records) | Financial recordkeeping requirements |

## 2. Automated Cleanup

A monthly cron job (`/api/cron/data-retention`) automatically deletes data that has exceeded its retention period:

- **Email queue entries** with status `sent`: deleted after 90 days
- **Email logs**: deleted after 1 year
- **Read notifications**: deleted after 90 days
- **Denied signup requests**: deleted after 90 days
- **Audit logs**: deleted after 2 years

The cron runs on the 1st of each month at 3:00 AM UTC. It is protected by the `CRON_SECRET` bearer token.

Financial records (invoices, payments, wallet transactions) are NOT automatically deleted and require manual review before removal.

## 3. Data Deletion on Disconnect

### Plaid Bank Connections
When a user disconnects their bank account via `/api/plaid/disconnect`:
- The Plaid access token is deleted from the database
- Plaid's Item access is revoked via the Plaid API
- Previously synced transaction data is retained per the financial records retention period (7 years)

### Community Deletion
When a community is deleted:
- All related data is cascade-deleted (units, members, invoices, payments, announcements, amenities, reservations, ballots, documents, events, notifications, audit logs, email records)
- This is enforced by `ON DELETE CASCADE` foreign key constraints in the database schema

## 4. Member De-provisioning

When a member is removed from a unit (move-out):
- The member record is unlinked from the unit (`unit_id` set to null)
- The auth account is disabled if no other active memberships exist
- All active sessions are revoked
- The member record itself is retained for the de-provisioned retention period (2 years)
- Historical financial records (invoices, payments) are retained per the financial records period (7 years)

## 5. Data Subject Requests

### Right to Access
Members can view their personal data through the application:
- Profile information in Settings
- Payment history in the Payments page
- Communication history via email preferences

Board members can export member data on request.

### Right to Deletion
Upon written request to the community board:
1. The board verifies the requestor's identity
2. The member is de-provisioned (see section 4)
3. Non-financial personal data is anonymized or deleted
4. Financial records are retained for the 7-year regulatory period but the member's PII is anonymized (name replaced with "Deleted User", email cleared)
5. The requestor is notified upon completion

### Right to Correction
Members can update their personal information directly through the Settings page (name, email, phone).
