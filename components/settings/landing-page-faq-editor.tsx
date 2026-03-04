'use client';

import { useState } from 'react';
import { Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Textarea } from '@/components/shared/ui/textarea';
import { toast } from 'sonner';
import type { LandingFaqItem } from '@/lib/types/landing';

interface FaqEditorProps {
  communityName: string;
  items: LandingFaqItem[];
  onChange: (items: LandingFaqItem[]) => void;
}

export function LandingPageFaqEditor({ communityName, items, onChange }: FaqEditorProps) {
  const [generating, setGenerating] = useState(false);

  async function handleGenerateFaq() {
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-landing-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'faq', communityName }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to generate FAQ.');
        return;
      }

      const parsed = JSON.parse(data.text) as LandingFaqItem[];
      if (Array.isArray(parsed)) {
        onChange([...items, ...parsed]);
        toast.success(`Added ${parsed.length} FAQ items.`);
      }
    } catch {
      toast.error('Failed to generate FAQ. Please try again.');
    } finally {
      setGenerating(false);
    }
  }
  function handleAdd() {
    onChange([...items, { question: '', answer: '' }]);
  }

  function handleRemove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function handleUpdate(index: number, field: keyof LandingFaqItem, value: string) {
    onChange(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-xl border border-stroke-light dark:border-stroke-dark p-3 space-y-2"
        >
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                placeholder="Question"
                value={item.question}
                onChange={(e) => handleUpdate(i, 'question', e.target.value)}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-9 w-9 text-destructive hover:text-destructive"
              onClick={() => handleRemove(i)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            placeholder="Answer"
            value={item.answer}
            onChange={(e) => handleUpdate(i, 'answer', e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
      ))}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add Question
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerateFaq}
          disabled={generating}
          className="text-secondary-400 hover:text-secondary-500 gap-1"
        >
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {generating ? 'Generating...' : 'Generate with AI'}
        </Button>
      </div>
    </div>
  );
}
