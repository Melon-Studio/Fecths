/**
 * This file is part of Fetchs Project
 * index.ts - Fetchs Core code
 * 
 * This package is free, is Licensed under MIT License
 * You must include the MIT copy file in the software package you publish
 * 
 * Author: Gabriel Ryder
 * Email: chinabga@gmail.com
 * 
 */

// Define the type of HTTP methods supported
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
// Define the type of response data formats supported
type ResponseType = 'json' | 'text' | 'blob' | 'arraybuffer' | 'formData';

/**
 * Configuration object for Fetchs.
 * 
 * @interface FetchsConfig
 * @property {string} [baseUrl] - The base URL to prepend to all requests.
 * @property {number} [timeout] - The request timeout in milliseconds.
 * @property {Record<string, string>} [headers] - The headers to include in the request.
 * @property {CacheConfig} [cache] - The cache configuration.
 * @property {RetryConfig} [retry] - The retry configuration.
 * @property {ResponseType} [responseType] - The expected response type.
 * @property {DataSerializer} [serializer] - The data serializer to use.
 * @property {(status: number) => boolean} [validateStatus] - A function to validate the response status code.
 */
interface FetchsConfig {
    baseUrl?: string;
    timeout?: number;
    headers?: Record<string, string>;
    cache?: CacheConfig;
    retry?: RetryConfig;
    responseType?: ResponseType;
    serializer?: DataSerializer;
    validateStatus?: (status: number) => boolean;
    method?: HttpMethod;
    body?: any;
}

/**
 * Configuration object for caching.
 * 
 * @interface CacheConfig
 * @property {boolean} [enabled] - Whether caching is enabled.
 * @property {number} [ttl] - The time-to-live for cached items in milliseconds.
 * @property {'memory' | 'localStorage'} [storage] - The storage type for caching.
 * @property {HttpMethod[]} [excludeMethods] - The HTTP methods to exclude from caching.
 */
interface CacheConfig {
    enabled?: boolean;
    ttl?: number; // milliseconds
    storage?: 'memory' | 'localStorage';
    excludeMethods?: HttpMethod[];
}

/**
 * Configuration object for retrying requests.
 * 
 * @interface RetryConfig
 * @property {number} [attempts] - The number of retry attempts.
 * @property {number} [delay] - The base delay in milliseconds between retries.
 * @property {number} [maxDelay] - The maximum delay in milliseconds between retries.
 * @property {number} [backoffFactor] - The backoff factor for exponential backoff.
 * @property {number[]} [statusCodes] - The status codes for which to retry the request.
 */
interface RetryConfig {
    attempts?: number;
    delay?: number; // base delay in ms
    maxDelay?: number; // max delay in ms
    backoffFactor?: number;
    statusCodes?: number[];
}

/**
 * Interface for data serialization and deserialization.
 * 
 * @interface DataSerializer
 * @property {(data: any) => BodyInit} serialize - A function to serialize data.
 * @property {(response: Response) => Promise<any>} deserialize - A function to deserialize the response.
 */
interface DataSerializer {
    serialize(data: any): BodyInit;
    deserialize(response: Response): Promise<any>;
}

/**
 * Interface for a pending request.
 * 
 * @interface PendingRequest
 * @property {string} url - The URL of the request.
 * @property {AbortController} controller - The AbortController for the request.
 * @property {number} timestamp - The timestamp when the request was initiated.
 */
interface PendingRequest {
    url: string;
    controller: AbortController;
    timestamp: number;
}

/**
 * Custom error class for Fetchs.
 * 
 * @class FetchError
 * @extends {Error}
 * @property {string} message - The error message.
 * @property {string} [code] - The error code.
 * @property {number} [status] - The HTTP status code.
 * @property {FetchsConfig} [config] - The configuration used for the request.
 * @property {Request} [request] - The request object.
 * @property {Response} [response] - The response object.
 */
class FetchError extends Error {
    constructor(
        public message: string,
        public code?: string,
        public status?: number,
        public config?: FetchsConfig,
        public request?: Request,
        public response?: Response
    ) {
        super(message);
    }
}

/**
 * The main Fetchs class for making HTTP requests.
 * 
 * @class Fetchs
 */
