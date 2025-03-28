import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_TIMEOUT = 30000; // 30 seconds timeout

/**
 * Custom error class for request timeouts
 */
class FetchTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FetchTimeoutError';
  }
}

/**
 * Handles response errors by extracting detailed information when possible
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Try to parse JSON error response first
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        const errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
        throw new Error(`${res.status}: ${errorMessage}`);
      } else {
        // Fallback to text response
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
    } catch (error) {
      // If parsing fails, just use the status text
      if (error instanceof Error && error.message.includes(`${res.status}`)) {
        throw error;
      } else {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
    }
  }
}

/**
 * Creates a fetch request with timeout support and enhanced error handling
 */
async function fetchWithTimeout(
  url: string, 
  options: RequestInit, 
  timeout: number = API_TIMEOUT
): Promise<Response> {
  // Create an abort controller to handle timeout
  const controller = new AbortController();
  const { signal } = controller;
  
  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      console.warn(`Request to ${url} is about to time out after ${timeout}ms`);
      controller.abort();
      reject(new FetchTimeoutError(`Request timed out after ${timeout}ms`));
    }, timeout);
  });
  
  const startTime = Date.now();
  console.log(`Starting request to ${url} with ${timeout}ms timeout`);
  
  try {
    // Race between fetch and timeout
    const response = await Promise.race([
      fetch(url, { ...options, signal }),
      timeoutPromise
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`Request to ${url} completed in ${duration}ms with status ${response.status}`);
    
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Handle abort error more gracefully
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error(`Request to ${url} aborted after ${duration}ms`);
      throw new FetchTimeoutError(`Request to ${url} timed out after ${timeout}ms`);
    }
    
    // Network errors (like offline, connection refused)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error(`Network error for ${url} after ${duration}ms: ${error.message}`);
      throw new Error(`Network error: ${error.message}. Please check your connection.`);
    }
    
    console.error(`Request to ${url} failed after ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Makes API requests with proper error handling and timeout support
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`API Request: ${method} ${url}`, data ? 'with data' : 'no data');
  
  try {
    const res = await fetchWithTimeout(
      url, 
      {
        method,
        headers: data ? { "Content-Type": "application/json" } : {},
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      }
    );
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API Request failed: ${method} ${url}`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Query function factory for TanStack Query
 */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    console.log(`Query request: ${url}`);
    
    try {
      const res = await fetchWithTimeout(
        url, 
        {
          credentials: "include",
        }
      );
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`Unauthorized access to ${url}, returning null as configured`);
        return null;
      }
      
      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error(`Query request failed: ${url}`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: 2, // Increase to two retries for network issues
      retryDelay: attemptIndex => Math.min(1000 * (2 ** attemptIndex), 30000), // Exponential backoff with max 30 seconds
    },
    mutations: {
      retry: 2, // Increase to two retries for network issues
      retryDelay: attemptIndex => Math.min(1000 * (2 ** attemptIndex), 30000), // Exponential backoff with max 30 seconds
    },
  },
});
