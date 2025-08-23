#!/bin/bash

# 6v-simulator AWS Infrastructure Setup Script
# This script helps set up the AWS infrastructure for the 6v-simulator deployment

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration variables
PROD_BUCKET="6v-simulator-production"
PR_BUCKET="6v-simulator-pr-previews"
DOMAIN="6v-simulator.com"
PREVIEW_DOMAIN="preview.6v-simulator.com"
AWS_REGION="us-east-1"
IAM_USER="6v-simulator-deploy"

echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}6v-Simulator AWS Infrastructure Setup${NC}"
echo -e "${BLUE}==================================${NC}"

# Function to check if AWS CLI is installed
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}Error: AWS CLI is not installed${NC}"
        echo "Please install AWS CLI first: https://aws.amazon.com/cli/"
        exit 1
    fi
}

# Function to check AWS credentials
check_aws_credentials() {
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}Error: AWS credentials not configured${NC}"
        echo "Please configure AWS credentials first: aws configure"
        exit 1
    fi
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}✓ AWS Account ID: ${ACCOUNT_ID}${NC}"
}

# Function to create IAM user and policy
setup_iam() {
    echo -e "\n${YELLOW}Setting up IAM user and policy...${NC}"
    
    # Create IAM policy
    POLICY_NAME="6v-simulator-deployment-policy"
    POLICY_FILE="iam-policy.json"
    
    if aws iam get-policy --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}" &> /dev/null; then
        echo -e "${YELLOW}Policy ${POLICY_NAME} already exists${NC}"
    else
        echo "Creating IAM policy..."
        POLICY_ARN=$(aws iam create-policy \
            --policy-name "${POLICY_NAME}" \
            --policy-document file://"${POLICY_FILE}" \
            --query 'Policy.Arn' \
            --output text)
        echo -e "${GREEN}✓ Created policy: ${POLICY_ARN}${NC}"
    fi
    
    # Create IAM user
    if aws iam get-user --user-name "${IAM_USER}" &> /dev/null; then
        echo -e "${YELLOW}User ${IAM_USER} already exists${NC}"
    else
        echo "Creating IAM user..."
        aws iam create-user --user-name "${IAM_USER}"
        echo -e "${GREEN}✓ Created user: ${IAM_USER}${NC}"
    fi
    
    # Attach policy to user
    echo "Attaching policy to user..."
    aws iam attach-user-policy \
        --user-name "${IAM_USER}" \
        --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"
    echo -e "${GREEN}✓ Policy attached to user${NC}"
}

