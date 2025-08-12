/**
 * Bundle optimization utilities
 */
import * as React from 'react';

// Dynamic import with error handling and retry logic
export async function dynamicImport<T>(
  importFn: () => Promise<T>,
  retries: number = 3,
  retryDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < retries; i++) {
    try {
      return await importFn();
    } catch (error) {
      lastError = error as Error;
      
      // If it's a network error, retry
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, i)));
        continue;
      }
    }
  }

  throw lastError!;
}

// Preload components for better UX
export function preloadComponent<T>(
  importFn: () => Promise<{ default: T }>
): Promise<{ default: T }> {
  return importFn();
}

// Bundle size analyzer (development only)
export function analyzeBundleSize() {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const scripts = document.querySelectorAll('script[src]');
  let totalSize = 0;

  scripts.forEach(async (script) => {
    const src = (script as HTMLScriptElement).src;
    if (!src) return;

    try {
      const response = await fetch(src, { method: 'HEAD' });
      const size = response.headers.get('content-length');
      if (size) {
        const sizeInKB = Math.round(parseInt(size) / 1024);
        console.log(`Bundle: ${src.split('/').pop()} - ${sizeInKB}KB`);
        totalSize += sizeInKB;
      }
    } catch (error) {
      console.warn(`Could not analyze bundle size for ${src}`);
    }
  });

  setTimeout(() => {
    console.log(`Total estimated bundle size: ${totalSize}KB`);
  }, 1000);
}

// Resource hints for better loading performance
export function addResourceHints() {
  const head = document.head;

  // Preconnect to external domains
  const preconnectDomains = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    // Add your API domains here
  ];

  preconnectDomains.forEach(domain => {
    if (!document.querySelector(`link[href="${domain}"]`)) {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      head.appendChild(link);
    }
  });

  // DNS prefetch for assets
  const dnsPrefetchDomains = [
    '//cdnjs.cloudflare.com',
    // Add CDN domains here
  ];

  dnsPrefetchDomains.forEach(domain => {
    if (!document.querySelector(`link[href="${domain}"]`)) {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      head.appendChild(link);
    }
  });
}

// Critical resource loading
export function loadCriticalResources() {
  // Optional font preloading (enable by setting VITE_PRELOAD_FONTS=1 and ensuring fonts exist & are used)
  if (import.meta.env.VITE_PRELOAD_FONTS === '1') {
    const criticalFonts = [
      '/fonts/Inter-Regular.woff2',
      '/fonts/Inter-Bold.woff2',
    ];
    criticalFonts.forEach(font => {
      if (document.querySelector(`link[href="${font}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      link.href = font;
      document.head.appendChild(link);
    });
  }

  // Preload critical CSS
  const criticalCSS = [
    '/css/critical.css',
  ];

  criticalCSS.forEach(css => {
    if (document.querySelector(`link[href="${css}"]`)) return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = css;
    link.onload = () => {
      link.rel = 'stylesheet';
    };
    document.head.appendChild(link);
  });
}

// Tree shaking helpers
export function importOnlyNeeded<T extends Record<string, any>>(
  module: T,
  neededKeys: (keyof T)[]
): Partial<T> {
  const result: Partial<T> = {};
  neededKeys.forEach(key => {
    if (key in module) {
      result[key] = module[key];
    }
  });
  return result;
}

// Code splitting strategies
export const CodeSplitStrategies = {
  // Route-based splitting
  byRoute: <T extends React.ComponentType<any>>(routeImporter: () => Promise<{ default: T }>) => {
    return React.lazy(routeImporter);
  },

  // Feature-based splitting
  byFeature: <T extends React.ComponentType<any>>(featureImporter: () => Promise<{ default: T }>) => {
    return React.lazy(featureImporter);
  },

  // Library splitting
  byLibrary: <T>(libraryImporter: () => Promise<T>) => {
    return dynamicImport(libraryImporter);
  },

  // Conditional loading
  conditional: async <T>(
    condition: boolean,
    importer: () => Promise<{ default: T }>
  ): Promise<T | null> => {
    if (!condition) return null;
    const module = await importer();
    return module.default;
  },
};

// Bundle splitting configuration helper
export function getBundleConfig() {
  return {
    // Vendor chunks
    vendor: {
      react: ['react', 'react-dom'],
      router: ['react-router-dom'],
      ui: ['@headlessui/react', 'react-helmet-async'],
    },
    
    // Common chunks
    common: {
      utils: ['./utils/', './hooks/'],
      components: ['./components/'],
      services: ['./services/'],
    },
    
    // Async chunks (for dynamic imports)
    async: [
      './pages/',
      './components/admin/',
      './components/charts/',
    ],
  };
}

// Performance monitoring for code splitting
export class BundlePerformanceMonitor {
  private loadTimes: Map<string, number> = new Map();
  private loadErrors: Map<string, Error> = new Map();

  trackLoadTime(chunkName: string, startTime: number) {
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    this.loadTimes.set(chunkName, loadTime);
    
    if (loadTime > 3000) { // Warn if chunk takes more than 3 seconds
      console.warn(`Slow chunk loading detected: ${chunkName} took ${loadTime.toFixed(2)}ms`);
    }
  }

  trackLoadError(chunkName: string, error: Error) {
    this.loadErrors.set(chunkName, error);
    console.error(`Chunk loading failed: ${chunkName}`, error);
  }

  getMetrics() {
    return {
      averageLoadTime: Array.from(this.loadTimes.values())
        .reduce((sum, time) => sum + time, 0) / this.loadTimes.size,
      slowestChunk: Math.max(...Array.from(this.loadTimes.values())),
      totalErrors: this.loadErrors.size,
      chunkLoadTimes: Object.fromEntries(this.loadTimes),
    };
  }
}

export const bundleMonitor = new BundlePerformanceMonitor();

// Initialize optimizations
export function initializeBundleOptimizations() {
  // Add resource hints
  addResourceHints();
  
  // Load critical resources
  loadCriticalResources();
  
  // Analyze bundle size in development
  if (process.env.NODE_ENV === 'development') {
    analyzeBundleSize();
  }
}