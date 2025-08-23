#!/bin/bash

# Setup script for 6v-simulator AWS infrastructure
# This script creates the necessary S3 buckets, CloudFront distributions, and IAM resources

set -e

echo "======================================"
echo "6v-Simulator AWS Infrastructure Setup"
echo "======================================"
echo ""

# Configuration
PROD_BUCKET="6v-simulator-prod"
PREVIEW_BUCKET="6v-simulator-previews"
REGION="us-east-1"
IAM_USER="6v-simulator-deploy"
POLICY_NAME="6v-simulator-deploy-policy"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS credentials not configured. Please configure them first.${NC}"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}Using AWS Account: ${ACCOUNT_ID}${NC}"
echo ""

# Function to create S3 bucket
create_s3_bucket() {
    local bucket_name=$1
    local purpose=$2
    
    echo -e "${YELLOW}Creating S3 bucket: ${bucket_name}${NC}"
    
    if aws s3api head-bucket --bucket "$bucket_name" 2>/dev/null; then
        echo -e "${GREEN}Bucket ${bucket_name} already exists${NC}"
    else
        aws s3api create-bucket \
            --bucket "$bucket_name" \
            --region "$REGION" \
            --acl private
        
        # Block all public access
        aws s3api put-public-access-block \
            --bucket "$bucket_name" \
            --public-access-block-configuration \
            "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
        
        echo -e "${GREEN}✓ Bucket ${bucket_name} created successfully${NC}"
    fi
}

