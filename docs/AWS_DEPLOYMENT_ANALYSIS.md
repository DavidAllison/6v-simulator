# AWS S3 + CloudFront Deployment System Analysis
## Based on MCS Marketing Site Implementation

This document provides a comprehensive analysis of the deployment system used by the MCS marketing site project, which can be replicated for the 6v-simulator project with appropriate modifications.

## System Architecture Overview

The MCS deployment system implements a modern static site hosting architecture using:
- **Amazon S3** for static file storage
- **Amazon CloudFront** for global CDN distribution
- **GitHub Actions** for CI/CD automation
- **Origin Access Control (OAC)** for secure S3 access
- **CloudFront Functions** for URL rewriting
- **Route53** for DNS management (optional)

### Key Features
1. **Production deployment** on push to main branch
2. **PR preview system** with isolated deployments per pull request
3. **Automatic cleanup** when PRs are closed
4. **SEO protection** for preview environments
5. **Zero-downtime deployments** with cache invalidation

## 1. Infrastructure Components

### Production Environment

#### S3 Bucket Configuration
- **Bucket Name**: `mcs-marketing-site` (for 6v: suggest `6v-simulator-prod`)
- **Region**: us-east-1 (recommended for CloudFront integration)
- **Access**: Private (no public access)
- **Static Website Hosting**: Disabled (using S3 REST API endpoint)
- **Versioning**: Optional but recommended
- **Bucket Policy**: Allows CloudFront-only access via OAC

#### CloudFront Distribution
- **Distribution ID**: Unique per distribution
- **Origin**: S3 bucket with Origin Access Control
- **Origin Access Control**: Replaces legacy OAI for better security
- **Default Root Object**: `index.html`
- **Error Pages**: 
  - 403 → /index.html (200) for SPA routing
  - 404 → /404.html (404) or /index.html (200)
- **Caching**: 
  - Default TTL: 86400 seconds (24 hours)
  - Max TTL: 31536000 seconds (1 year)
  - Compression: Enabled
- **Viewer Protocol Policy**: Redirect HTTP to HTTPS

### PR Preview Environment

#### Dedicated S3 Bucket
- **Bucket Name**: `mcs-pr-previews` (for 6v: suggest `6v-simulator-previews`)
- **Structure**: `/pr-{number}/` subdirectories for each PR
- **Access**: Private with CloudFront-only access

#### Dedicated CloudFront Distribution
- **Separate from production** to prevent interference
- **Wildcard domain**: `*.dev.domain.com` for PR subdomains
- **Custom CloudFront Function** for PR routing

## 2. GitHub Actions Workflows

### Production Deployment (`deploy.yml`)

```yaml
name: Deploy to S3 and CloudFront

on:
  push:
    branches:
      - main
      - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy to S3
        run: |
          aws s3 sync ./dist s3://${{ secrets.S3_BUCKET_NAME }} \
            --delete \
            --cache-control "public, max-age=31536000" \
            --exclude "index.html" \
            --exclude "*.html"
          
          # HTML files with shorter cache
          aws s3 sync ./dist s3://${{ secrets.S3_BUCKET_NAME }} \
            --delete \
            --cache-control "public, max-age=3600" \
            --exclude "*" \
            --include "*.html"

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

### PR Preview Deployment (`pr-preview.yml`)

```yaml
name: PR Preview Deployment

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      id-token: write

    steps:
      # ... (checkout, setup, build steps)
      
      - name: Build with PR-specific config
        run: npm run build
        env:
          PUBLIC_BASE_URL: https://pr-${{ github.event.pull_request.number }}.preview.domain.com
          IS_PR_PREVIEW: 'true'

      - name: Deploy to S3 preview path
        run: |
          aws s3 sync ./dist/ s3://${{ secrets.PR_PREVIEW_BUCKET }}/pr-${{ github.event.pull_request.number }}/ \
            --delete \
            --cache-control "public, max-age=3600"

      - name: Comment PR with preview URL
        uses: actions/github-script@v7
        # ... (PR comment logic)
```

### PR Cleanup (`pr-cleanup.yml`)

```yaml
name: PR Preview Cleanup

on:
  pull_request:
    types: [closed]

jobs:
  cleanup-preview:
    runs-on: ubuntu-latest
    
    steps:
      - name: Delete preview from S3
        run: |
          aws s3 rm s3://${{ secrets.PR_PREVIEW_BUCKET }}/pr-${{ github.event.pull_request.number }}/ --recursive
      
      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.PR_PREVIEW_DISTRIBUTION_ID }} \
            --paths "/pr-${{ github.event.pull_request.number }}/*"
```

## 3. AWS IAM Policies

### Minimal Deployment Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3BucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::6v-simulator-*"
      ]
    },
    {
      "Sid": "S3ObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:PutObjectAcl"
      ],
      "Resource": [
        "arn:aws:s3:::6v-simulator-*/*"
      ]
    },
    {
      "Sid": "CloudFrontInvalidation",
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation",
        "cloudfront:ListInvalidations"
      ],
      "Resource": "*"
    }
  ]
}
```

### S3 Bucket Policy (OAC Access)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalReadOnly",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::6v-simulator-prod/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

## 4. CloudFront Functions

### Index Rewrite Function (for SPA routing)

```javascript
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Handle root
    if (uri === '/' || uri === '') {
        request.uri = '/index.html';
        return request;
    }
    
    // Handle directories
    if (uri.endsWith('/')) {
        request.uri += 'index.html';
    }
    // Handle paths without extensions (SPA routes)
    else if (!uri.includes('.')) {
        request.uri += '/index.html';
    }
    
    return request;
}
```

