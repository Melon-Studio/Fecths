## Fetchs

Fetchs is a powerful and flexible HTTP client library for making network requests in JavaScript applications. It provides a wide range of features such as caching, request retrying, request and response interceptors, and timeout handling. Built on top of the native fetch API, Fetchs offers a simple and intuitive interface to handle various HTTP operations with ease.

### Features

- **Multiple HTTP Methods**: Supports all major HTTP methods including GET, POST, PUT, PATCH, DELETE, and HEAD.
- **Caching Mechanism**: Enables caching of responses with customizable time-to-live (TTL) and storage options (memory or localStorage).
- **Request Retrying**: Automatically retries failed requests based on specified status codes and retry configurations.
- **Interceptors**: Allows adding custom logic before sending requests and after receiving responses.
- **Timeout Handling**: Sets a timeout for requests to prevent hanging requests.
- **Customizable Configuration**: Provides a global configuration object that can be customized for each request.

### Installation

Download the release to your project.

### Basic Usage

```javascript
import { Fetchs, FetchsConfig } from 'fetchs';

// Create a new instance of Fetchs with optional global configuration
const fetchs = new Fetchs({
    baseUrl: 'https://www.example.com',
    timeout: 3000,
    headers: {
        'Authorization': 'Bearer YourAccessToken'
    }
});

// Define the request configuration
const config: FetchsConfig = {
    method: 'GET',
    responseType: 'json'
};

// Execute a request
fetchs.executeRequest<{ message: string }>('/data', config)
   .then(response => {
        console.log('Response:', response);
    })
   .catch(error => {
        console.error('Error:', error);
    });
```

For more details and advanced usage, refer to the [documentation](#) (Not yet open).

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.txt) file for details.
