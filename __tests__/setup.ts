// Global test setup for Vitest
// Force UTC timezone for deterministic date calculations
process.env.TZ = 'UTC';

// Mock environment variables that would normally come from .env
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_xxx';
process.env.CRON_SECRET = 'test-cron-secret';
process.env.RESEND_API_KEY = 're_test_xxx';
process.env.EMAIL_FROM_ADDRESS = 'test@duesiq.com';
process.env.UNSUBSCRIBE_SECRET = 'test-unsubscribe-secret';
process.env.NEXT_PUBLIC_APP_URL = 'https://test.duesiq.com';
