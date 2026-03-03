'use client';

import { useState } from 'react';
import { Button } from '@/components/shared/ui/button';
import { useCommunity } from '@/lib/providers/community-provider';
import { CreditCard } from 'lucide-react';
import { toast } from 'sonner';

export function ManagePaymentMethodButton() {
  const { community } = useCommunity();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId: community.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || 'Unable to open payment settings');
        return;
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={loading} size="sm">
      <CreditCard className="h-4 w-4 mr-2" />
      {loading ? 'Loading...' : 'Manage Payment Method'}
    </Button>
  );
}
