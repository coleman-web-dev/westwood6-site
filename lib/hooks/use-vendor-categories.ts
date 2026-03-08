'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { VendorCategoryRow } from '@/lib/types/database';

export function useVendorCategories(communityId: string) {
  const [categories, setCategories] = useState<VendorCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('vendor_categories')
      .select('*')
      .eq('community_id', communityId)
      .order('display_order');
    setCategories((data as VendorCategoryRow[]) || []);
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, refetch: fetchCategories };
}
