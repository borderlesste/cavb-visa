/**
 * Memoization utilities for performance optimization
 */
import React from 'react';

// Simple memoization function
export function memoize<TArgs extends readonly unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  const cache = new Map<string, TReturn>();

  return (...args: TArgs): TReturn => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

// Memoization with TTL (Time To Live)
export function memoizeWithTTL<TArgs extends readonly unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  ttl: number = 60000 // 1 minute default
): (...args: TArgs) => TReturn {
  const cache = new Map<string, { value: TReturn; expiry: number }>();

  return (...args: TArgs): TReturn => {
    const key = JSON.stringify(args);
    const now = Date.now();
    const cached = cache.get(key);

    if (cached && now < cached.expiry) {
      return cached.value;
    }

    const result = fn(...args);
    cache.set(key, { value: result, expiry: now + ttl });
    return result;
  };
}

// LRU (Least Recently Used) Cache
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      const value = this.cache.get(key)!;
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // Update existing
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Memoization with LRU cache
export function memoizeWithLRU<TArgs extends readonly unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  maxSize: number = 50
): (...args: TArgs) => TReturn {
  const cache = new LRUCache<string, TReturn>(maxSize);

  return (...args: TArgs): TReturn => {
    const key = JSON.stringify(args);
    
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

// Async memoization
export function memoizeAsync<TArgs extends readonly unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  ttl: number = 300000 // 5 minutes default
): (...args: TArgs) => Promise<TReturn> {
  const cache = new Map<string, { value: Promise<TReturn>; expiry: number }>();

  return (...args: TArgs): Promise<TReturn> => {
    const key = JSON.stringify(args);
    const now = Date.now();
    const cached = cache.get(key);

    if (cached && now < cached.expiry) {
      return cached.value;
    }

    const promise = fn(...args).catch((error) => {
      // Remove failed promises from cache
      cache.delete(key);
      throw error;
    });

    cache.set(key, { value: promise, expiry: now + ttl });
    return promise;
  };
}

// Debounced memoization - useful for search functions
export function memoizeDebounced<TArgs extends readonly unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  delay: number = 300
): (...args: TArgs) => Promise<TReturn> {
  const cache = new Map<string, TReturn>();
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: TArgs): Promise<TReturn> => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return Promise.resolve(cache.get(key)!);
    }

    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        const result = fn(...args);
        cache.set(key, result);
        resolve(result);
      }, delay);
    });
  };
}

// React component memoization helper
export const createMemoizedComponent = <P extends object>(
  Component: React.ComponentType<P>,
  arePropsEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  return React.memo(Component, arePropsEqual);
};

// Selector memoization for complex state computations
export function createSelector<TState, TResult>(
  selector: (state: TState) => TResult
): (state: TState) => TResult {
  let lastState: TState | undefined;
  let lastResult: TResult;

  return (state: TState): TResult => {
    if (state !== lastState) {
      lastState = state;
      lastResult = selector(state);
    }
    return lastResult;
  };
}

// Multiple dependency selector
export function createMultiSelector<TState, TDep1, TDep2, TResult>(
  dep1Selector: (state: TState) => TDep1,
  dep2Selector: (state: TState) => TDep2,
  resultSelector: (dep1: TDep1, dep2: TDep2) => TResult
): (state: TState) => TResult {
  let lastDep1: TDep1 | undefined;
  let lastDep2: TDep2 | undefined;
  let lastResult: TResult;

  return (state: TState): TResult => {
    const dep1 = dep1Selector(state);
    const dep2 = dep2Selector(state);

    if (dep1 !== lastDep1 || dep2 !== lastDep2) {
      lastDep1 = dep1;
      lastDep2 = dep2;
      lastResult = resultSelector(dep1, dep2);
    }

    return lastResult;
  };
}