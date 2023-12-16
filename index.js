/**
 * 
 * This file is part of FecthPlus Project
 * index.js - FecthPlus Core code
 * 
 * This package is free, is Licensed under MIT License
 * You must include the MIT copy file in the software package you publish
 * 
 * Author: AbuLan
 * Email: xiaofan6@foxmail.com
 * 
 */

class Fecths {
    constructor(globalConfig = {}) {
        this.globalConfig = globalConfig;
        this.requestInterceptors = [];
        this.responseInterceptors = [];
    }

    /**
     * Set global configurations, such as base URLs, request and response interceptors, etc.
     * @param {Object} config - Global configuration object.
     */
    create(config) {
        this.globalConfig = { ...this.globalConfig, ...config };
    }

    /**
     * Get the current global configuration.
     * @returns {Object} - Current global configuration.
     */
    getGlobalConfig() {
        return this.globalConfig;
    }

    /**
   * Adds a request interceptor.
   * @param {function} interceptor - The request interceptor function.
   */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    /**
   * Adds a response interceptor.
   * @param {function} interceptor - The response interceptor function.
   */
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }

    /**
       * Makes a generic HTTP request using fetch.
       * @param {string} url - The URL for the request.
       * @param {Object} [options={}] - Additional options for the fetch request.
       * @returns {Promise} - A Promise that resolves to the parsed response data.
       */
    async request(url, options = {}) {
        for (const interceptor of this.requestInterceptors) {
            options = await interceptor(options);
        }

        otherOptions.timeout = timeout;

        if (!otherOptions.headers || !otherOptions.headers['Content-Type']) {
            otherOptions.headers = otherOptions.headers || {};
            otherOptions.headers['Content-Type'] = 'application/json';
        }

        const requestOptions = {
            method: 'GET',
            ...otherOptions,
        };

        if (otherOptions.body && otherOptions.headers['Content-Type'] === 'application/json' && typeof otherOptions.body === 'object') {
            requestOptions.body = JSON.stringify(otherOptions.body);
        }

        if (onProgress && typeof onProgress === 'function') {
            options.onProgress = onProgress;
        }

        const controller = new AbortController();
        const timeoutId = timeout > 0 ? setTimeout(() => controller.abort(), timeout) : null;
        options.signal = controller.signal;

        try {
            const response = await fetch(`${this.baseUrl}${url}`, options);

            for (const interceptor of this.responseInterceptors) {
                response = await interceptor(response);
            }

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            const contentType = response.headers.get('Content-Type');
            const responseData = contentType && contentType.includes('application/json')
                ? await response.json()
                : await response.text();

            responseData._originalResponse = response;

            return responseData;
        } finally {
            clearTimeout(timeoutId);
        }
    }
    
    /**
   * Sends a GET request.
   * @param {string} url - The URL for the GET request.
   * @param {Object} [options={}] - Additional options for the fetch request.
   * @param {function} [onProgress] - Callback function for download progress monitoring.
   * @returns {Promise} - A Promise that resolves to the parsed response data.
   */
    async get(url, options = {}, onProgress) {
        return this.request(url, { method: 'GET', ...options }, onProgress);
    }

    /**
   * Sends a POST request with JSON data.
   * @param {string} url - The URL for the POST request.
   * @param {Object} data - The data to be sent in the request body.
   * @param {Object} [options={}] - Additional options for the fetch request.
   * @param {function} [onProgress] - Callback function for upload progress monitoring.
   * @returns {Promise} - A Promise that resolves to the parsed response data.
   */
    async post(url, data, options = {}, onProgress) {
        return this.request(url, { method: 'POST', body: data, ...options }, onProgress);
    }

    /**
   * Sends a POST request with form data.
   * @param {string} url - The URL for the POST request.
   * @param {Object} formData - The form data to be sent in the request body.
   * @param {Object} [options={}] - Additional options for the fetch request.
   * @returns {Promise} - A Promise that resolves to the parsed response data.
   */
    async postForm(url, formData, options = {}) {
        // Set Content-Type to application/x-www-form-urlencoded
        options.headers = options.headers || {};
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';

        // Convert formData object to URL-encoded string
        const urlEncodedData = new URLSearchParams();
        for (const key in formData) {
            urlEncodedData.append(key, formData[key]);
        }

        return this.request(url, { method: 'POST', body: urlEncodedData, ...options });
    }

    /**
   * Sends a PUT request with JSON data.
   * @param {string} url - The URL for the PUT request.
   * @param {Object} data - The data to be sent in the request body.
   * @param {Object} [options={}] - Additional options for the fetch request.
   * @returns {Promise} - A Promise that resolves to the parsed response data.
   */
    async put(url, data, options = {}) {
        return this.request(url, { method: 'PUT', body: data, ...options });
    }

    /**
   * Sends a DELETE request.
   * @param {string} url - The URL for the DELETE request.
   * @param {Object} [options={}] - Additional options for the fetch request.
   * @returns {Promise} - A Promise that resolves to the parsed response data.
   */
    async delete(url, options = {}) {
        return this.request(url, { method: 'DELETE', ...options });
    }

    /**
   * Sends a PATCH request with JSON data.
   * @param {string} url - The URL for the PATCH request.
   * @param {Object} data - The data to be sent in the request body.
   * @param {Object} [options={}] - Additional options for the fetch request.
   * @returns {Promise} - A Promise that resolves to the parsed response data.
   */
    async patch(url, data, options = {}) {
        return this.request(url, { method: 'PATCH', body: data, ...options });
    }

    /**
   * Sends a custom HTTP request.
   * @param {string} url - The URL for the custom request.
   * @param {string} method - The HTTP method for the request (e.g., 'GET', 'POST').
   * @param {Object} data - The data to be sent in the request body.
   * @param {Object} [options={}] - Additional options for the fetch request.
   * @returns {Promise} - A Promise that resolves to the parsed response data.
   */
    async customRequest(url, method, data, options = {}) {
        return this.request(url, { method, body: data, ...options });
    }

    async upload(url, formData, onProgress, options = {}) {
        options.body = formData;

        return new Promise((resolve, reject) => {
            fetch(`${this.globalConfig.baseUrl}${url}`, options).then((response) => {
                if (!response.ok) {
                    reject(`Upload failed with status ${response.status}`);
                    return;
                }

                resolve(response.json());
            }).catch(reject);
        });
    }

    async download(url, onProgress, options = {}) {
        return new Promise((resolve, reject) => {
            fetch(`${this.globalConfig.baseUrl}${url}`, options).then((response) => {
                if (!response.ok) {
                    reject(`Download failed with status ${response.status}`);
                    return;
                }

                resolve(response.blob());
            }).catch(reject);
        });
    }
}

module.exports = Fecths;
