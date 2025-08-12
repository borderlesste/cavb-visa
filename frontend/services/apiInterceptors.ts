// (Removed unused getAuthToken function)

// Removed axios-style interceptors since 'api' does not support them.
// Use enhancedFetch and addRequestInterceptor for request/response handling.

// API Interceptors and enhanced functionality
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Enhanced fetch wrapper with retry logic and better error handling
export const enhancedFetch = async (
  url: string,
  options: RequestInit = {},
  retries: number = 3,
  retryDelay: number = 1000
): Promise<Response> => {
  const token = localStorage.getItem('authToken');
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
  };

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Add timeout to request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // If response is ok, return it
      if (response.ok) {
        return response;
      }

      // If it's a 401 error, handle it (e.g., redirect to login)
      if (response.status === 401) {
        console.error("Authentication Error: Unauthorized");
        // Optionally, redirect to login
        // window.location.href = '/login';
      }

      // If it's a client error (4xx), don't retry
      if (response.status >= 400 && response.status < 500) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData.code,
          errorData
        );
      }

      // If it's a server error (5xx) and we have retries left, continue to retry
      if (attempt < retries) {
        console.warn(`Request failed (attempt ${attempt}/${retries}), retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryDelay *= 2; // Exponential backoff
        continue;
      }

      // Last attempt failed
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData.code,
        errorData
      );

    } catch (error) {
      // If it's our custom ApiError, re-throw it
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle network errors, timeouts, etc.
      if (attempt < retries) {
        console.warn(`Network error (attempt ${attempt}/${retries}), retrying in ${retryDelay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryDelay *= 2;
        continue;
      }

      // Last attempt failed
      throw new ApiError(
        'Network error: Unable to connect to the server',
        0,
        'NETWORK_ERROR',
        error
      );
    }
  }

  throw new ApiError('Max retries exceeded', 0, 'MAX_RETRIES_EXCEEDED');
};

// Request interceptor
export const addRequestInterceptor = (config: RequestInit): RequestInit => {
  // Add common headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(config.headers as Record<string, string>),
  };

  // Add auth token if available
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return {
    ...config,
    headers,
  };
};

// Response interceptor for global error handling
export const handleApiResponse = async (response: Response) => {
  // Handle rate limiting
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
    
    throw new ApiError(
      `Too many requests. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
      429,
      'RATE_LIMITED',
      { retryAfter: waitTime }
    );
  }

  // Handle token expiration
  if (response.status === 401) {
    const errorData = await response.json().catch(() => ({}));
    
    // Clear expired token
    localStorage.removeItem('authToken');
    
    // Redirect to login if not already there
    if (window.location.hash !== '#/auth') {
      window.location.hash = '/auth';
    }

    throw new ApiError(
      errorData.message || 'Authentication required',
      401,
      'UNAUTHORIZED'
    );
  }

  // Handle forbidden access
  if (response.status === 403) {
    throw new ApiError(
      'Access forbidden. You do not have permission to perform this action.',
      403,
      'FORBIDDEN'
    );
  }

  return response;
};

// Offline detection and queue
class OfflineQueue {
  private queue: Array<{ request: () => Promise<any>, resolve: Function, reject: Function }> = [];
  private isOnline: boolean = navigator.onLine;

  constructor() {
    window.addEventListener('online', this.processQueue.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private handleOffline() {
    this.isOnline = false;
    console.warn('Application is offline. Requests will be queued.');
  }

  private async processQueue() {
    this.isOnline = true;
    console.log('Application is back online. Processing queued requests...');

    while (this.queue.length > 0) {
      const { request, resolve, reject } = this.queue.shift()!;
      try {
        const result = await request();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
  }

  async addToQueue(request: () => Promise<any>): Promise<any> {
    if (this.isOnline) {
      return await request();
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      console.log(`Request queued. ${this.queue.length} requests in queue.`);
    });
  }
}

export const offlineQueue = new OfflineQueue();

// Enhanced API service with all improvements
export const enhancedApi = {
  // Helper method to make requests with all enhancements
  request: async (url: string, options: RequestInit = {}) => {
    // Add timestamp to prevent caching issues
    let finalUrl = url;
    try {
      const urlObj = new URL(url, window.location.origin);
      urlObj.searchParams.append('_t', Date.now().toString());
      finalUrl = urlObj.toString();
    } catch (error) {
      // If URL construction fails, use original URL
      console.warn('Failed to add timestamp to URL:', error);
      finalUrl = url;
    }
    
    const enhancedOptions = addRequestInterceptor(options);
    const response = await enhancedFetch(finalUrl, enhancedOptions);
    return await handleApiResponse(response);
  },

  // Wrapper for all API calls to use offline queue
  withOfflineSupport: async <T>(apiCall: () => Promise<T>): Promise<T> => {
    return await offlineQueue.addToQueue(apiCall);
  },

  // Health check endpoint
  healthCheck: async (): Promise<{ status: string; timestamp: number }> => {
    const response = await enhancedApi.request('/api/health');
    return await response.json();
  },

  // Ping endpoint for connection testing
  ping: async (): Promise<number> => {
    const start = Date.now();
    await enhancedApi.request('/api/health');
    return Date.now() - start;
  },
};

// Analytics and monitoring
export class ApiMonitor {
  private static instance: ApiMonitor;
  private metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    responseTimes: number[];
  } = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    responseTimes: [],
  };

  static getInstance(): ApiMonitor {
    if (!ApiMonitor.instance) {
      ApiMonitor.instance = new ApiMonitor();
    }
    return ApiMonitor.instance;
  }

  logRequest(startTime: number, success: boolean, error?: Error) {
    const responseTime = Date.now() - startTime;
    
    this.metrics.totalRequests++;
    this.metrics.responseTimes.push(responseTime);
    
    // Keep only last 100 response times for average calculation
    if (this.metrics.responseTimes.length > 100) {
      this.metrics.responseTimes.shift();
    }

    this.metrics.averageResponseTime = 
      this.metrics.responseTimes.reduce((sum, time) => sum + time, 0) / this.metrics.responseTimes.length;

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
      console.error('API request failed:', error);
    }

    // Log performance issues
    if (responseTime > 5000) {
      console.warn(`Slow API response: ${responseTime}ms`);
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: (this.metrics.successfulRequests / this.metrics.totalRequests) * 100,
    };
  }

  reset() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      responseTimes: [],
    };
  }
}

export const apiMonitor = ApiMonitor.getInstance();