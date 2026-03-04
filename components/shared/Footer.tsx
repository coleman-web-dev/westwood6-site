import {
  LandingFooter,
  LandingFooterColumn,
  LandingFooterLink,
} from '@/components/landing';

export const Footer = ({ className }: { className?: string }) => {
  return (
    <LandingFooter
      className={className}
      description="Modern HOA management for self-managed communities"
      withBackground
      withBackgroundGlow={false}
      variant="primary"
      withBackgroundGradient
      footnote={
        <span>&copy; {new Date().getFullYear()} DuesIQ. All rights reserved.</span>
      }
      logoComponent={
        <div className="flex items-center text-primary-900 dark:text-primary-100 gap-2">
          <span className="font-bold text-lg tracking-tight">DuesIQ</span>
        </div>
      }
    >
      <LandingFooterColumn title="Product">
        <LandingFooterLink href="#features">Features</LandingFooterLink>
        <LandingFooterLink href="#pricing">Pricing</LandingFooterLink>
        <LandingFooterLink href="#faq">FAQ</LandingFooterLink>
        <LandingFooterLink href="#demo">Request a Demo</LandingFooterLink>
      </LandingFooterColumn>
      <LandingFooterColumn title="Platform">
        <LandingFooterLink href="/login">Log In</LandingFooterLink>
        <LandingFooterLink href="/signup">Sign Up</LandingFooterLink>
        <LandingFooterLink href="/status">System Status</LandingFooterLink>
      </LandingFooterColumn>
      <LandingFooterColumn title="Legal">
        <LandingFooterLink href="/terms">Terms of Service</LandingFooterLink>
        <LandingFooterLink href="/privacy">Privacy Policy</LandingFooterLink>
        <LandingFooterLink href="/cookies">Cookie Policy</LandingFooterLink>
        <LandingFooterLink href="/security">Security</LandingFooterLink>
      </LandingFooterColumn>
    </LandingFooter>
  );
};

export default Footer;
