#!/usr/bin/env bash
set -euo pipefail

# use this script to set the schwab app client id and secret in ssm parameter store
# you'll be prompted to input both credentials during execution

STACK_NAME="${1:-portfolio-monitor-alert-app}"
REGION_ARGS=()
if [[ -n "${AWS_REGION:-}" ]]; then
  REGION_ARGS=(--region "$AWS_REGION")
fi

read -r -p "Schwab client ID/app key: " CLIENT_ID
read -r -s -p "Schwab client secret: " CLIENT_SECRET
printf '\n'

aws ssm put-parameter \
  "${REGION_ARGS[@]}" \
  --name "/${STACK_NAME}/schwab/client-id" \
  --type SecureString \
  --value "$CLIENT_ID" \
  --overwrite >/dev/null

aws ssm put-parameter \
  "${REGION_ARGS[@]}" \
  --name "/${STACK_NAME}/schwab/client-secret" \
  --type SecureString \
  --value "$CLIENT_SECRET" \
  --overwrite >/dev/null

printf 'Stored Schwab credentials under /%s/schwab/.\n' "$STACK_NAME"