### PR Preview Router Function

```javascript
function handler(event) {
    var request = event.request;
    var headers = request.headers;
    var uri = request.uri;
    
    // Extract PR number from Host header
    var host = headers.host ? headers.host.value : '';
    var prMatch = host.match(/^pr-(\d+)\.preview\.domain\.com$/);
    
    if (prMatch) {
        var prNumber = prMatch[1];
        // Prepend PR path to URI
        if (!uri.startsWith('/pr-')) {
            request.uri = '/pr-' + prNumber + uri;
        }
    }
    
    return request;
}
```

## 5. Required GitHub Secrets

### Production Deployment
- `AWS_ACCESS_KEY_ID`: IAM user access key
- `AWS_SECRET_ACCESS_KEY`: IAM user secret key
- `S3_BUCKET_NAME`: Production S3 bucket name
- `CLOUDFRONT_DISTRIBUTION_ID`: Production CloudFront ID

### PR Preview System
- `PR_PREVIEW_BUCKET`: Preview S3 bucket name
- `PR_PREVIEW_DISTRIBUTION_ID`: Preview CloudFront ID

## 6. Implementation Steps for 6v-Simulator

### Phase 1: Production Deployment

1. **Create IAM User**
   - Name: `6v-simulator-deploy`
   - Attach minimal deployment policy
   - Generate access keys

2. **Create S3 Bucket**
   ```bash
   aws s3api create-bucket \
     --bucket 6v-simulator-prod \
     --region us-east-1
   
   # Block public access
   aws s3api put-public-access-block \
     --bucket 6v-simulator-prod \
     --public-access-block-configuration \
     "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
   ```

3. **Create Origin Access Control**
   ```bash
   aws cloudfront create-origin-access-control \
     --origin-access-control-config \
     Name="6v-simulator-oac",\
     Description="OAC for 6v-simulator",\
     SigningProtocol="sigv4",\
     SigningBehavior="always",\
     OriginAccessControlOriginType="s3"
   ```

4. **Create CloudFront Distribution**
   - Configure with S3 origin
   - Attach OAC
   - Set up custom error pages
   - Enable compression

5. **Update S3 Bucket Policy**
   - Allow CloudFront OAC access only

6. **Configure GitHub Actions**
   - Add secrets to repository
   - Create `.github/workflows/deploy.yml`

### Phase 2: PR Preview System

1. **Create Preview S3 Bucket**
   ```bash
   aws s3api create-bucket \
     --bucket 6v-simulator-previews \
     --region us-east-1
   ```

2. **Create Preview CloudFront Distribution**
   - Configure for wildcard domain
   - Attach PR router function

3. **Set Up DNS (Optional)**
   - Create wildcard CNAME record
   - Point to CloudFront distribution

4. **Configure Preview Workflows**
   - Create `pr-preview.yml`
   - Create `pr-cleanup.yml`

### Phase 3: Enhancements

1. **SEO Protection for Previews**
   - Add X-Robots-Tag headers
   - Implement response headers policy

2. **Performance Optimization**
   - Configure cache headers by file type
   - Implement CloudFront behaviors for different paths

3. **Monitoring**
   - Set up CloudWatch alarms
   - Configure cost alerts

## 7. Cost Estimates

### Monthly Costs (Estimated)
- **S3 Storage**: ~$0.10-1.00 (depends on size)
- **S3 Requests**: ~$1-5 (depends on traffic)
- **CloudFront**: ~$5-50 (depends on traffic and regions)
- **Data Transfer**: First 1TB free, then $0.085/GB
- **Total**: ~$10-60/month for moderate traffic

## 8. Security Considerations

1. **Access Control**
   - Use OAC instead of OAI for S3 access
   - Keep S3 buckets private
   - Use IAM roles with minimal permissions

2. **HTTPS Enforcement**
   - Redirect all HTTP to HTTPS
   - Use AWS Certificate Manager for SSL

3. **PR Preview Isolation**
   - Separate infrastructure from production
   - Implement SEO protection headers
   - Regular cleanup of old previews

## 9. Troubleshooting Guide

### Common Issues

1. **403 Forbidden Errors**
   - Check S3 bucket policy
   - Verify OAC configuration
   - Ensure CloudFront function is attached

2. **Cache Not Updating**
   - Verify invalidation completed
   - Check cache headers
   - Wait for propagation (up to 10 minutes)

3. **PR Preview Not Working**
   - Check DNS propagation
   - Verify CloudFront function logic
   - Ensure S3 path structure is correct

## 10. Migration Checklist

- [ ] Create AWS account and IAM user
- [ ] Set up S3 buckets (prod and preview)
- [ ] Configure CloudFront distributions
- [ ] Create and test CloudFront functions
- [ ] Set up GitHub secrets
- [ ] Implement GitHub Actions workflows
- [ ] Test production deployment
- [ ] Test PR preview system
- [ ] Configure DNS (optional)
- [ ] Set up monitoring and alerts
- [ ] Document custom configurations

## Conclusion

This deployment system provides a robust, scalable, and cost-effective solution for hosting the 6v-simulator as a static site. The PR preview system enables safe testing of changes before production deployment, while CloudFront ensures fast global delivery of the application.

The implementation can be completed in phases, starting with basic production deployment and adding the PR preview system once the core infrastructure is stable.