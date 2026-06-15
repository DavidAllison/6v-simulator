# Deployment — 6v-simulator

The app is a **static Vite build** (`client/dist/`) with no backend. It is published two ways,
both triggered by GitHub Actions. The authoritative operational notes are in
[`docs/DEPLOYMENT.md`](../../docs/DEPLOYMENT.md) — this file summarizes the pipelines; defer to
that doc (and the workflow YAML) for exact steps and the GitHub Pages setup.

## Build

```bash
cd client
npm run build        # tsc -b && vite build → client/dist/
npm run preview      # serve the production build locally
```

CI builds with `NODE_ENV=production`; the GitHub Pages path additionally sets `GITHUB_ACTIONS=true`
so Vite picks the `/6v-simulator/` base path. To reproduce that build locally:
`GITHUB_ACTIONS=true npm run build`.

## Pipelines (`.github/workflows/`)

| Workflow | Trigger | Target |
|---|---|---|
| `pr-preview.yml` | PR opened/synced/reopened (paths `client/**`) | S3 `s3://6v-simulator-pr-previews/pr-{N}/` + CloudFront invalidation; comments the preview URL on the PR. |
| `pr-preview-cleanup.yml` | PR closed | Removes the PR's preview from S3. |
| `deploy-production.yml` | push to `main` (paths `client/**`) | S3 `s3://6v-simulator-production` (sync `--delete`) + CloudFront invalidation `/*`. |
| `deploy.yml` | push to `main` / manual | GitHub Pages (static artifact, with `404.html` for SPA routing). |

> Both `deploy-production.yml` (S3/CloudFront) and `deploy.yml` (GitHub Pages) fire on `main`.
> The primary production surface is the S3 + CloudFront site behind `6v.allison.la`; GitHub Pages
> is a secondary mirror. See `docs/DEPLOYMENT.md`.

## PR previews

Every PR touching `client/**` deploys to:

```
https://pr-{N}.dev.6v.allison.la
```

The workflow posts/updates a comment with the URL and the commit SHA, and the preview refreshes
on each push. Add the URL to the PR body (template in `.github/pull_request_template.md`;
helper `scripts/update-pr-preview-url.sh`). Test the preview before requesting review. The
preview is torn down when the PR closes.

## Production deploy flow

1. Merge the PR to `main` (CI green — see `sdlc.md` gates).
2. `deploy-production.yml` syncs `client/dist` to the production S3 bucket and invalidates
   CloudFront (distribution `E1537G5KX38T5H`).
3. `deploy.yml` publishes the GitHub Pages mirror in parallel.
4. Verify the live site after the CloudFront invalidation propagates.

AWS credentials come from repo secrets (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, region
`us-east-1`). Never commit credentials.

## Monitoring

```bash
gh run list --workflow deploy-production.yml --limit 5
gh run list --workflow pr-preview.yml --limit 5
gh run view <RUN_ID> --log
```

## Troubleshooting

- **Build fails in CI** — reproduce locally: `cd client && npm run build` (Node 20+).
  TypeScript errors: `npm run typecheck`.
- **GitHub Pages 404 on routes** — `404.html` SPA redirect + correct base path; see
  `docs/DEPLOYMENT.md`.
- **Preview not updating** — confirm the PR diff touches `client/**` (the workflow is
  path-filtered) and check the `pr-preview.yml` run logs.
