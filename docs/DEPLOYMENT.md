# Deployment Guide

The 6-vertex simulator is a static SPA hosted on **AWS S3 + CloudFront**.
Deploys are fully automated through GitHub Actions; there is nothing to run by
hand for a normal release.

> **Canonical target: S3 + CloudFront.** An earlier GitHub Pages workflow was
> removed — it deployed the same `main` branch in parallel, which split prod
> across two hosts. CloudFront (`6v.allison.la`) is the single source of truth.
> The infrastructure-as-code lives in [`infrastructure/aws/`](../infrastructure/aws/).

## Environments

| Environment | Trigger | URL |
|---|---|---|
| Production | push to `main` (paths under `client/**`) | https://6v.allison.la |
| PR preview | open / update a PR | https://pr-&lt;N&gt;.dev.6v.allison.la |

## How it works

### Production — `.github/workflows/deploy-production.yml`
1. Builds `client/` (`npm ci && npm run build`).
2. `aws s3 sync client/dist s3://6v-simulator-production --delete`.
3. Invalidates CloudFront distribution `E1537G5KX38T5H` (`/*`).

### PR previews — `.github/workflows/pr-preview.yml`
1. Builds the PR's `client/`.
2. `aws s3 sync client/dist s3://6v-simulator-pr-previews/pr-<N>/ --delete`.
3. Invalidates distribution `E1DZ4HUUOSPRK5` (`/pr-<N>/*`).
4. Comments the preview URL on the PR.

A CloudFront function (`infrastructure/aws/pr-preview-router.js`) maps each
`pr-<N>.dev.6v.allison.la` host to its `pr-<N>/` S3 prefix.
`.github/workflows/pr-preview-cleanup.yml` deletes the prefix when the PR closes.

## Required GitHub Actions secrets

| Secret | Used for |
|---|---|
| `AWS_ACCESS_KEY_ID` | Deploy identity (see below) |
| `AWS_SECRET_ACCESS_KEY` | Deploy identity |

The deploy identity is an IAM user carrying **only** the least-privilege policy
in [`infrastructure/aws/iam-deploy-policy.json`](../infrastructure/aws/iam-deploy-policy.json)
(S3 sync to the two buckets + CloudFront invalidation + `sts:GetCallerIdentity`).

## Local build / preview

```bash
cd client
npm ci
npm run build      # output in client/dist/
npm run preview    # serve the production build locally
```

## Provisioning / changing infrastructure

One-time bucket, distribution, OAC, and IAM setup is documented in
[`infrastructure/aws/README.md`](../infrastructure/aws/README.md). Replace the
`<ACCOUNT_ID>` placeholders in the policy JSONs before applying.

## Troubleshooting

- **Preview shows a stale build** — the deploy ran but CloudFront cache hasn't
  expired; the workflow issues an invalidation, so re-run it if needed.
- **`aws s3 ls` fails in CI** — the deploy key's policy or the bucket name drifted
  from `infrastructure/aws/iam-deploy-policy.json`; reconcile them.
- **404 on a deep link** — the SPA-rewrite CloudFront function isn't attached to
  the distribution as a Viewer Request function.