# Function to create Origin Access Control
create_oac() {
    local name=$1
    local description=$2
    
    echo -e "${YELLOW}Creating Origin Access Control: ${name}${NC}"
    
    OAC_ID=$(aws cloudfront create-origin-access-control \
        --origin-access-control-config \
        Name="$name",\
Description="$description",\
SigningProtocol="sigv4",\
SigningBehavior="always",\
OriginAccessControlOriginType="s3" \
        --query 'OriginAccessControl.Id' \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$OAC_ID" ]; then
        # OAC might already exist, try to list and find it
        OAC_ID=$(aws cloudfront list-origin-access-controls \
            --query "OriginAccessControlList.Items[?Name=='$name'].Id | [0]" \
            --output text)
    fi
    
    echo -e "${GREEN}✓ OAC ID: ${OAC_ID}${NC}"
    echo "$OAC_ID"
}

# Function to create CloudFront Function
create_cf_function() {
    local name=$1
    local file=$2
    local comment=$3
    
    echo -e "${YELLOW}Creating CloudFront Function: ${name}${NC}"
    
    # Check if function exists
    FUNCTION_EXISTS=$(aws cloudfront list-functions \
        --query "FunctionList.Items[?Name=='$name'].Name | [0]" \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$FUNCTION_EXISTS" ]; then
        echo -e "${GREEN}Function ${name} already exists${NC}"
    else
        # Read function code
        FUNCTION_CODE=$(cat "$file")
        
        # Create function
        aws cloudfront create-function \
            --name "$name" \
            --function-config Comment="$comment",Runtime="cloudfront-js-2.0" \
            --function-code "$FUNCTION_CODE" \
            --output text
        
        # Publish function
        ETAG=$(aws cloudfront describe-function \
            --name "$name" \
            --query 'ETag' \
            --output text)
        
        aws cloudfront publish-function \
            --name "$name" \
            --if-match "$ETAG" \
            --output text
        
        echo -e "${GREEN}✓ Function ${name} created and published${NC}"
    fi
}

# Step 1: Create IAM Policy
echo -e "${YELLOW}Step 1: Creating IAM Policy${NC}"
if aws iam get-policy --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}" 2>/dev/null; then
    echo -e "${GREEN}Policy ${POLICY_NAME} already exists${NC}"
else
    # Update policy JSON with actual account ID
    sed "s/ACCOUNT_ID/${ACCOUNT_ID}/g" iam-deploy-policy.json > /tmp/iam-policy-temp.json
    
    aws iam create-policy \
        --policy-name "$POLICY_NAME" \
        --policy-document file:///tmp/iam-policy-temp.json \
        --description "Deployment policy for 6v-simulator CI/CD" \
        --output text
    
    echo -e "${GREEN}✓ IAM policy created${NC}"
fi
echo ""

# Step 2: Create IAM User
echo -e "${YELLOW}Step 2: Creating IAM User${NC}"
if aws iam get-user --user-name "$IAM_USER" 2>/dev/null; then
    echo -e "${GREEN}User ${IAM_USER} already exists${NC}"
else
    aws iam create-user --user-name "$IAM_USER" --output text
    echo -e "${GREEN}✓ IAM user created${NC}"
fi

# Attach policy to user
aws iam attach-user-policy \
    --user-name "$IAM_USER" \
    --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"
echo -e "${GREEN}✓ Policy attached to user${NC}"
echo ""

# Step 3: Create S3 Buckets
echo -e "${YELLOW}Step 3: Creating S3 Buckets${NC}"
create_s3_bucket "$PROD_BUCKET" "production"
create_s3_bucket "$PREVIEW_BUCKET" "PR previews"
echo ""

# Step 4: Create Origin Access Controls
echo -e "${YELLOW}Step 4: Creating Origin Access Controls${NC}"
PROD_OAC_ID=$(create_oac "6v-simulator-prod-oac" "OAC for 6v-simulator production")
PREVIEW_OAC_ID=$(create_oac "6v-simulator-preview-oac" "OAC for 6v-simulator PR previews")
echo ""

# Step 5: Create CloudFront Functions
echo -e "${YELLOW}Step 5: Creating CloudFront Functions${NC}"
create_cf_function "6v-index-rewrite" "cloudfront-index-rewrite.js" "Index rewrite for 6v-simulator"
create_cf_function "6v-pr-router" "pr-preview-router.js" "PR preview router for 6v-simulator"
echo ""

# Step 6: Create CloudFront Distributions
echo -e "${YELLOW}Step 6: Creating CloudFront Distributions${NC}"
echo "This step requires manual configuration in AWS Console for now."
echo "Please create two CloudFront distributions with these settings:"
echo ""
echo "Production Distribution:"
echo "  - Origin: ${PROD_BUCKET}.s3.${REGION}.amazonaws.com"
echo "  - Origin Access: Use OAC ID: ${PROD_OAC_ID}"
echo "  - Viewer Request Function: 6v-index-rewrite"
echo "  - Compress: Yes"
echo "  - Cache Policy: Managed-CachingOptimized"
echo ""
echo "Preview Distribution:"
echo "  - Origin: ${PREVIEW_BUCKET}.s3.${REGION}.amazonaws.com"
echo "  - Origin Access: Use OAC ID: ${PREVIEW_OAC_ID}"
echo "  - Viewer Request Function: 6v-pr-router"
echo "  - Compress: Yes"
echo "  - Cache Policy: Managed-CachingDisabled (for development)"
echo ""

# Step 7: Generate Access Keys
echo -e "${YELLOW}Step 7: Generating Access Keys${NC}"
echo -e "${RED}⚠️  IMPORTANT: Save these credentials immediately!${NC}"
echo ""
read -p "Press Enter to generate access keys for ${IAM_USER}..."

ACCESS_KEY_OUTPUT=$(aws iam create-access-key --user-name "$IAM_USER" --output json)
ACCESS_KEY_ID=$(echo "$ACCESS_KEY_OUTPUT" | jq -r '.AccessKey.AccessKeyId')
SECRET_ACCESS_KEY=$(echo "$ACCESS_KEY_OUTPUT" | jq -r '.AccessKey.SecretAccessKey')

echo ""
echo "======================================"
echo "SAVE THESE CREDENTIALS SECURELY"
echo "======================================"
echo "AWS_ACCESS_KEY_ID=${ACCESS_KEY_ID}"
echo "AWS_SECRET_ACCESS_KEY=${SECRET_ACCESS_KEY}"
echo "======================================"
echo ""

# Step 8: Instructions for GitHub Secrets
echo -e "${YELLOW}Step 8: Configure GitHub Secrets${NC}"
echo "Add these secrets to your GitHub repository:"
echo "  1. Go to: https://github.com/YOUR_ORG/6v-simulator/settings/secrets/actions"
echo "  2. Add the following secrets:"
echo "     - AWS_ACCESS_KEY_ID: ${ACCESS_KEY_ID}"
echo "     - AWS_SECRET_ACCESS_KEY: (use the value shown above)"
echo "     - S3_BUCKET_NAME: ${PROD_BUCKET}"
echo "     - CLOUDFRONT_DISTRIBUTION_ID: (get from CloudFront console after creation)"
echo "     - PR_PREVIEW_BUCKET_NAME: ${PREVIEW_BUCKET}"
echo "     - PR_PREVIEW_DISTRIBUTION_ID: (get from CloudFront console after creation)"
echo ""

# Step 9: Update S3 Bucket Policies
echo -e "${YELLOW}Step 9: Next Steps${NC}"
echo "After creating CloudFront distributions:"
echo "  1. Update ${PROD_BUCKET} bucket policy with the production distribution ARN"
echo "  2. Update ${PREVIEW_BUCKET} bucket policy with the preview distribution ARN"
echo "  3. Test deployment with: git push origin main"
echo ""

echo -e "${GREEN}✅ Infrastructure setup partially complete!${NC}"
echo "Please complete the manual steps for CloudFront distributions."