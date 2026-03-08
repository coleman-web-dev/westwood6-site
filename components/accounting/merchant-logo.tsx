'use client';

// Muted tones that blend with the DuesIQ palette
const COLORS = [
  'bg-slate-500', 'bg-stone-500', 'bg-zinc-500', 'bg-neutral-500',
  'bg-slate-600', 'bg-stone-600', 'bg-zinc-600', 'bg-neutral-600',
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

interface MerchantLogoProps {
  name: string;
  logoUrl: string | null;
  size?: number;
}

export function MerchantLogo({ name, logoUrl, size = 28 }: MerchantLogoProps) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        className="rounded-md object-cover shrink-0"
        style={{ width: size, height: size }}
        onError={(e) => {
          // Fallback to initials on load error
          (e.target as HTMLImageElement).style.display = 'none';
          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
        }}
      />
    );
  }

  const initial = (name || '?').charAt(0).toUpperCase();
  const color = COLORS[hashName(name) % COLORS.length];

  return (
    <div
      className={`${color} rounded-md flex items-center justify-center text-white font-semibold shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {initial}
    </div>
  );
}
