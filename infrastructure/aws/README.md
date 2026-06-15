# AWS deployment infrastructure

Infrastructure-as-code for how the 6-vertex simulator is hosted: a static SPA
in S3, served privately through CloudFront with Origin Access Control (OAC).
These files document and reproduce the **already-live** setup — they are applied
by hand (or one-time scripts), not by CI. The day-to-day deploys are driven by
the GitHub Actions workflows in [`.github/workflows/`](../../.github/workflows/).

## Live resources

| Purpose | S3 bucket | CloudFront distribution | URL |
|---|---|---|---|
| Production | `6v-simulator-production` | `E1537G5KX38T5H` | https://6v.allison.la |
| PR previews | `6v-simulator-pr-previews` (one `pr-<N>/` prefix per PR) | `E1DZ4HUUOSPRK5` | https://pr-&lt;N&gt;.dev.6v.allison.la |

Region: `us-east-1`. Both buckets are **private**; the only read path is
CloudFront via OAC. There is no public bucket ACL and no S3 website endpoint.

> `<ACCOUNT_ID>` placeholders in the JSON policies must be replaced with the AWS
> account number before applying (`aws sts get-caller-identity --query Account
> --output text`). The account ID is deliberately kept out of this public repo.

## Files

| File | What it is | Where it goes |
|---|---|---|
| `iam-deploy-policy.json` | Least-privilege policy for the CI deploy identity: S3 sync to the two buckets, CloudFront invalidation, and `sts:GetCallerIdentity`. Nothing else. | Attached to the IAM user whose keys are stored as the `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` Actions secrets. |
| `s3-bucket-policy-production.json` | Bucket policy allowing **only** the production CloudFront distribution to `s3:GetObject` (OAC `AWS:SourceArn` condition). | `aws s3api put-bucket-policy --bucket 6v-simulator-production` |
| `s3-bucket-policy-preview.json` | Same, for the preview bucket + preview distribution. | `aws s3api put-bucket-policy --bucket 6v-simulator-pr-previews` |
| `cloudfront-spa-rewrite.js` | Viewer-request function: directory-index + SPA fallback to `/index.html`. | Production distribution. |
| `pr-preview-router.js` | Viewer-request function: maps `pr-<N>.dev.6v.allison.la` → the `pr-<N>/` S3 prefix, with SPA fallback. | Preview distribution. |

## How a deploy works (driven by CI)

1. `.github/workflows/deploy-production.yml` builds `client/` and runs
   `aws s3 sync client/dist s3://6v-simulator-production --delete`, then
   invalidates `E1537G5KX38T5H` (`/*`).
2. `.github/workflows/pr-preview.yml` syncs each PR's build to
   `s3://6v-simulator-pr-previews/pr-<N>/` and invalidates `E1DZ4HUUOSPRK5`
   (`/pr-<N>/*`), then comments the preview URL on the PR.
3. `.github/workflows/pr-preview-cleanup.yml` removes the `pr-<N>/` prefix when
   the PR closes.

## Security notes

- **Least privilege.** `iam-deploy-policy.json` grants only what a deploy needs.
  It intentionally omits bucket creation/deletion, `s3:PutBucketPolicy`,
  `cloudfront:UpdateDistribution`, and CloudFront-Function CRUD — those are
  one-time administrative actions performed by a human, never by the CI key.
- **Private origin.** Buckets are reached only through CloudFront OAC; the bucket
  policies scope `s3:GetObject` to a single distribution ARN each.
- **No secrets in the repo.** The deploy identity's access key lives only in the
  GitHub Actions secrets (and should be mirrored to the team secret store). No
  credential values, and no account ID, are committed here.
- **Hardening backlog.** Migrating CI auth from a long-lived IAM user key to
  GitHub OIDC + an assumed IAM role would remove the static secret entirely.