class Fetchs {
    // Global configuration object
    private globalConfig: FetchsConfig;
    // Array of request interceptors
    private requestInterceptors: Array<(config: FetchsConfig) => Promise<void> | void>;
    // Array of response interceptors
    private responseInterceptors: Array<(response: Response) => Promise<Response> | Response>;
    // Cache storage using a Map
    private cacheStorage: Map<string, CacheItem>;
    // Map of pending requests
    private pendingRequests: Map<string, PendingRequest>;
    // Default data serializer
    private defaultSerializer: DataSerializer = {
        serialize: data => JSON.stringify(data),
        deserialize: async response => response.json()
    };

    /**
     * Creates an instance of Fetchs.
     * 
     * @param {FetchsConfig} [globalConfig={}] - The global configuration object.
     */
    constructor(globalConfig: FetchsConfig = {}) {
        this.globalConfig = {
            baseUrl: '',
            timeout: 5000,
            headers: { 'Content-Type': 'application/json' },
            cache: { enabled: false, ttl: 300000, storage: 'memory' },
            retry: { attempts: 3, delay: 1000, backoffFactor: 2, statusCodes: [429, 503] },
            validateStatus: status => status >= 200 && status < 300,
            ...globalConfig
        };
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        this.cacheStorage = new Map();
        this.pendingRequests = new Map();
    }

    /**
     * Set global configurations.
     * 
     * @param {FetchsConfig} config - Global configuration object.
     */
    create(config: FetchsConfig): void {
        this.globalConfig = { ...this.globalConfig, ...config };
    }

    /**
     * Add request interceptor.
     * 
     * @param {(config: FetchsConfig) => Promise<void> | void} interceptor - Interceptor function.
     */
    addRequestInterceptor(interceptor: (config: FetchsConfig) => Promise<void> | void): void {
        this.requestInterceptors.push(interceptor);
    }

    /**
     * Add response interceptor.
     * 
     * @param {(response: Response) => Promise<Response> | Response} interceptor - Interceptor function.
     */
    addResponseInterceptor(interceptor: (response: Response) => Promise<Response> | Response): void {
        this.responseInterceptors.push(interceptor);
    }

    /**
     * Clear all cached responses.
     */
    clearCache(): void {
        this.cacheStorage.clear();
    }

    /**
     * Cancel all pending requests.
     */
    cancelAllRequests(): void {
        this.pendingRequests.forEach(request => request.controller.abort());
        this.pendingRequests.clear();
    }

    /**
     * Cancel specific request by URL.
     * 
     * @param {string} url - Request URL to cancel.
     */
    cancelRequest(url: string): void {
        const request = this.pendingRequests.get(url);
        if (request) {
            request.controller.abort();
            this.pendingRequests.delete(url);
        }
    }

