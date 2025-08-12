import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions<T> {
  fetchMore: (page: number) => Promise<{
    data: T[];
    hasNextPage: boolean;
    nextPage?: number;
  }>;
  initialPage?: number;
  threshold?: number;
}

interface UseInfiniteScrollReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  hasNextPage: boolean;
  loadMore: () => Promise<void>;
  reset: () => void;
  lastElementRef: (node: HTMLElement | null) => void;
}

/**
 * Hook for infinite scrolling with automatic loading
 * @param options - Configuration options
 * @returns Data and control functions
 */
export function useInfiniteScroll<T>({
  fetchMore,
  initialPage = 1,
  threshold = 1.0,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [page, setPage] = useState(initialPage);
  
  const observer = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasNextPage) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchMore(page);
      
      setData(prevData => [...prevData, ...result.data]);
      setHasNextPage(result.hasNextPage);
      setPage(result.nextPage || page + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [fetchMore, page, loading, hasNextPage]);

  const lastElementRef = useCallback((node: HTMLElement | null) => {
    if (loading) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage) {
        loadMore();
      }
    }, { threshold });

    if (node) observer.current.observe(node);
  }, [loading, hasNextPage, loadMore, threshold]);

  const reset = useCallback(() => {
    setData([]);
    setPage(initialPage);
    setHasNextPage(true);
    setError(null);
    if (observer.current) {
      observer.current.disconnect();
    }
  }, [initialPage]);

  // Initial load
  useEffect(() => {
    if (data.length === 0 && !loading) {
      loadMore();
    }
  }, [data.length, loading, loadMore]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    hasNextPage,
    loadMore,
    reset,
    lastElementRef,
  };
}