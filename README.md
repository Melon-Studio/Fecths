## Fecths

`Fecths` is a JavaScript library for simplifying HTTP requests in web applications. It is built on the `fetch` API, providing a convenient and versatile interface for handling various types of HTTP requests with ease.

If you are a Chinese user, Taobao Source may not be able to download to Fecths. Please switch NPM source to official source.

### Features

- **Global Configuration:** Set global configurations, such as base URLs, request and response interceptors, etc.
- **Interceptors:** Support request and response interceptors for customizing behavior.
- **HTTP Methods:** Convenient methods for common HTTP requests, including GET, POST, PUT, DELETE, PATCH, and custom requests.
- **File Upload and Download:** Specialized methods for handling file uploads and downloads.
- **Error Handling:** Automatic handling of non-OK response statuses with detailed error messages.
- **Timeout Support:** Set a timeout for requests, automatically aborting if the specified time is exceeded.

### Installation

```bash
npm install fecths
```

### Basic Usage

```javascript
const Fecths = require('fecths');

// Create an instance of Fecths
const fecths = new Fecths({
  baseUrl: 'https://api.example.com', // Set your base URL
});

// Set global configuration
fecths.create({
  headers: {
    'Authorization': 'Bearer YourAccessToken',
  },
});

// Add request interceptor
fecths.addRequestInterceptor(async (options) => {
  // Modify options before sending the request
  return options;
});

// Add response interceptor
fecths.addResponseInterceptor(async (response) => {
  // Modify the response before resolving the promise
  return response;
});

// Make a GET request
fecths.get('/data')
  .then((data) => {
    console.log('Data:', data);
  })
  .catch((error) => {
    console.error('Error:', error.message);
  });
```

For more details and advanced usage, refer to the [documentation](#) (Not yet open).

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.txt) file for details.
