# Deployment Guide for 6v-simulator

## Security Notice

**NEVER commit AWS credentials to git!** All AWS credentials should be stored securely using one of the methods below.

## Prerequisites

1. AWS CLI installed (`brew install awscli` on macOS)
2. Node.js and npm installed
3. AWS IAM user with S3 permissions for the deployment bucket

## Initial Setup

### Option 1: Use AWS CLI Profile (Recommended)

1. Run the setup script to create a dedicated AWS profile:
   ```bash
   ./scripts/setup-aws-profile.sh
   ```

2. Enter your AWS credentials when prompted
   - These should be from GitHub secrets or a dedicated IAM user
   - The script will create a profile named `6v-simulator`

3. The profile will be automatically used for deployments

### Option 2: Use Default AWS Profile

1. Configure AWS CLI with your credentials:
   ```bash
   aws configure
   ```

2. Enter your AWS Access Key ID and Secret Access Key

### Option 3: Use Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your credentials:
   ```bash
   AWS_ACCESS_KEY_ID=your_access_key_here
   AWS_SECRET_ACCESS_KEY=your_secret_key_here
   ```

## Deployment Commands

### From the client directory:

```bash
cd client

# Build and deploy to S3
npm run deploy

# Dry run (preview what will be deployed)
npm run deploy:dry
```

### From the project root:

```bash
# Build the application
cd client && npm run build && cd ..

# Deploy to S3
./scripts/deploy-to-s3.sh
```

## GitHub Actions Deployment

The project uses GitHub Actions for automated deployments. AWS credentials are stored as GitHub secrets:

- `AWS_ACCESS_KEY_ID` - IAM user access key
- `AWS_SECRET_ACCESS_KEY` - IAM user secret key

These are automatically used by the deployment workflows.

## Security Best Practices

1. **Rotate credentials regularly** - If credentials are exposed, rotate them immediately
2. **Use IAM roles in production** - For EC2 or ECS deployments, use IAM roles instead of keys
3. **Limit permissions** - IAM users should have minimal required permissions
4. **Never commit `.env.local`** - This file is gitignored and should never be committed
5. **Use GitHub secrets** - For CI/CD, always use GitHub secrets or similar secure storage

## Troubleshooting

### AWS Credentials Not Found

If you see "AWS credentials not configured", try:

1. Check if AWS CLI is installed: `aws --version`
2. Verify credentials: `aws sts get-caller-identity`
3. If using a profile: `aws sts get-caller-identity --profile 6v-simulator`

### Permission Denied

Ensure your IAM user has the following permissions:
- `s3:PutObject`
- `s3:GetObject`
- `s3:DeleteObject`
- `s3:ListBucket`
- `s3:GetBucketLocation`

### Build Failures

1. Clear node_modules: `rm -rf node_modules && npm install`
2. Check Node version: `node --version` (should be 20+)
3. Run build locally: `npm run build`

## Bucket Configuration

The default S3 bucket is configured in `.env.local`:
- Bucket: `6v-allison-la-production`
- Region: `us-east-1`
- Domain: `https://6v.allison.la`

## Cache Configuration

The deployment script sets appropriate cache headers:
- Static assets (JS, CSS): 1 year cache
- HTML files: 1 hour cache
- JSON files: No cache

This ensures users get updates while maintaining good performance.