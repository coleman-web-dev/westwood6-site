import { LandingHeader, LandingHeaderMenuItem } from '@/components/landing';
import ThemeSwitch from '@/components/shared/ThemeSwitch';
import Link from 'next/link';

export const Header = ({ className }: { className?: string }) => {
  return (
    <LandingHeader
      className={className}
      fixed
      withBackground
      variant="primary"
      logoComponent={
        <Link
          href="/"
          className="flex items-center text-primary-900 dark:text-primary-100 gap-2"
        >
          <span className="font-bold text-lg tracking-tight">DuesIQ</span>
        </Link>
      }
    >
      <LandingHeaderMenuItem href="#features">
        Features
      </LandingHeaderMenuItem>
      <LandingHeaderMenuItem href="#pricing">Pricing</LandingHeaderMenuItem>
      <LandingHeaderMenuItem href="#faq">FAQ</LandingHeaderMenuItem>
      <LandingHeaderMenuItem href="/login">Log In</LandingHeaderMenuItem>
      <LandingHeaderMenuItem type="button" href="#demo">
        Request a Demo
      </LandingHeaderMenuItem>

      <ThemeSwitch />
    </LandingHeader>
  );
};

export default Header;
