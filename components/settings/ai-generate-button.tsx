'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { toast } from 'sonner';

interface AiGenerateButtonProps {
  field: string;
  communityName: string;
  onGenerated: (text: string) => void;
  label?: string;
}

export function AiGenerateButton({
  field,
  communityName,
  onGenerated,
  label = 'Generate with AI',
}: AiGenerateButtonProps) {
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error('You must be logged in to generate content.');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-landing-content`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({ field, communityName }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to generate content.');
        return;
      }

      onGenerated(data.text);
    } catch {
      toast.error('Failed to generate content. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleGenerate}
      disabled={generating}
      className="text-secondary-400 hover:text-secondary-500 h-7 px-2 gap-1"
    >
      {generating ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Sparkles className="h-3 w-3" />
      )}
      <span className="text-meta">{generating ? 'Generating...' : label}</span>
    </Button>
  );
}
