# AWS Deployment Setup Instructions for 6v-Simulator

## Overview

This guide will walk you through setting up the complete AWS infrastructure for deploying the 6v-simulator with production and PR preview environments.

## Prerequisites

- AWS Account with administrative access
- AWS CLI installed and configured
- GitHub repository access with ability to add secrets
- Domain name (we'll use 6v-simulator.com in this guide)

## Step-by-Step Setup

### Step 1: Run the Setup Script

First, run the automated setup script to create basic AWS resources:

```bash
cd infrastructure/aws
./setup-infrastructure.sh
```

This script will:
- Create IAM user and policy
- Create S3 buckets
- Configure bucket security
- Create Origin Access Control (OAC)

### Step 2: Create IAM Access Keys

After the script completes, create access keys for the deployment user:

```bash
aws iam create-access-key --user-name 6v-simulator-deploy
```

**IMPORTANT**: Save these credentials securely! You'll need them for GitHub Secrets.

Output will look like:
```json
{
    "AccessKey": {
        "AccessKeyId": "AKIA...",
        "SecretAccessKey": "...",
        "Status": "Active"
    }
}
```

### Step 3: Request SSL Certificates in ACM

#### Production Certificate

1. Go to AWS Certificate Manager in the AWS Console
2. Click "Request a certificate"
3. Choose "Request a public certificate"
4. Add domain names:
   - `6v-simulator.com`
   - `www.6v-simulator.com`
5. Choose DNS validation
6. Create the certificate
7. Add the DNS validation records to your domain

#### PR Preview Wildcard Certificate

1. Request another certificate
2. Add domain name: `*.preview.6v-simulator.com`
3. Follow the same validation process

**Note**: Certificates must be in us-east-1 region for CloudFront.

### Step 4: Create CloudFront Functions

#### Create Index Rewrite Function

1. Go to CloudFront → Functions in AWS Console
2. Click "Create function"
3. Name: `6v-simulator-index-rewrite`
4. Copy the code from `cloudfront-index-rewrite.js`
5. Click "Save changes"
6. Test the function:
   - Event type: Viewer Request
   - Test with URI: `/` (should return `/index.html`)
7. Publish the function

#### Create PR Router Function

1. Create another function
2. Name: `6v-simulator-pr-router`
3. Copy the code from `pr-preview-router.js`
4. Save and test:
   - Add Host header: `pr-123.preview.6v-simulator.com`
   - Test with URI: `/` (should return `/pr-123/index.html`)
5. Publish the function

### Step 5: Create CloudFront Distributions

#### Production Distribution

1. Go to CloudFront → Distributions
2. Click "Create distribution"
3. Configure:

**Origin Settings:**
- Origin domain: `6v-simulator-production.s3.amazonaws.com`
- Origin path: Leave empty
- Name: `S3-6v-simulator-production`
- S3 bucket access: Yes, use OAC
- Origin access control: Select the production OAC created earlier
- Create/Update bucket policy: Yes

**Default Cache Behavior:**
- Viewer protocol policy: Redirect HTTP to HTTPS
- Allowed HTTP methods: GET, HEAD
- Cache policy: CachingOptimized
- Origin request policy: None
- Response headers policy: None

**Function associations:**
- Viewer request: `6v-simulator-index-rewrite`

**Settings:**
- Price class: Use only North America and Europe
- Alternate domain names: 
  - `6v-simulator.com`
  - `www.6v-simulator.com`
- Custom SSL certificate: Select your production certificate
- Default root object: `index.html`

**Error Pages:**
- 403 → `/index.html` (200 response)
- 404 → `/404.html` (404 response)

4. Create the distribution
5. Note the Distribution ID (you'll need this for GitHub Secrets)

#### PR Preview Distribution

1. Create another distribution
2. Configure:

**Origin Settings:**
- Origin domain: `6v-simulator-pr-previews.s3.amazonaws.com`
- S3 bucket access: Yes, use OAC
- Origin access control: Select the PR preview OAC

**Default Cache Behavior:**
- Viewer protocol policy: Redirect HTTP to HTTPS
- Cache policy: CachingDisabled (for fresh content)

**Function associations:**
- Viewer request: `6v-simulator-pr-router`

**Response Headers:**
Create a custom response headers policy with:
- X-Robots-Tag: `noindex, nofollow, noarchive`
- Cache-Control: `private, no-cache, no-store`

**Settings:**
- Alternate domain names: `*.preview.6v-simulator.com`
- Custom SSL certificate: Select your wildcard certificate

3. Create the distribution
4. Note the Distribution ID

### Step 6: Update S3 Bucket Policies

#### Production Bucket Policy

1. Get your production distribution ARN:
```bash
aws cloudfront get-distribution --id YOUR_DIST_ID --query 'Distribution.ARN' --output text
```

2. Update `s3-bucket-policy-production.json`:
   - Replace `YOUR_ACCOUNT_ID` with your AWS account ID
   - Replace `YOUR_PRODUCTION_DISTRIBUTION_ID` with the distribution ID

3. Apply the policy:
```bash
aws s3api put-bucket-policy \
  --bucket 6v-simulator-production \
  --policy file://s3-bucket-policy-production.json
```

#### PR Preview Bucket Policy

1. Update `s3-bucket-policy-preview.json` similarly
2. Apply the policy:
```bash
aws s3api put-bucket-policy \
  --bucket 6v-simulator-pr-previews \
  --policy file://s3-bucket-policy-preview.json
```

### Step 7: Configure DNS

Add these DNS records to your domain:

#### Production Records
- Type: A/ALIAS
- Name: `6v-simulator.com`
- Value: Your production CloudFront distribution domain

- Type: CNAME
- Name: `www`
- Value: Your production CloudFront distribution domain

#### PR Preview Records
- Type: CNAME
- Name: `*.preview`
- Value: Your PR preview CloudFront distribution domain

### Step 8: Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Value |
|------------|-------|
| AWS_ACCESS_KEY_ID | From Step 2 |
| AWS_SECRET_ACCESS_KEY | From Step 2 |
| S3_BUCKET_NAME | `6v-simulator-production` |
| CLOUDFRONT_DISTRIBUTION_ID | Production distribution ID |
| PR_PREVIEW_BUCKET_NAME | `6v-simulator-pr-previews` |
| PR_PREVIEW_DISTRIBUTION_ID | PR preview distribution ID |

### Step 9: Test the Deployment

#### Test Production Deployment

1. Make a small change on the main branch
2. Push to trigger the workflow
3. Check GitHub Actions for the workflow status
4. Visit https://6v-simulator.com to verify

#### Test PR Preview

1. Create a new branch
2. Make a change
3. Create a pull request
4. Wait for the PR comment with the preview URL
5. Visit the preview URL (e.g., https://pr-1.preview.6v-simulator.com)

#### Test Cleanup

1. Close the pull request
2. Verify the cleanup workflow runs
3. Check that the preview URL returns 404

## Troubleshooting

### CloudFront Distribution Not Working

- Wait 15-30 minutes for distribution to fully deploy
- Check the distribution status in AWS Console
- Verify the S3 bucket policy is correct
- Check CloudFront function associations

### Preview URLs Not Resolving

- Verify DNS wildcard record is set correctly
- Check that the certificate includes `*.preview.6v-simulator.com`
- Test with: `dig pr-1.preview.6v-simulator.com`

### GitHub Actions Failing

- Check AWS credentials are correct in GitHub Secrets
- Verify IAM user has necessary permissions
- Check workflow logs for specific errors

### SEO Protection Not Working

- Verify response headers: `curl -I https://pr-1.preview.6v-simulator.com`
- Check robots.txt is being created: `curl https://pr-1.preview.6v-simulator.com/robots.txt`
- Ensure CloudFront headers policy is attached

## Cost Optimization Tips

1. **Use CloudFront Caching**: Proper cache headers reduce S3 requests
2. **Set Lifecycle Policies**: Auto-delete old PR previews after 30 days
3. **Monitor Usage**: Set up billing alerts in AWS
4. **Choose Appropriate Price Class**: Use only required regions

## Security Best Practices

1. **Never commit AWS credentials**
2. **Use least privilege IAM policies**
3. **Keep buckets private** (no public access)
4. **Use Origin Access Control** (not Origin Access Identity)
5. **Enable CloudFront logging** for audit trails
6. **Rotate access keys regularly**

## Maintenance

### Updating CloudFront Functions

1. Edit function in CloudFront console
2. Test changes thoroughly
3. Publish new version
4. Functions update immediately (no invalidation needed)

### Monitoring Deployments

Check deployment status:
```bash
# List recent GitHub Actions runs
gh run list --limit 5

# View S3 bucket contents
aws s3 ls s3://6v-simulator-production/

# Check CloudFront invalidations
aws cloudfront list-invalidations --distribution-id YOUR_DIST_ID
```

### Cleaning Up Old PR Previews

Manual cleanup if needed:
```bash
# List all PR preview directories
aws s3 ls s3://6v-simulator-pr-previews/

# Delete specific PR preview
aws s3 rm s3://6v-simulator-pr-previews/pr-123/ --recursive
```

## Support

If you encounter issues:

1. Check the [GitHub Actions logs](../../.github/workflows/)
2. Review AWS CloudWatch logs
3. Verify all secrets are set correctly
4. Ensure DNS has propagated (can take up to 48 hours)

## Next Steps

After successful setup:

1. Test the complete deployment pipeline
2. Set up monitoring and alerts
3. Document your specific configuration
4. Consider implementing staging environment
5. Plan for disaster recovery

---

**Estimated Setup Time**: 2-3 hours (including DNS propagation wait time)

**Monthly Cost Estimate**: $20-80 depending on traffic