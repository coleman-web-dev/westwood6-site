# End-of-Life Software Management Policy

**Effective Date:** March 5, 2026
**Last Reviewed:** March 5, 2026
**Review Cadence:** Annually

---

## 1. Current Technology Stack

| Technology | Version | EOL/Support Status |
|---|---|---|
| Node.js | 22.x (LTS) | Active LTS through April 2027 |
| Next.js | 15.x | Current major release |
| React | 19.x | Current major release |
| TypeScript | 5.9.x | Current release |
| Supabase JS | 2.x | Current major release |
| Stripe SDK | 20.x | Current major release |
| Plaid SDK | 41.x | Current major release |
| Resend SDK | 6.x | Current major release |

**Last stack audit:** March 5, 2026

## 2. Monitoring

### Automated Dependency Monitoring
- **Dependabot** is configured to check npm dependencies weekly and open pull requests for updates
- **GitHub Security Alerts** notify maintainers of known vulnerabilities in dependencies
- **`npm audit`** runs automatically on every push and pull request via GitHub Actions, plus a weekly scheduled scan

### Manual Reviews
- The technology stack table (section 1) is reviewed and updated during the annual policy review
- Node.js release schedule is checked quarterly against the official release calendar

## 3. Upgrade Policy

### Framework and Runtime Upgrades

| Category | Timeline |
|---|---|
| **Security patches** (any severity) | Per vulnerability patching SLA in SECURITY.md |
| **Minor/patch releases** | Evaluated and applied within 14 days via Dependabot PRs |
| **Major version releases** | Evaluated within 30 days of release. Upgrade planned if current version will reach EOL within 6 months. |
| **EOL software** | Must be upgraded or replaced within 60 days of the EOL date |

### Node.js Specific Policy
- DuesIQ always runs on an Active LTS or Current release of Node.js
- Upgrade to the next LTS version is planned at least 3 months before the current LTS reaches EOL
- The `engines` field in `package.json` enforces the minimum Node.js version

## 4. Responsibility

- **Lead developer/CTO:** Responsible for monitoring EOL dates, planning upgrades, and executing migrations
- **Dependabot:** Automated monitoring and PR creation for dependency updates
- **CI/CD pipeline:** Automated build and security scan verification before any update is deployed

## 5. Risk Assessment

When a dependency approaches EOL:
1. Assess the risk of continued use (known vulnerabilities, compatibility issues)
2. Identify the upgrade path (direct upgrade, migration to alternative, removal)
3. Test the upgrade in a staging environment
4. Deploy the upgrade within the timeline specified in section 3
5. Document the upgrade in the commit history
