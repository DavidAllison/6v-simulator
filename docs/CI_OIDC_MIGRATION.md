# CI deploy auth: migrate to GitHub OIDC (issue #42)

Goal: stop authenticating CI deploys with a long-lived IAM user access key
(`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` secrets) and use short-lived
GitHub OIDC + an assumed IAM role instead.

This is a one-time cutover that requires an **AWS admin** (IAM `CreateRole` /
`CreateOpenIDConnectProvider`) — it is intentionally **not** done by the CI
identity and is **not** a change CI can apply on its own. The repo carries
everything needed; the steps below are the only manual part.

## Why this is a gated, two-part change

The workflow edits in step 3 will **fail every deploy** until the IAM role from
steps 1–2 exists. So the order matters: provision the role first, set the repo
variable, *then* land the workflow edits, *then* remove the old key.

## 1. Provision the OIDC provider + role (AWS admin)

```bash
cd infrastructure/aws
AWS_PROFILE=<admin-profile> ./setup-github-oidc.sh
```

The script is idempotent. It creates (if absent) the
`token.actions.githubusercontent.com` OIDC provider, creates the role
`6v-simulator-github-deploy` with the trust policy in
[`github-oidc-trust-policy.json`](../infrastructure/aws/github-oidc-trust-policy.json)
(scoped to `repo:DavidAllison/6v-simulator:*`), attaches the existing
least-privilege [`iam-deploy-policy.json`](../infrastructure/aws/iam-deploy-policy.json),
and prints the **role ARN**.

> Tightening option: restrict the trust `sub` to
> `repo:DavidAllison/6v-simulator:ref:refs/heads/main` (production) plus
> `repo:DavidAllison/6v-simulator:pull_request` (previews) instead of `:*`.

## 2. Expose the role ARN to Actions

```bash
gh variable set AWS_DEPLOY_ROLE_ARN --body 'arn:aws:iam::<ACCOUNT_ID>:role/6v-simulator-github-deploy'
```

(A repo **variable**, not a secret — the ARN is not sensitive.)

## 3. Switch the workflows to OIDC

In **both** `.github/workflows/deploy-production.yml` and
`.github/workflows/pr-preview.yml`:

**a. Grant the job an OIDC token.** Add a job-level `permissions` block
(`pr-preview.yml` already has one — add `id-token: write` to it):

```yaml
permissions:
  id-token: write
  contents: read          # pr-preview.yml also keeps: pull-requests: write, issues: write
```

**b. Add a credentials step** right after the build step, before the first
`aws` call:

```yaml
      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_DEPLOY_ROLE_ARN }}
          aws-region: us-east-1
```

**c. Delete the per-step credential `env:` blocks.** Every step that currently
carries

```yaml
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1
```

no longer needs it — the configure step exports credentials + region for the
rest of the job. (Keep any non-credential `env` such as `AWS_DEFAULT_REGION` if
a step relies on it, or set `aws-region` once via the configure step.)

Land this as its own PR. Confirm a real deploy (push to `main`, and a test PR
preview) succeeds via the assumed role.

## 4. Remove the static key

Once OIDC deploys are green:

```bash
gh secret delete AWS_ACCESS_KEY_ID
gh secret delete AWS_SECRET_ACCESS_KEY
# delete the access key on the old IAM user, and the user itself if unused
aws iam list-access-keys --user-name <old-deploy-user>
aws iam delete-access-key --user-name <old-deploy-user> --access-key-id <AKIA...>
```

## Acceptance criteria (from #42)

- [ ] No long-lived AWS access key remains in repo secrets.
- [ ] Production + PR-preview deploys succeed via the assumed role.
- [ ] Role trust policy scoped to this repository.
