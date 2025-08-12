import { useState, useEffect, useMemo, RefObject } from 'react';

interface VirtualizationOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualItem {
  index: number;
  start: number;
  end: number;
  size: number;
}

/**
 * Hook for virtualizing large lists to improve performance
 * @param items - Array of items to virtualize
 * @param options - Virtualization options
 * @param scrollElementRef - Reference to the scrollable container
 * @returns Virtual items and scroll handler
 */
export function useVirtualization<T>(
  items: T[],
  options: VirtualizationOptions,
  scrollElementRef: RefObject<HTMLElement>
) {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const scrollElement = scrollElementRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      setScrollTop(scrollElement.scrollTop);
    };

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [scrollElementRef]);

  const virtualItems = useMemo(() => {
    const visibleItemsCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(items.length - 1, startIndex + visibleItemsCount + overscan * 2);

    const virtualItems: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      virtualItems.push({
        index: i,
        start: i * itemHeight,
        end: (i + 1) * itemHeight,
        size: itemHeight,
      });
    }

    return virtualItems;
  }, [items.length, itemHeight, scrollTop, containerHeight, overscan]);

  const totalHeight = items.length * itemHeight;

  return {
    virtualItems,
    totalHeight,
    startIndex: virtualItems[0]?.index ?? 0,
    endIndex: virtualItems[virtualItems.length - 1]?.index ?? 0,
  };
}