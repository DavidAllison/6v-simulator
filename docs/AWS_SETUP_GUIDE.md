# AWS Setup Guide for 6v-Simulator

This guide walks through setting up AWS S3 and CloudFront for hosting the 6v-simulator application with automated deployments and PR previews.

## Prerequisites

- AWS Account with administrative access
- AWS CLI installed and configured
- GitHub repository with Actions enabled
- Node.js 20+ installed locally

## Quick Start

For automated setup, use the provided script:
```bash
cd infrastructure/aws
chmod +x setup-aws-infrastructure.sh
./setup-aws-infrastructure.sh
```

## Manual Setup Steps

### Step 1: Create IAM User and Policy

1. **Create IAM Policy**
   ```bash
   aws iam create-policy \
     --policy-name 6v-simulator-deploy-policy \
     --policy-document file://infrastructure/aws/iam-deploy-policy.json
   ```

2. **Create IAM User**
   ```bash
   aws iam create-user --user-name 6v-simulator-deploy
   ```

3. **Attach Policy to User**
   ```bash
   aws iam attach-user-policy \
     --user-name 6v-simulator-deploy \
     --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/6v-simulator-deploy-policy
   ```

4. **Generate Access Keys**
   ```bash
   aws iam create-access-key --user-name 6v-simulator-deploy
   ```
   Save the AccessKeyId and SecretAccessKey securely!

### Step 2: Create S3 Buckets

1. **Production Bucket**
   ```bash
   # Create bucket
   aws s3api create-bucket \
     --bucket 6v-simulator-prod \
     --region us-east-1
   
   # Block public access
   aws s3api put-public-access-block \
     --bucket 6v-simulator-prod \
     --public-access-block-configuration \
     "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
   ```

2. **PR Preview Bucket**
   ```bash
   # Create bucket
   aws s3api create-bucket \
     --bucket 6v-simulator-previews \
     --region us-east-1
   
   # Block public access
   aws s3api put-public-access-block \
     --bucket 6v-simulator-previews \
     --public-access-block-configuration \
     "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
   ```

### Step 3: Create Origin Access Control (OAC)

```bash
# Production OAC
aws cloudfront create-origin-access-control \
  --origin-access-control-config \
  Name="6v-simulator-prod-oac",\
Description="OAC for 6v-simulator production",\
SigningProtocol="sigv4",\
SigningBehavior="always",\
OriginAccessControlOriginType="s3"

# Preview OAC
aws cloudfront create-origin-access-control \
  --origin-access-control-config \
  Name="6v-simulator-preview-oac",\
Description="OAC for 6v-simulator PR previews",\
SigningProtocol="sigv4",\
SigningBehavior="always",\
OriginAccessControlOriginType="s3"
```

Save the OAC IDs for the next step!

### Step 4: Create CloudFront Functions

1. **Create Index Rewrite Function**
   ```bash
   aws cloudfront create-function \
     --name 6v-index-rewrite \
     --function-config Comment="Index rewrite for 6v-simulator",Runtime="cloudfront-js-2.0" \
     --function-code fileb://infrastructure/aws/cloudfront-index-rewrite.js
   
   # Publish the function
   ETAG=$(aws cloudfront describe-function --name 6v-index-rewrite --query 'ETag' --output text)
   aws cloudfront publish-function --name 6v-index-rewrite --if-match "$ETAG"
   ```

2. **Create PR Router Function**
   ```bash
   aws cloudfront create-function \
     --name 6v-pr-router \
     --function-config Comment="PR router for 6v-simulator",Runtime="cloudfront-js-2.0" \
     --function-code fileb://infrastructure/aws/pr-preview-router.js
   
   # Publish the function
   ETAG=$(aws cloudfront describe-function --name 6v-pr-router --query 'ETag' --output text)
   aws cloudfront publish-function --name 6v-pr-router --if-match "$ETAG"
   ```

### Step 5: Create CloudFront Distributions

#### Production Distribution

1. Go to CloudFront Console → Create Distribution
2. Configure:
   - **Origin Domain**: `6v-simulator-prod.s3.us-east-1.amazonaws.com`
   - **Origin Access**: Select the OAC created earlier
   - **Viewer Protocol Policy**: Redirect HTTP to HTTPS
   - **Allowed HTTP Methods**: GET, HEAD
   - **Compress Objects**: Yes
   - **Default Root Object**: index.html
   - **Custom Error Responses**:
     - 403 → /index.html (200)
     - 404 → /index.html (200)

3. Add CloudFront Function:
   - **Viewer Request**: 6v-index-rewrite

4. Create Distribution and note the Distribution ID

#### PR Preview Distribution

1. Create another distribution with:
   - **Origin Domain**: `6v-simulator-previews.s3.us-east-1.amazonaws.com`
   - **Origin Access**: Select the preview OAC
   - Same settings as production, but:
   - **Viewer Request Function**: 6v-pr-router
   - **Cache Policy**: CachingDisabled (for development)

### Step 6: Update S3 Bucket Policies

