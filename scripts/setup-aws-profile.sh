#!/bin/bash

# Setup AWS Profile for 6v-simulator project
# This creates a dedicated AWS profile to avoid using default credentials

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROFILE_NAME="6v-simulator"

echo -e "${BLUE}🔧 AWS Profile Setup for 6v-simulator${NC}"
echo -e "${YELLOW}This will create a dedicated AWS profile named '${PROFILE_NAME}'${NC}\n"

# Check if profile already exists
if aws configure get aws_access_key_id --profile "$PROFILE_NAME" &> /dev/null; then
    echo -e "${YELLOW}⚠️  Profile '${PROFILE_NAME}' already exists.${NC}"
    read -p "Do you want to update it? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}✓ Using existing profile.${NC}"
        exit 0
    fi
fi

echo -e "${YELLOW}Please enter your AWS credentials for the 6v-simulator project:${NC}"
echo -e "${RED}⚠️  These should be the credentials from GitHub secrets or new IAM user credentials${NC}\n"

read -p "AWS Access Key ID: " AWS_KEY
read -s -p "AWS Secret Access Key: " AWS_SECRET
echo
read -p "Default region [us-east-1]: " AWS_REGION

AWS_REGION=${AWS_REGION:-us-east-1}

# Configure the profile
aws configure set aws_access_key_id "$AWS_KEY" --profile "$PROFILE_NAME"
aws configure set aws_secret_access_key "$AWS_SECRET" --profile "$PROFILE_NAME"
aws configure set region "$AWS_REGION" --profile "$PROFILE_NAME"
aws configure set output json --profile "$PROFILE_NAME"

# Verify the profile works
echo -e "\n${GREEN}Testing AWS profile...${NC}"
if aws sts get-caller-identity --profile "$PROFILE_NAME" &> /dev/null; then
    echo -e "${GREEN}✅ AWS profile '${PROFILE_NAME}' configured successfully!${NC}"
    echo -e "\n${BLUE}Profile details:${NC}"
    aws sts get-caller-identity --profile "$PROFILE_NAME" --output table
    
    echo -e "\n${GREEN}To use this profile in commands:${NC}"
    echo -e "  ${BLUE}aws s3 ls --profile ${PROFILE_NAME}${NC}"
    echo -e "  ${BLUE}export AWS_PROFILE=${PROFILE_NAME}${NC}"
    
    # Update .env.local with profile info
    echo -e "\n# AWS Profile Configuration" >> .env.local
    echo "AWS_PROFILE=${PROFILE_NAME}" >> .env.local
    echo -e "${GREEN}✓ Added AWS_PROFILE to .env.local${NC}"
else
    echo -e "${RED}❌ Failed to verify AWS credentials. Please check and try again.${NC}"
    exit 1
fi