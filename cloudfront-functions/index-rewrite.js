function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Check if the URI has a file extension
    if (!uri.includes('.')) {
        // If no extension, serve index.html
        request.uri = '/index.html';
    }
    
    return request;
}