1. **Production Bucket Policy**
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
             "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_PROD_DISTRIBUTION_ID"
           }
         }
       }
     ]
   }
   ```

2. Apply the policy:
   ```bash
   aws s3api put-bucket-policy \
     --bucket 6v-simulator-prod \
     --policy file://bucket-policy.json
   ```

3. Repeat for the preview bucket with its distribution ID

### Step 7: Configure GitHub Secrets

1. Go to your GitHub repository settings
2. Navigate to Settings → Secrets and variables → Actions
3. Add the following repository secrets:

| Secret Name | Value |
|------------|-------|
| `AWS_ACCESS_KEY_ID` | Your IAM user's access key |
| `AWS_SECRET_ACCESS_KEY` | Your IAM user's secret key |
| `S3_BUCKET_NAME` | `6v-simulator-prod` |
| `CLOUDFRONT_DISTRIBUTION_ID` | Production distribution ID |
| `CLOUDFRONT_DOMAIN` | Production CloudFront domain |
| `PR_PREVIEW_BUCKET_NAME` | `6v-simulator-previews` |
| `PR_PREVIEW_DISTRIBUTION_ID` | Preview distribution ID |

### Step 8: Enable GitHub Actions Workflows

The workflows are already configured in `.github/workflows/`:
- `deploy-aws.yml` - Production deployment on push to main
- `pr-preview.yml` - PR preview deployment
- `pr-cleanup.yml` - PR preview cleanup on close

No additional configuration needed!

### Step 9: Test Deployment

1. **Test Production Deployment**
   ```bash
   git add .
   git commit -m "feat: add AWS deployment"
   git push origin main
   ```
   
   Check GitHub Actions tab for deployment status.

2. **Test PR Preview**
   - Create a new branch
   - Make a change
   - Open a pull request
   - Wait for preview URL in PR comments

## Optional: Custom Domain Setup

### For Production

1. **Request SSL Certificate in ACM** (us-east-1 region)
   ```bash
   aws acm request-certificate \
     --domain-name 6v-simulator.com \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Validate the certificate** by adding DNS records

3. **Update CloudFront Distribution**
   - Add alternate domain names (CNAMEs)
   - Select the ACM certificate

4. **Create Route53 A Record**
   - Type: A
   - Alias: Yes
   - Target: CloudFront distribution

### For PR Previews

1. **Request Wildcard Certificate**
   ```bash
   aws acm request-certificate \
     --domain-name "*.preview.6v-simulator.com" \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Add to Preview CloudFront Distribution**

3. **Create Wildcard DNS Record**
   - Name: `*.preview`
   - Type: CNAME
   - Value: Preview CloudFront domain

## Cost Optimization

### Estimated Monthly Costs
- S3 Storage: ~$0.10-1.00
- S3 Requests: ~$1-5
- CloudFront: ~$5-20
- **Total**: ~$10-30 for moderate traffic

### Cost Saving Tips

1. **Set S3 Lifecycle Policies** for PR previews:
   ```bash
   aws s3api put-bucket-lifecycle-configuration \
     --bucket 6v-simulator-previews \
     --lifecycle-configuration '{
       "Rules": [{
         "Id": "DeleteOldPreviews",
         "Status": "Enabled",
         "Expiration": {
           "Days": 30
         },
         "Filter": {
           "Prefix": "pr-"
         }
       }]
     }'
   ```

2. **Use CloudFront Price Class 100** (US, Canada, Europe only) for lower costs

3. **Configure appropriate cache headers** to reduce origin requests

## Monitoring

### CloudWatch Metrics

Monitor these key metrics:
- CloudFront: Requests, BytesDownloaded, 4xxErrorRate, 5xxErrorRate
- S3: BucketSizeBytes, NumberOfObjects, AllRequests

### Set Up Alarms

```bash
# High error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "6v-simulator-high-error-rate" \
  --alarm-description "Alert when 4xx errors exceed 10%" \
  --metric-name 4xxErrorRate \
  --namespace AWS/CloudFront \
  --statistic Average \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

## Troubleshooting

### Common Issues

1. **403 Forbidden**
   - Check S3 bucket policy includes CloudFront distribution ARN
   - Verify OAC is properly configured
   - Ensure CloudFront function is attached

2. **Deployment Fails**
   - Check GitHub Actions logs
   - Verify AWS credentials in GitHub Secrets
   - Ensure IAM policy has required permissions

3. **PR Preview Not Loading**
   - Wait for CloudFront propagation (up to 10 minutes)
   - Check S3 path structure (`/pr-{number}/`)
   - Verify PR router function logic

4. **Cache Not Updating**
   - Verify CloudFront invalidation completed
   - Check cache-control headers
   - Clear browser cache

### Debug Commands

```bash
# Check S3 bucket contents
aws s3 ls s3://6v-simulator-prod/

# View CloudFront distribution status
aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID

# Check recent invalidations
aws cloudfront list-invalidations --distribution-id YOUR_DISTRIBUTION_ID

# View S3 bucket policy
aws s3api get-bucket-policy --bucket 6v-simulator-prod

# Test CloudFront function
aws cloudfront test-function \
  --name 6v-index-rewrite \
  --event-object '{"request":{"uri":"/about"}}'
```

## Security Best Practices

1. **Rotate Access Keys Regularly**
   ```bash
   aws iam create-access-key --user-name 6v-simulator-deploy
   # Update GitHub Secrets
   aws iam delete-access-key --user-name 6v-simulator-deploy --access-key-id OLD_KEY_ID
   ```

2. **Enable S3 Versioning** (optional)
   ```bash
   aws s3api put-bucket-versioning \
     --bucket 6v-simulator-prod \
     --versioning-configuration Status=Enabled
   ```

3. **Enable CloudTrail** for audit logging

4. **Use AWS Systems Manager Parameter Store** instead of GitHub Secrets for sensitive data (advanced)

## Next Steps

- [ ] Complete AWS infrastructure setup
- [ ] Configure GitHub Secrets
- [ ] Test production deployment
- [ ] Test PR preview system
- [ ] Set up custom domain (optional)
- [ ] Configure monitoring and alerts
- [ ] Document any custom configurations

## Support

For issues or questions:
1. Check GitHub Actions logs for deployment errors
2. Review CloudFront and S3 metrics in AWS Console
3. Consult AWS documentation for specific service issues
4. Open an issue in the repository for application-specific problems