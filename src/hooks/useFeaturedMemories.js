import { useCallback, useEffect, useState } from 'react';
import { demoMemories } from '../data/demoMemories.js';
import {
  isPublicMemory,
  MEMORY_COLUMNS,
  MEMORY_VISIBILITY_PUBLIC,
  normalizeMemories,
} from '../lib/memoryContent.js';
import { hydrateMemoryMediaUrls } from '../lib/memoryMedia.js';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient.js';

export function useFeaturedMemories() {
  const [featuredMemories, setFeaturedMemories] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(hasSupabaseConfig);
  const [featuredError, setFeaturedError] = useState('');

  const loadFeatured = useCallback(async () => {
    if (!supabase) {
      setFeaturedMemories(
        normalizeMemories(demoMemories.slice(0, 3).map((memory) => ({ ...memory, is_featured: true }))),
      );
      setLoadingFeatured(false);
      return;
    }

    setLoadingFeatured(true);
    setFeaturedError('');

    try {
      const { data, error } = await supabase
        .from('memories')
        .select(MEMORY_COLUMNS)
        .eq('is_featured', true)
        .eq('visibility_status', MEMORY_VISIBILITY_PUBLIC)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setFeaturedMemories(
        await hydrateMemoryMediaUrls(normalizeMemories((data ?? []).filter(isPublicMemory))),
      );
    } catch {
      setFeaturedError('无法读取精选图片。');
    } finally {
      setLoadingFeatured(false);
    }
  }, []);

  useEffect(() => {
    loadFeatured();
  }, [loadFeatured]);

  return {
    featuredMemories,
    loadingFeatured,
    featuredError,
    refreshFeatured: loadFeatured,
  };
}