    /**
     * Execute a request.
     * 
     * @private
     * @template T
     * @param {string} url - The URL of the request.
     * @param {FetchsConfig} config - The configuration for the request.
     * @returns {Promise<T>} - A promise that resolves with the response data.
     */
    private async executeRequest<T>(url: string, config: FetchsConfig): Promise<T> {
        const cacheKey = this.getCacheKey(url, config);
        const cachedResponse = this.getCachedResponse<T>(cacheKey, config);
        if (cachedResponse) return cachedResponse;

        const controller = new AbortController();
        const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.pendingRequests.set(requestId, { url, controller, timestamp: Date.now() });

        // Add timeout handling
        const timeout = config.timeout || (this.globalConfig.timeout !== undefined ? this.globalConfig.timeout : 5000);
        const timeoutId = setTimeout(() => {
            controller.abort();
            this.pendingRequests.delete(requestId);
        }, timeout);

        try {
            // Handle request interceptors with error catching
            try {
                for (const interceptor of this.requestInterceptors) {
                    await interceptor(config);
                }
            } catch (interceptorError) {
                throw new FetchError(
                    `Request interceptor failed: ${interceptorError.message}`,
                    'EINTERCEPTOR',
                    undefined,
                    config
                );
            }

            const response = await fetch(this.buildUrl(url), {
                method: config.method,
                headers: config.headers,
                body: this.serializeData(config.body, config),
                signal: controller.signal
            });

            // Handle response interceptors with error catching
            let processedResponse = response.clone();
            try {
                for (const interceptor of this.responseInterceptors) {
                    processedResponse = await interceptor(processedResponse.clone());
                }
            } catch (interceptorError) {
                throw new FetchError(
                    `Response interceptor failed: ${interceptorError.message}`,
                    'EINTERCEPTOR',
                    processedResponse.status,
                    config,
                    undefined,
                    processedResponse
                );
            }

            if (!config.validateStatus!(processedResponse.status)) {
                throw new FetchError(
                    `Request failed with status ${processedResponse.status}`,
                    'EHTTP',
                    processedResponse.status,
                    config,
                    undefined,
                    processedResponse
                );
            }

            const data = await this.deserializeData<T>(processedResponse, config);
            this.cacheResponse(cacheKey, data, config);
            return data;
        } catch (error) {
            // Handle timeout specifically
            if (error.name === 'AbortError') {
                throw new FetchError(
                    `Request timed out after ${timeout}ms`,
                    'ETIMEOUT',
                    undefined,
                    config
                );
            }

            if (this.shouldRetry(error, config)) {
                return this.retryRequest<T>(url, config);
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
            this.pendingRequests.delete(requestId);
        }
    }

    /**
     * Retry a failed request.
     * 
     * @private
     * @template T
     * @param {string} url - The URL of the request.
     * @param {FetchsConfig} config - The configuration for the request.
     * @returns {Promise<T>} - A promise that resolves with the response data.
     */
    private async retryRequest<T>(url: string, config: FetchsConfig): Promise<T> {
        const retryConfig = config.retry!;
        if (!retryConfig) {
            throw new FetchError('Retry configuration is not provided', 'ERETRYCONFIG');
        }
        let attempts = 0;
        let delay = retryConfig.delay!;

        while (attempts < retryConfig.attempts!) {
            await new Promise(resolve => setTimeout(resolve, delay));
            try {
                return await this.executeRequest<T>(url, config);
            } catch (error) {
                attempts++;
                delay = Math.min(delay * retryConfig.backoffFactor!, retryConfig.maxDelay || Infinity);
                if (attempts >= retryConfig.attempts!) {
                    throw new FetchError(
                        'Max retry attempts exceeded',
                        'ERETRY',
                        (error as FetchError).status,
                        config,
                        (error as FetchError).request,
                        (error as FetchError).response
                    );
                }
            }
        }
        throw new FetchError(
            'Max retry attempts exceeded',
            'ERETRY',
            undefined,
            config
        );
    }

    /**
     * Get the cache key for a request.
     * 
     * @private
     * @param {string} url - The URL of the request.
     * @param {FetchsConfig} config - The configuration for the request.
     * @returns {string} - The cache key.
     */
    private getCacheKey(url: string, config: FetchsConfig): string {
        const baseKey = `${config.method}:${url}:${JSON.stringify(config.body)}`;
        // Hash the key for localStorage to avoid length issues
        return config.cache?.storage === 'localStorage'
            ? this.hashString(baseKey)
            : baseKey;
    }

    /**
     * Hash a string to a 32-bit integer.
     *
     * @private
     * @param {string} str - The string to hash.
     */
    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash |= 0; // Convert to 32bit integer
        }
        return 'cache_' + Math.abs(hash).toString(36);
    }

    /**
     * Get the cached response for a given cache key.
     * 
     * @private
     * @template T
     * @param {string} key - The cache key.
     * @param {FetchsConfig} config - The configuration for the request.
     * @returns {T | null} - The cached response or null if not found or expired.
     */
    private getCachedResponse<T>(key: string, config: FetchsConfig): T | null {
        if (!config.cache?.enabled) return null;

        try {
            let item: CacheItem | null = null;

            if (config.cache.storage === 'localStorage') {
                const stored = localStorage.getItem(key);
                item = stored ? JSON.parse(stored) : null;
            } else {
                item = this.cacheStorage.get(key) || null;
            }

            if (item && Date.now() - item.timestamp < config.cache.ttl!) {
                return item.data;
            }

            // Remove expired cache
            this.removeCachedResponse(key, config);
            return null;
        } catch (error) {
            console.error('Cache read error:', error);
            return null;
        }
    }

    /**
     * Remove the cached response for a given cache key.
     *
     * @private
     * @param {string} key - The cache key.
     * @param {FetchsConfig} config - The configuration for the request.
     */
    private removeCachedResponse(key: string, config: CacheConfig): void {
        try {
            if (config.storage === 'localStorage') {
                localStorage.removeItem(key);
            } else {
                this.cacheStorage.delete(key);
            }
        } catch (error) {
            console.error('Cache removal error:', error);
        }
    }


    /**
     * Cache the response for a given cache key.
     * 
     * @private
     * @template T
     * @param {string} key - The cache key.
     * @param {T} data - The data to cache.
     * @param {FetchsConfig} config - The configuration for the request.
     */
    private cacheResponse<T>(key: string, data: T, config: FetchsConfig): void {
        if (config.cache?.enabled && !config.cache.excludeMethods?.includes(config.method as HttpMethod)) {
            const item: CacheItem = {
                data,
                timestamp: Date.now()
            };

            try {
                if (config.cache.storage === 'localStorage') {
                    localStorage.setItem(key, JSON.stringify(item));
                } else {
                    this.cacheStorage.set(key, item);
                }
            } catch (error) {
                console.error('Cache write error:', error);
            }
        }
    }

    /**
     * Build the full URL for a request.
     * 
     * @private
     * @param {string} url - The URL of the request.
     * @returns {string} - The full URL.
     */
    private buildUrl(url: string): string {
        return url.startsWith('http') ? url : `${this.globalConfig.baseUrl}${url}`;
    }

    /**
     * Serialize the request data.
     * 
     * @private
     * @param {any} data - The data to serialize.
     * @param {FetchsConfig} config - The configuration for the request.
     * @returns {BodyInit} - The serialized data.
     */
    private serializeData(data: any, config: FetchsConfig): BodyInit {
        return config.serializer?.serialize(data) ?? this.defaultSerializer.serialize(data);
    }

    /**
     * Deserialize the response data.
     * 
     * @private
     * @template T
     * @param {Response} response - The response object.
     * @param {FetchsConfig} config - The configuration for the request.
     * @returns {Promise<T>} - A promise that resolves with the deserialized data.
     */
    private async deserializeData<T>(response: Response, config: FetchsConfig): Promise<T> {
        if (config.serializer?.deserialize) {
            return config.serializer.deserialize(response);
        }
        return this.defaultSerializer.deserialize(response);
    }

    /** 
     * IsFetchError
     * @param {any} error - The error object.
     * @returns {error is FetchError} - Returns true if the error is a FetchError, false otherwise.
    */
    private isFetchError(error: any): error is FetchError {
        return 'status' in error && 'code' in error;
    }

    /**
     * Determine whether a request should be retried based on the error and configuration.
     * 
     * @private
     * @param {any} error - The error object.
     * @param {FetchsConfig} config - The configuration for the request.
     * @returns {boolean} - Returns true if the request should be retried, false otherwise.
     */
    private shouldRetry(error: any, config: FetchsConfig): boolean {
        return (
            (config.retry?.statusCodes && this.isFetchError(error) && config.retry.statusCodes.includes(error.status)) ||
            (this.isFetchError(error) && error.code === 'ECONNABORTED')
        );
    }

}

// TypeScript Interfaces
/**
 * Represents an item in the cache.
 * 
 * @interface CacheItem
 * @property {any} data - The cached data.
 * @property {number} timestamp - The timestamp when the data was cached.
 */
interface CacheItem {
    data: any;
    timestamp: number;
}

/**
 * Export necessary classes and interfaces for external use.
 * 
 * @exports Fetchs - The main Fetchs class for making HTTP requests.
 * @exports FetchsConfig - Configuration object for Fetchs.
 * @exports CacheConfig - Configuration object for caching.
 * @exports RetryConfig - Configuration object for retrying requests.
 * @exports DataSerializer - Interface for data serialization and deserialization.
 * @exports FetchError - Custom error class for Fetchs.
 */
export { Fetchs, FetchsConfig, CacheConfig, RetryConfig, DataSerializer, FetchError };