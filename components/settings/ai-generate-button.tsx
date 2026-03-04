'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
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
      const res = await fetch('/api/ai/generate-landing-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, communityName }),
      });

      const data = await res.json();

      if (!res.ok) {
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
