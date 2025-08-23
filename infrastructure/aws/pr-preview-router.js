/**
 * CloudFront Function: PR Preview Router for 6v-simulator
 * 
 * This function routes PR preview requests to the correct S3 path
 * based on the subdomain (pr-123.preview.6v-simulator.com → /pr-123/)
 * 
 * Deploy as: Viewer Request function in CloudFront (PR preview distribution only)
 */

function handler(event) {
    var request = event.request;
    var headers = request.headers;
    var uri = request.uri;
    
    // Extract PR number from Host header
    // Expecting format: pr-{number}.dev.6v.allison.la
    var host = headers.host ? headers.host.value : '';
    var prMatch = host.match(/^pr-(\d+)\.dev\.6v\.allison\.la$/);
    
    if (prMatch) {
        var prNumber = prMatch[1];
        
        // Don't modify if already has PR prefix
        if (uri.startsWith('/pr-')) {
            return request;
        }
        
        // Handle root path
        if (uri === '/' || uri === '') {
            request.uri = '/pr-' + prNumber + '/index.html';
        } 
        // Handle directory paths
        else if (uri.endsWith('/')) {
            request.uri = '/pr-' + prNumber + uri + 'index.html';
        } 
        // Handle SPA routes (paths without extensions)
        else if (!uri.includes('.')) {
            request.uri = '/pr-' + prNumber + '/index.html';
        } 
        // Handle static assets
        else {
            request.uri = '/pr-' + prNumber + uri;
        }
    }
    
    return request;
}