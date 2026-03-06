import Footer from '@/components/shared/Footer';
import Header from '@/components/shared/Header';

export default function Security() {
  return (
    <div className="flex flex-col w-full min-h-screen items-center justify-between fancy-overlay">
      <Header />

      <div className="w-full flex flex-col items-center my-12">
        <section className="w-full p-6 container-narrow">
          <h1 className="text-4xl font-semibold leading-tight md:leading-tight max-w-xs sm:max-w-none md:text-6xl fancy-heading">
            Security at DuesIQ
          </h1>

          <p className="mt-6 md:text-xl">
            DuesIQ is built with security at every layer. From encrypted data
            storage to multi-factor authentication, we protect your community's
            information with the same standards used by financial institutions.
          </p>

          <div className="mt-12 space-y-10">
            <div>
              <h2 className="text-2xl font-semibold mb-3">
                Zero Trust Architecture
              </h2>
              <p className="text-lg opacity-80">
                Every request is validated independently. Our middleware verifies
                your session on each page load, and PostgreSQL Row-Level Security
                policies enforce data isolation on every database query. No
                request is implicitly trusted.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">
                Multi-Factor Authentication
              </h2>
              <p className="text-lg opacity-80">
                TOTP-based two-factor authentication is available for all users
                and required for board members and administrators. This ensures
                that even if a password is compromised, your account remains
                protected.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">
                Encryption and Token Security
              </h2>
              <p className="text-lg opacity-80">
                All data is encrypted at rest using AES-256 and in transit via
                TLS 1.2+. Sessions use JWT tokens stored in httpOnly cookies.
                Webhook signatures are verified using HMAC-SHA256 to prevent
                tampering.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">
                Access Control and Audit Logging
              </h2>
              <p className="text-lg opacity-80">
                Role-based access control ensures members only see their own
                data. Board members have administrative access scoped to their
                community. All security events are logged in an audit trail for
                compliance and review.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">
                Vulnerability Management
              </h2>
              <p className="text-lg opacity-80">
                Automated dependency scanning runs on every code change.
                Critical vulnerabilities are patched within 48 hours. Our
                security policies, including our patching SLA and data retention
                schedules, are documented and reviewed annually.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">
                Responsible Disclosure
              </h2>
              <p className="text-lg opacity-80">
                If you discover a security vulnerability, please report it to{' '}
                <a
                  href="mailto:security@duesiq.com"
                  className="underline hover:opacity-70 transition-opacity"
                >
                  security@duesiq.com
                </a>
                . We will acknowledge receipt within 48 hours and provide a fix
                timeline within 7 days.
              </p>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
