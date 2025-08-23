#!/bin/bash

# Deploy to S3 Script
# This script uses AWS CLI with credentials from ~/.aws/credentials or environment variables

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting S3 deployment...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Load environment variables if .env.local exists
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Set default values
BUCKET_NAME=${S3_BUCKET_NAME:-"6v-allison-la-production"}
AWS_REGION=${AWS_REGION:-"us-east-1"}
DIST_DIR="client/dist"

# Check if dist directory exists
if [ ! -d "$DIST_DIR" ]; then
    echo -e "${YELLOW}⚠️  Distribution directory not found. Building the application...${NC}"
    cd client
    npm run build
    cd ..
fi

# Verify AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure' or set AWS environment variables.${NC}"
    echo -e "${YELLOW}You can configure AWS CLI with: aws configure${NC}"
    echo -e "${YELLOW}Or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables${NC}"
    exit 1
fi

# Show current AWS identity
echo -e "${GREEN}✓ AWS Identity verified:${NC}"
aws sts get-caller-identity --output table

# Dry run first
echo -e "\n${YELLOW}📋 Running dry run...${NC}"
aws s3 sync "$DIST_DIR" "s3://$BUCKET_NAME" \
    --region "$AWS_REGION" \
    --delete \
    --dryrun

# Ask for confirmation
echo -e "\n${YELLOW}⚠️  This will sync $DIST_DIR to s3://$BUCKET_NAME${NC}"
read -p "Do you want to proceed with the actual deployment? (y/N) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${GREEN}🚀 Deploying to S3...${NC}"
    aws s3 sync "$DIST_DIR" "s3://$BUCKET_NAME" \
        --region "$AWS_REGION" \
        --delete \
        --cache-control "public, max-age=31536000" \
        --exclude "*.html" \
        --exclude "*.json"
    
    # HTML files with shorter cache
    aws s3 sync "$DIST_DIR" "s3://$BUCKET_NAME" \
        --region "$AWS_REGION" \
        --delete \
        --cache-control "public, max-age=3600" \
        --content-type "text/html" \
        --exclude "*" \
        --include "*.html"
    
    # JSON files with no cache
    aws s3 sync "$DIST_DIR" "s3://$BUCKET_NAME" \
        --region "$AWS_REGION" \
        --delete \
        --cache-control "no-cache" \
        --content-type "application/json" \
        --exclude "*" \
        --include "*.json"
    
    echo -e "\n${GREEN}✅ Deployment completed successfully!${NC}"
    echo -e "${GREEN}🌐 Your site is available at: https://6v.allison.la${NC}"
else
    echo -e "${YELLOW}⚠️  Deployment cancelled.${NC}"
fi