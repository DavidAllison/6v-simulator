/**
 * CloudFront Function: Index Rewrite for 6v-simulator
 * 
 * This function handles:
 * 1. Directory requests by appending index.html
 * 2. SPA routing by redirecting non-file paths to index.html
 * 3. Allows S3 to use REST endpoint (secure) instead of website endpoint
 * 
 * Deploy as: Viewer Request function in CloudFront
 */

function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Handle root path
    if (uri === '/' || uri === '') {
        request.uri = '/index.html';
        return request;
    }
    
    // If URI ends with /, append index.html
    if (uri.endsWith('/')) {
        request.uri += 'index.html';
    }
    // If URI doesn't have a file extension, assume it's a SPA route
    // and serve index.html to let the client-side router handle it
    else if (!uri.includes('.')) {
        request.uri = '/index.html';
    }
    
    // Return modified request
    return request;
}