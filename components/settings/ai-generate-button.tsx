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
      const { data, error } = await supabase.functions.invoke(
        'generate-landing-content',
        { body: { field, communityName } },
      );

      if (error) {
        toast.error(error.message || 'Failed to generate content.');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
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
