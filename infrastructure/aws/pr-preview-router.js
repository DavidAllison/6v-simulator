/**
 * CloudFront Function — PR-preview router for the preview distribution
 * (E1DZ4HUUOSPRK5, *.dev.6v.allison.la).
 *
 * Each PR's build is synced to `s3://6v-simulator-pr-previews/pr-<N>/`. This
 * function reads the `pr-<N>.dev.6v.allison.la` Host header and rewrites the
 * request URI into that per-PR S3 prefix, with SPA fallback to the PR's
 * index.html.
 *
 * Deploy as a Viewer Request function on the preview distribution only.
 */
function handler(event) {
  var request = event.request;
  var headers = request.headers;
  var uri = request.uri;

  var host = headers.host ? headers.host.value : '';
  var prMatch = host.match(/^pr-(\d+)\.dev\.6v\.allison\.la$/);

  if (prMatch) {
    var prNumber = prMatch[1];

    // Already prefixed — leave it alone.
    if (uri.startsWith('/pr-')) {
      return request;
    }

    if (uri === '/' || uri === '') {
      request.uri = '/pr-' + prNumber + '/index.html';
    } else if (uri.endsWith('/')) {
      request.uri = '/pr-' + prNumber + uri + 'index.html';
    } else if (!uri.includes('.')) {
      // SPA route → app shell for this PR.
      request.uri = '/pr-' + prNumber + '/index.html';
    } else {
      // Static asset.
      request.uri = '/pr-' + prNumber + uri;
    }
  }

  return request;
}
