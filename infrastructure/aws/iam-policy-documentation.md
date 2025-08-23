# AWS IAM Policy Documentation for 6v Static Website Deployment

## Overview
This document explains the comprehensive IAM policy required for deploying and managing the 6v static website on AWS. The policy is divided into sections based on AWS services and use cases.

## Policy Sections Breakdown

### 1. S3 Bucket Management (S3BucketManagement)
**Purpose:** Manage S3 buckets for static website hosting
**When Needed:**
- **Initial Setup:** Creating buckets, configuring website hosting, setting policies
- **Ongoing Deployment:** Listing bucket contents, checking ACLs
**Key Permissions:**
- `CreateBucket/DeleteBucket`: One-time setup
- `PutBucketWebsite`: Configure static website hosting
- `PutBucketPolicy`: Set bucket access policies for CloudFront
- `PutBucketPublicAccessBlock`: Security configuration
- `PutBucketOwnershipControls`: Required for ACL management

### 2. S3 Object Operations (S3ObjectOperations)
**Purpose:** Deploy and manage website files
**When Needed:**
- **Every Deployment:** Upload new files, delete old files
- **PR Previews:** Manage preview builds in separate paths
**Key Permissions:**
- `PutObject`: Upload HTML, CSS, JS, and asset files
- `DeleteObject`: Remove outdated files
- `GetObject`: Verify deployments
- `PutObjectAcl`: Set object-level permissions

### 3. CloudFront Distribution Management (CloudFrontDistributionFullAccess)
**Purpose:** Manage CDN distributions
**When Needed:**
- **Initial Setup:** Create distributions, configure origins
- **Ongoing:** Update cache behaviors, create invalidations
**Key Permissions:**
- `CreateDistribution`: One-time setup
- `UpdateDistribution`: Modify configurations
- `CreateInvalidation`: Clear cache after deployments (CRITICAL for CI/CD)
- `TagResource`: Cost allocation and organization

### 4. CloudFront Functions (CloudFrontFunctionManagement)
**Purpose:** Manage edge functions for URL rewriting and routing
**When Needed:**
- **Initial Setup:** Deploy functions
- **Updates:** Modify routing logic or add features
**Key Permissions:**
- `CreateFunction/UpdateFunction`: Deploy edge logic
- `PublishFunction`: Activate new versions
- `TestFunction`: Validate before deployment
**Your Functions:**
- `6v-index-rewrite`: SPA routing support
- `6v-pr-preview-router`: PR preview path routing

### 5. CloudFront Origin Access Control (CloudFrontOriginAccessControl)
**Purpose:** Secure S3 bucket access
**When Needed:**
- **Initial Setup:** Create OAC for secure S3 access
- **Maintenance:** Update security configurations
**Key Permissions:**
- `CreateOriginAccessControl`: Setup secure origin
- `UpdateOriginAccessControl`: Modify security settings
**Your OAC:** `E1LD1H9TDZYF12`

### 6. Route53 DNS Management (Route53HostedZoneManagement & Route53RecordSetManagement)
**Purpose:** Manage DNS records for domain and subdomains
**When Needed:**
- **Initial Setup:** Create A/AAAA records for CloudFront
- **PR Previews:** Create subdomain records
- **Certificate Validation:** Add CNAME records for ACM
**Key Permissions:**
- `ChangeResourceRecordSets`: Add/update DNS records
- `ListResourceRecordSets`: Verify existing records
**Your Hosted Zone:** `allison.la` (ID: Z0358877108B22OGXZBUD)

### 7. ACM Certificate Management (ACMCertificateManagement)
**Purpose:** Manage SSL/TLS certificates
**When Needed:**
- **Initial Setup:** Request certificates for domain
- **Renewal:** Auto-renewal management
- **Validation:** DNS validation setup
**Key Permissions:**
- `RequestCertificate`: New certificate requests
- `DescribeCertificate`: Check validation status
- `DeleteCertificate`: Cleanup old certificates
**Your Certificate:** `arn:aws:acm:us-east-1:517311508324:certificate/5370020c-71a8-4ca3-9d12-4740d8074682`

### 8. IAM Service-Linked Roles (IAMServiceLinkedRoles)
**Purpose:** Allow AWS services to assume necessary roles
**When Needed:**
- **Initial Setup:** CloudFront and S3 service roles
- **Rarely:** When AWS adds new features requiring roles
**Key Permissions:**
- `CreateServiceLinkedRole`: Auto-create required roles

### 9. CloudWatch Logs & Metrics (CloudWatchLogsAccess & CloudWatchMetricsAccess)
**Purpose:** Monitoring and debugging
**When Needed:**
- **Ongoing:** Monitor performance, debug issues
- **Troubleshooting:** Access CloudFront logs
**Key Permissions:**
- `PutLogEvents`: Write deployment logs
- `GetMetricStatistics`: Monitor CDN performance
- `FilterLogEvents`: Debug issues

### 10. WAFv2 Access (WAFv2Access)
**Purpose:** Web Application Firewall integration
**When Needed:**
- **Security:** Add DDoS protection
- **Compliance:** Implement security rules
**Key Permissions:**
- `AssociateWebACL`: Attach WAF rules to CloudFront
- `GetWebACL`: Check security configurations

