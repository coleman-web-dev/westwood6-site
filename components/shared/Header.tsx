import { LandingHeader, LandingHeaderMenuItem } from '@/components/landing';
import ThemeSwitch from '@/components/shared/ThemeSwitch';
import Image from 'next/image';

export const Header = ({ className }: { className?: string }) => {
  return (
    <LandingHeader
      className={className}
      fixed
      withBackground
      variant="primary"
      logoComponent={
        <div className="flex items-center text-primary-500 dark:text-primary-500 gap-3">
          <Image
            src="/static/images/logo.png"
            alt="Mevolut logo"
            width={200}
            height={200}
            className="h-8 w-8 rounded-full"
          />
          <span className="font-bold text-lg">Mevolut</span>
        </div>
      }
    >
      <LandingHeaderMenuItem href="/features">
        {'Features'}
      </LandingHeaderMenuItem>
      <LandingHeaderMenuItem href="/pricing">{'Pricing'}</LandingHeaderMenuItem>
      <LandingHeaderMenuItem href="/security">
        {'Security'}
      </LandingHeaderMenuItem>
      <LandingHeaderMenuItem href="/help">{'Help'}</LandingHeaderMenuItem>
      <LandingHeaderMenuItem type="button" href="/dashboard">
        Dashboard
      </LandingHeaderMenuItem>

      <ThemeSwitch />
    </LandingHeader>
  );
};

export default Header;
