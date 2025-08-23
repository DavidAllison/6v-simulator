# AWS Infrastructure for 6v-simulator

## Overview
This project uses AWS S3 + CloudFront for hosting the production site and PR previews.

## Resources

### Production Environment
- **Domain**: https://6v.allison.la
- **S3 Bucket**: 6v-allison-la-production
- **CloudFront Distribution**: E2IKQX5MGWHUY5
- **CloudFront Function**: 6v-index-rewrite (SPA routing)

### PR Preview Environment
- **Domain Pattern**: https://pr-{number}.dev.6v.allison.la
- **S3 Bucket**: 6v-allison-la-pr-previews
- **CloudFront Distribution**: EPI8WZV5IATZQ
- **CloudFront Function**: 6v-pr-preview-router (PR routing)

### DNS
- **Hosted Zone**: allison.la (Z0358877108B22OGXZBUD)
- **Production Record**: 6v.allison.la → CloudFront
- **Preview Wildcard**: *.dev.6v.allison.la → CloudFront

### SSL Certificates
- **Certificate ARN**: arn:aws:acm:us-east-1:517311508324:certificate/5370020c-71a8-4ca3-9d12-4740d8074682
- **Domains**: 6v.allison.la, *.dev.6v.allison.la

## GitHub Secrets Required

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY

# S3 Buckets
AWS_S3_BUCKET_PRODUCTION=6v-allison-la-production
AWS_S3_BUCKET_PR_PREVIEWS=6v-allison-la-pr-previews

# CloudFront Distributions
AWS_CLOUDFRONT_DISTRIBUTION_ID=E2IKQX5MGWHUY5
AWS_CLOUDFRONT_DISTRIBUTION_PR=EPI8WZV5IATZQ
```

## IAM Policy

The minimal IAM policy required for deployments is in `iam-deployment-policy.json`.

## Deployment Workflows

1. **Production Deployment** (`.github/workflows/deploy-production.yml`)
   - Triggers on push to main branch
   - Builds and deploys to production S3 bucket
   - Invalidates CloudFront cache

2. **PR Preview Deployment** (`.github/workflows/pr-preview-deploy.yml`)
   - Triggers on PR open/update
   - Deploys to PR-specific path in preview bucket
   - Comments PR with preview URL
   - Includes SEO protection (noindex)

3. **PR Preview Cleanup** (`.github/workflows/pr-preview-cleanup.yml`)
   - Triggers on PR close
   - Removes PR preview files from S3
   - Invalidates CloudFront cache

## Manual Deployment

```bash
# Build the project
cd client
npm run build

# Deploy to production
aws s3 sync ./dist s3://6v-allison-la-production --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E2IKQX5MGWHUY5 \
  --paths "/*"
```

## Testing

After deployment, verify the site is accessible at:
- Production: https://6v.allison.la
- PR Preview: https://pr-{number}.dev.6v.allison.la# Trigger rebuild