### 11. Lambda@Edge Functions (LambdaEdgeFunctions)
**Purpose:** Advanced edge computing (if needed)
**When Needed:**
- **Advanced Features:** Complex routing, authentication
- **Performance:** Edge-side rendering or optimization
**Key Permissions:**
- `CreateFunction`: Deploy Lambda@Edge
- `EnableReplication`: Deploy to CloudFront edges

### 12. STS Assume Role (STSAssumeRole)
**Purpose:** Cross-service authentication
**When Needed:**
- **Always:** Required for service interactions
**Key Permissions:**
- `GetCallerIdentity`: Verify permissions
- `AssumeRole`: Service delegation

## Usage Scenarios

### Scenario 1: Initial Infrastructure Setup
**Required Sections:** All sections
**Use Case:** First-time deployment, creating all AWS resources
```bash
# Actions performed:
- Create S3 buckets
- Configure bucket policies and CORS
- Create CloudFront distributions
- Deploy CloudFront functions
- Setup Origin Access Control
- Create Route53 DNS records
- Request/validate ACM certificates
```

### Scenario 2: Regular CI/CD Deployments
**Required Sections:** 2, 3 (partial), 9
**Use Case:** GitHub Actions deploying on merge to main
```bash
# Actions performed:
- Upload build files to S3
- Delete old files
- Create CloudFront invalidation
- Log deployment status
```

### Scenario 3: PR Preview Deployments
**Required Sections:** 2, 3 (partial), 6 (partial)
**Use Case:** Deploy preview builds for pull requests
```bash
# Actions performed:
- Upload to PR-specific path in S3
- Create subdomain DNS record (optional)
- Invalidate PR preview path in CloudFront
```

### Scenario 4: Security Updates
**Required Sections:** 1 (partial), 5, 10
**Use Case:** Update security configurations
```bash
# Actions performed:
- Update bucket policies
- Modify Origin Access Control
- Configure WAF rules
```

## Minimal Deployment Policy
For CI/CD that only deploys files (no infrastructure changes):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3DeploymentAccess",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::6v-allison-la-production",
        "arn:aws:s3:::6v-allison-la-production/*",
        "arn:aws:s3:::6v-allison-la-pr-previews",
        "arn:aws:s3:::6v-allison-la-pr-previews/*"
      ]
    },
    {
      "Sid": "CloudFrontInvalidation",
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation"
      ],
      "Resource": [
        "arn:aws:cloudfront::517311508324:distribution/E2IKQX5MGWHUY5",
        "arn:aws:cloudfront::517311508324:distribution/EPI8WZV5IATZQ"
      ]
    }
  ]
}
```

## Security Best Practices

1. **Principle of Least Privilege:** Use minimal deployment policy for CI/CD
2. **Resource-Specific ARNs:** Specify exact resources when possible
3. **Separate Policies:** Use different policies for setup vs deployment
4. **MFA Protection:** Require MFA for infrastructure changes
5. **Audit Logging:** Enable CloudTrail for all actions
6. **Regular Reviews:** Audit and update permissions quarterly

## Policy Validation Commands
```bash
# Validate policy syntax
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::517311508324:user/deployment-user \
  --action-names s3:PutObject cloudfront:CreateInvalidation \
  --resource-arns arn:aws:s3:::6v-allison-la-production/*

# Test deployment permissions
aws s3 ls s3://6v-allison-la-production/ --profile deployment
aws cloudfront create-invalidation \
  --distribution-id E2IKQX5MGWHUY5 \
  --paths "/*" --profile deployment
```

## Troubleshooting Common Permission Issues

### Issue: "Access Denied" on S3 Upload
**Solution:** Check both bucket and object permissions are included

### Issue: "Cannot create invalidation"
**Solution:** Ensure distribution ARN includes account ID

### Issue: "Cannot update CloudFront function"
**Solution:** Need both UpdateFunction and PublishFunction permissions

### Issue: "DNS record creation fails"
**Solution:** Include both hostedzone and change resources

### Issue: "Certificate validation stuck"
**Solution:** Need Route53 permissions for DNS validation

## Cost Optimization Notes

1. **CloudFront Invalidations:** First 1000 paths/month free, then $0.005 per path
2. **Route53 Queries:** $0.40 per million queries
3. **S3 Storage:** Use lifecycle policies to delete old PR previews
4. **CloudWatch Logs:** Set retention policies to control costs
5. **Data Transfer:** CloudFront to S3 in same region is free

## Compliance Considerations

1. **Data Residency:** Ensure S3 buckets are in compliant regions
2. **Encryption:** Enable S3 default encryption
3. **Access Logging:** Enable S3 and CloudFront access logs
4. **Version Control:** Enable S3 versioning for audit trail
5. **Backup:** Regular backups of production content

## Migration Path from Current Policy

1. **Phase 1:** Add Route53 and ACM permissions (for DNS management)
2. **Phase 2:** Add CloudFront function permissions (for edge logic updates)
3. **Phase 3:** Add monitoring permissions (CloudWatch)
4. **Phase 4:** Add security permissions (WAF, if needed)

## Contact and Support

- **Policy Maintainer:** DevOps Team
- **Last Updated:** 2025-08-23
- **Review Schedule:** Quarterly
- **Emergency Contact:** Use break-glass account for urgent changes