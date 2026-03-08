'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Loader2, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import type { VendorCategoryRow } from '@/lib/types/database';

interface VendorCategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  categories: VendorCategoryRow[];
  onUpdated: () => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function VendorCategoryManager({
  open,
  onOpenChange,
  communityId,
  categories,
  onUpdated,
}: VendorCategoryManagerProps) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const slug = slugify(trimmed);
    if (categories.some((c) => c.slug === slug)) {
      toast.error('A category with that name already exists.');
      return;
    }

    setAdding(true);
    const supabase = createClient();
    const maxOrder = Math.max(0, ...categories.map((c) => c.display_order));

    const { error } = await supabase.from('vendor_categories').insert({
      community_id: communityId,
      name: trimmed,
      slug,
      display_order: maxOrder + 10,
    });

    setAdding(false);

    if (error) {
      toast.error('Failed to add category.');
      return;
    }

    toast.success('Category added.');
    setNewName('');
    onUpdated();
  }

  function startEdit(cat: VendorCategoryRow) {
    setEditingId(cat.id);
    setEditName(cat.name);
  }

  async function handleSaveEdit() {
    if (!editingId || !editName.trim()) return;

    setSaving(true);
    const supabase = createClient();
    const newSlug = slugify(editName.trim());

    const { error } = await supabase
      .from('vendor_categories')
      .update({ name: editName.trim(), slug: newSlug })
      .eq('id', editingId);

    setSaving(false);

    if (error) {
      toast.error('Failed to update category.');
      return;
    }

    toast.success('Category updated.');
    setEditingId(null);
    onUpdated();
  }

  async function handleDelete(cat: VendorCategoryRow) {
    if (cat.is_system) {
      toast.error('System categories cannot be deleted.');
      return;
    }

    setDeletingId(cat.id);
    const supabase = createClient();

    // Find the General category to reassign vendors
    const generalCat = categories.find((c) => c.slug === 'general');
    if (!generalCat) {
      toast.error('Cannot find General category for reassignment.');
      setDeletingId(null);
      return;
    }

    // Check how many vendors use this category
    const { count } = await supabase
      .from('vendors')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', cat.id);

    if (count && count > 0) {
      // Reassign vendors to General
      const { error: reassignError } = await supabase
        .from('vendors')
        .update({ category_id: generalCat.id })
        .eq('category_id', cat.id);

      if (reassignError) {
        toast.error('Failed to reassign vendors.');
        setDeletingId(null);
        return;
      }
    }

    // Delete the category
    const { error } = await supabase
      .from('vendor_categories')
      .delete()
      .eq('id', cat.id);

    setDeletingId(null);

    if (error) {
      toast.error('Failed to delete category.');
      return;
    }

    const msg = count && count > 0
      ? `Category deleted. ${count} vendor${count !== 1 ? 's' : ''} moved to General.`
      : 'Category deleted.';
    toast.success(msg);
    onUpdated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-2 px-3 py-2 rounded-inner-card border border-stroke-light dark:border-stroke-dark"
            >
              {editingId === cat.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 h-8 text-body"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="h-7 w-7 p-0"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-body text-text-primary-light dark:text-text-primary-dark">
                    {cat.name}
                  </span>
                  {cat.is_system && (
                    <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      System
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(cat)}
                    className="h-7 w-7 p-0"
                    title="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {!cat.is_system && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(cat)}
                      disabled={deletingId === cat.id}
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                      title="Delete (vendors reassigned to General)"
                    >
                      {deletingId === cat.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Add new category */}
          <div className="flex items-center gap-2 pt-2 border-t border-stroke-light dark:border-stroke-dark">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category name..."
              className="flex-1 h-8 text-body"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
            />
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
            >
              {adding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-1" />
              )}
              Add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
