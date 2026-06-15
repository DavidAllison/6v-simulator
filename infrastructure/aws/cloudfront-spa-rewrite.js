/**
 * CloudFront Function — SPA rewrite for the production distribution
 * (E1537G5KX38T5H, 6v.allison.la).
 *
 * Lets the private S3 origin be served via the REST endpoint + OAC by:
 *   1. mapping `/` to `/index.html`,
 *   2. appending `index.html` to directory URIs, and
 *   3. routing extension-less paths to `/index.html` so the client-side
 *      router (react-router) can handle them.
 *
 * Deploy as a Viewer Request function on the production distribution.
 */
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri === '/' || uri === '') {
    request.uri = '/index.html';
    return request;
  }

  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!uri.includes('.')) {
    // No file extension → SPA route; serve the app shell.
    request.uri = '/index.html';
  }

  return request;
}
