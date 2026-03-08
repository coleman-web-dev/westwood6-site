import {
  Wrench,
  TreePine,
  Shield,
  Zap,
  Building2,
  Scale,
  FileText,
  CreditCard,
  Landmark,
  TrendingUp,
  Banknote,
  CircleDot,
  type LucideIcon,
} from 'lucide-react';

const CODE_TO_ICON: Record<string, LucideIcon> = {
  '5000': Wrench,
  '5100': TreePine,
  '5200': Shield,
  '5300': Zap,
  '5400': Building2,
  '5500': Scale,
  '5600': FileText,
  '5700': CreditCard,
  '5800': FileText,
  '5900': Landmark,
};

export function getCategoryIcon(accountCode: string | null | undefined): LucideIcon {
  if (!accountCode) return CircleDot;

  // Exact match first
  if (CODE_TO_ICON[accountCode]) return CODE_TO_ICON[accountCode];

  // Prefix match: revenue (4xxx), asset (1xxx)
  if (accountCode.startsWith('4')) return TrendingUp;
  if (accountCode.startsWith('1')) return Banknote;

  return CircleDot;
}

interface CategoryIconProps {
  accountCode: string | null | undefined;
  className?: string;
}

export function CategoryIcon({ accountCode, className = 'h-3.5 w-3.5' }: CategoryIconProps) {
  const Icon = getCategoryIcon(accountCode);
  return <Icon className={className} />;
}
