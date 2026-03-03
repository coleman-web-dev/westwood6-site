'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Textarea } from '@/components/shared/ui/textarea';
import type { LandingFaqItem } from '@/lib/types/landing';

interface FaqEditorProps {
  items: LandingFaqItem[];
  onChange: (items: LandingFaqItem[]) => void;
}

export function LandingPageFaqEditor({ items, onChange }: FaqEditorProps) {
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

      <Button variant="outline" size="sm" onClick={handleAdd}>
        <Plus className="h-4 w-4 mr-1" />
        Add Question
      </Button>
    </div>
  );
}
