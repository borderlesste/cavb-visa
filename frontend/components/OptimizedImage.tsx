import React, { useState, useRef, useCallback, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  fallbackSrc?: string;
  lazy?: boolean;
  quality?: number;
  width?: number;
  height?: number;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Optimized image component with lazy loading, placeholder, and error handling
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDEwIDAgTCAwIDAgMCAxMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZGRkIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=',
  fallbackSrc = '/images/placeholder.png',
  lazy = true,
  quality = 85,
  width,
  height,
  onLoad,
  onError,
}) => {
  const [imageSrc, setImageSrc] = useState(lazy ? placeholder : src);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [inView, setInView] = useState(!lazy);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for lazy loading
  const setRef = useCallback((node: HTMLImageElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (node && lazy) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (observerRef.current) {
              observerRef.current.disconnect();
            }
          }
        },
        { rootMargin: '50px' }
      );
      observerRef.current.observe(node);
    }

    imgRef.current = node;
  }, [lazy]);

  // Load image when in view
  useEffect(() => {
    if (inView && imageSrc === placeholder) {
      setImageSrc(src);
    }
  }, [inView, src, imageSrc, placeholder]);

  const handleLoad = useCallback(() => {
    setImageLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setImageError(true);
    setImageSrc(fallbackSrc);
    onError?.();
  }, [fallbackSrc, onError]);

  // Generate optimized src URL (if using a CDN or image service)
  const getOptimizedSrc = useCallback((originalSrc: string) => {
    // This is a placeholder for image optimization logic
    // In a real app, you might use services like Cloudinary, Imgix, etc.
    if (originalSrc === placeholder || originalSrc === fallbackSrc) {
      return originalSrc;
    }

    const url = new URL(originalSrc, window.location.origin);
    
    if (quality && quality < 100) {
      url.searchParams.set('quality', quality.toString());
    }
    
    if (width) {
      url.searchParams.set('w', width.toString());
    }
    
    if (height) {
      url.searchParams.set('h', height.toString());
    }

    return url.toString();
  }, [quality, width, height, placeholder, fallbackSrc]);

  const optimizedSrc = getOptimizedSrc(imageSrc);

  // Preload the image for better UX
  useEffect(() => {
    if (inView && imageSrc !== placeholder) {
      const img = new Image();
      img.src = optimizedSrc;
      img.onload = handleLoad;
      img.onerror = handleError;
    }
  }, [inView, imageSrc, optimizedSrc, placeholder, handleLoad, handleError]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        ref={setRef}
        src={optimizedSrc}
        alt={alt}
        className={`transition-opacity duration-300 ${
          imageLoaded && !imageError ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        width={width}
        height={height}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
      />
      
      {/* Placeholder while loading */}
      {!imageLoaded && !imageError && (
        <div 
          className={`absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center ${className}`}
        >
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Error state */}
      {imageError && (
        <div 
          className={`absolute inset-0 bg-gray-100 flex flex-col items-center justify-center text-gray-500 ${className}`}
        >
          <svg 
            className="w-8 h-8 mb-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
            />
          </svg>
          <span className="text-xs">Failed to load</span>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;