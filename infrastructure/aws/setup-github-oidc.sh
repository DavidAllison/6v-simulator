#!/usr/bin/env bash
#
# One-time setup: let GitHub Actions deploy via OIDC instead of a long-lived
# IAM access key (issue #42). Idempotent — safe to re-run.
#
# Requires AWS credentials with IAM admin (NOT the CI deploy key). Run by a
# human/operator; this script never creates or prints a long-lived secret.
#
# After it prints the role ARN, finish the cutover (see
# docs/CI_OIDC_MIGRATION.md): set the AWS_DEPLOY_ROLE_ARN repo variable, switch
# the workflows to aws-actions/configure-aws-credentials with role-to-assume +
# `permissions: id-token: write`, then delete the AWS_ACCESS_KEY_ID /
# AWS_SECRET_ACCESS_KEY secrets and the old IAM user's access key.
#
set -euo pipefail

ROLE_NAME="${ROLE_NAME:-6v-simulator-github-deploy}"
REPO="${REPO:-DavidAllison/6v-simulator}"
PROVIDER_HOST="token.actions.githubusercontent.com"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
echo "Account: ${ACCOUNT_ID}  Repo: ${REPO}  Role: ${ROLE_NAME}"

PROVIDER_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${PROVIDER_HOST}"

# 1. OIDC identity provider (create only if absent).
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "${PROVIDER_ARN}" >/dev/null 2>&1; then
  echo "OIDC provider already exists: ${PROVIDER_ARN}"
else
  echo "Creating OIDC provider ${PROVIDER_HOST} ..."
  # Thumbprint is no longer validated by AWS for this provider, but the API still
  # requires a value; this is GitHub's well-known intermediate CA thumbprint.
  aws iam create-open-id-connect-provider \
    --url "https://${PROVIDER_HOST}" \
    --client-id-list "sts.amazonaws.com" \
    --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" >/dev/null
fi

# 2. Trust policy with the real account ID substituted in.
TRUST_FILE="$(mktemp)"
trap 'rm -f "${TRUST_FILE}"' EXIT
sed "s/<ACCOUNT_ID>/${ACCOUNT_ID}/g" "${HERE}/github-oidc-trust-policy.json" > "${TRUST_FILE}"

# 3. Role with that trust policy (create or update).
if aws iam get-role --role-name "${ROLE_NAME}" >/dev/null 2>&1; then
  echo "Updating trust policy on existing role ${ROLE_NAME} ..."
  aws iam update-assume-role-policy --role-name "${ROLE_NAME}" --policy-document "file://${TRUST_FILE}"
else
  echo "Creating role ${ROLE_NAME} ..."
  aws iam create-role --role-name "${ROLE_NAME}" \
    --assume-role-policy-document "file://${TRUST_FILE}" \
    --description "GitHub Actions OIDC deploy role for ${REPO}" >/dev/null
fi

# 4. Attach the least-privilege deploy permissions (same policy the CI key uses).
aws iam put-role-policy --role-name "${ROLE_NAME}" \
  --policy-name "6v-simulator-deploy" \
  --policy-document "file://${HERE}/iam-deploy-policy.json"

ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"
echo ""
echo "Done. Role ARN:"
echo "  ${ROLE_ARN}"
echo ""
echo "Next: gh variable set AWS_DEPLOY_ROLE_ARN --body '${ROLE_ARN}'"
echo "Then switch the workflows to OIDC and remove the static access key"
echo "(see docs/CI_OIDC_MIGRATION.md)."