# Function to create S3 buckets
setup_s3_buckets() {
    echo -e "\n${YELLOW}Setting up S3 buckets...${NC}"
    
    # Create production bucket
    if aws s3api head-bucket --bucket "${PROD_BUCKET}" 2>/dev/null; then
        echo -e "${YELLOW}Bucket ${PROD_BUCKET} already exists${NC}"
    else
        echo "Creating production bucket..."
        aws s3api create-bucket \
            --bucket "${PROD_BUCKET}" \
            --region "${AWS_REGION}"
        echo -e "${GREEN}✓ Created bucket: ${PROD_BUCKET}${NC}"
    fi
    
    # Block public access on production bucket
    echo "Configuring production bucket security..."
    aws s3api put-public-access-block \
        --bucket "${PROD_BUCKET}" \
        --public-access-block-configuration \
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
    
    # Enable versioning on production bucket
    aws s3api put-bucket-versioning \
        --bucket "${PROD_BUCKET}" \
        --versioning-configuration Status=Enabled
    echo -e "${GREEN}✓ Production bucket configured${NC}"
    
    # Create PR preview bucket
    if aws s3api head-bucket --bucket "${PR_BUCKET}" 2>/dev/null; then
        echo -e "${YELLOW}Bucket ${PR_BUCKET} already exists${NC}"
    else
        echo "Creating PR preview bucket..."
        aws s3api create-bucket \
            --bucket "${PR_BUCKET}" \
            --region "${AWS_REGION}"
        echo -e "${GREEN}✓ Created bucket: ${PR_BUCKET}${NC}"
    fi
    
    # Block public access on PR preview bucket
    echo "Configuring PR preview bucket security..."
    aws s3api put-public-access-block \
        --bucket "${PR_BUCKET}" \
        --public-access-block-configuration \
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
    
    # Add lifecycle policy for PR preview bucket
    echo "Adding lifecycle policy to PR preview bucket..."
    cat > /tmp/lifecycle.json << EOF
{
  "Rules": [
    {
      "Id": "DeleteOldPreviews",
      "Status": "Enabled",
      "Prefix": "pr-",
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
EOF
    
    aws s3api put-bucket-lifecycle-configuration \
        --bucket "${PR_BUCKET}" \
        --lifecycle-configuration file:///tmp/lifecycle.json
    echo -e "${GREEN}✓ PR preview bucket configured${NC}"
}

# Function to create Origin Access Control
setup_oac() {
    echo -e "\n${YELLOW}Setting up Origin Access Control...${NC}"
    
    # Create OAC for production
    echo "Creating OAC for production..."
    PROD_OAC=$(aws cloudfront create-origin-access-control \
        --origin-access-control-config \
        "{
            \"Name\": \"${PROD_BUCKET}-oac\",
            \"Description\": \"OAC for 6v-simulator production\",
            \"SigningProtocol\": \"sigv4\",
            \"SigningBehavior\": \"always\",
            \"OriginAccessControlOriginType\": \"s3\"
        }" \
        --query 'OriginAccessControl.Id' \
        --output text 2>/dev/null || echo "exists")
    
    if [ "$PROD_OAC" = "exists" ]; then
        echo -e "${YELLOW}Production OAC already exists${NC}"
        PROD_OAC=$(aws cloudfront list-origin-access-controls --query "OriginAccessControlList.Items[?Name=='${PROD_BUCKET}-oac'].Id | [0]" --output text)
    fi
    echo -e "${GREEN}✓ Production OAC ID: ${PROD_OAC}${NC}"
    
    # Create OAC for PR previews
    echo "Creating OAC for PR previews..."
    PR_OAC=$(aws cloudfront create-origin-access-control \
        --origin-access-control-config \
        "{
            \"Name\": \"${PR_BUCKET}-oac\",
            \"Description\": \"OAC for 6v-simulator PR previews\",
            \"SigningProtocol\": \"sigv4\",
            \"SigningBehavior\": \"always\",
            \"OriginAccessControlOriginType\": \"s3\"
        }" \
        --query 'OriginAccessControl.Id' \
        --output text 2>/dev/null || echo "exists")
    
    if [ "$PR_OAC" = "exists" ]; then
        echo -e "${YELLOW}PR preview OAC already exists${NC}"
        PR_OAC=$(aws cloudfront list-origin-access-controls --query "OriginAccessControlList.Items[?Name=='${PR_BUCKET}-oac'].Id | [0]" --output text)
    fi
    echo -e "${GREEN}✓ PR Preview OAC ID: ${PR_OAC}${NC}"
    
    # Save OAC IDs for later use
    echo "PROD_OAC_ID=${PROD_OAC}" > .oac-ids
    echo "PR_OAC_ID=${PR_OAC}" >> .oac-ids
}

# Function to display next steps
display_next_steps() {
    echo -e "\n${BLUE}==================================${NC}"
    echo -e "${BLUE}Setup Progress Summary${NC}"
    echo -e "${BLUE}==================================${NC}"
    
    echo -e "\n${GREEN}✓ Completed:${NC}"
    echo "  - IAM user and policy created"
    echo "  - S3 buckets created and configured"
    echo "  - Origin Access Control created"
    
    echo -e "\n${YELLOW}⚠ Manual Steps Required:${NC}"
    echo ""
    echo "1. Create IAM Access Keys:"
    echo "   aws iam create-access-key --user-name ${IAM_USER}"
    echo ""
    echo "2. Request SSL Certificates in ACM:"
    echo "   - Certificate for: ${DOMAIN}, www.${DOMAIN}"
    echo "   - Wildcard certificate for: *.${PREVIEW_DOMAIN}"
    echo ""
    echo "3. Create CloudFront Functions:"
    echo "   - Upload cloudfront-index-rewrite.js"
    echo "   - Upload pr-preview-router.js"
    echo ""
    echo "4. Create CloudFront Distributions:"
    echo "   - Production distribution for ${DOMAIN}"
    echo "   - PR preview distribution for *.${PREVIEW_DOMAIN}"
    echo "   - Use OAC IDs from .oac-ids file"
    echo ""
    echo "5. Update S3 Bucket Policies:"
    echo "   - Update s3-bucket-policy-production.json with your account ID and distribution ID"
    echo "   - Update s3-bucket-policy-preview.json with your account ID and distribution ID"
    echo "   - Apply policies to respective buckets"
    echo ""
    echo "6. Configure DNS:"
    echo "   - Point ${DOMAIN} to production CloudFront distribution"
    echo "   - Point *.${PREVIEW_DOMAIN} to PR preview CloudFront distribution"
    echo ""
    echo "7. Add GitHub Secrets:"
    echo "   - AWS_ACCESS_KEY_ID"
    echo "   - AWS_SECRET_ACCESS_KEY"
    echo "   - S3_BUCKET_NAME=${PROD_BUCKET}"
    echo "   - CLOUDFRONT_DISTRIBUTION_ID=<production_distribution_id>"
    echo "   - PR_PREVIEW_BUCKET_NAME=${PR_BUCKET}"
    echo "   - PR_PREVIEW_DISTRIBUTION_ID=<pr_preview_distribution_id>"
    
    echo -e "\n${BLUE}==================================${NC}"
    echo -e "${GREEN}For detailed instructions, see:${NC}"
    echo "infrastructure/aws/SETUP_INSTRUCTIONS.md"
    echo -e "${BLUE}==================================${NC}"
}

# Main execution
main() {
    check_aws_cli
    check_aws_credentials
    
    echo -e "\n${YELLOW}This script will set up AWS infrastructure for 6v-simulator${NC}"
    echo "Configuration:"
    echo "  - Production bucket: ${PROD_BUCKET}"
    echo "  - PR preview bucket: ${PR_BUCKET}"
    echo "  - Domain: ${DOMAIN}"
    echo "  - Preview domain: *.${PREVIEW_DOMAIN}"
    echo "  - AWS Region: ${AWS_REGION}"
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled"
        exit 1
    fi
    
    setup_iam
    setup_s3_buckets
    setup_oac
    display_next_steps
}

# Run main function
main