#!/usr/bin/env bash
set -euo pipefail


STACK_NAME="${1:-portfolio-monitor-alert-app}"
REGION_ARGS=()
if [[ -n "${AWS_REGION:-}" ]]; then
  REGION_ARGS=(--region "$AWS_REGION")
fi

FUNCTION_NAME="$(aws cloudformation describe-stacks \
  "${REGION_ARGS[@]}" \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='StartAuthFunctionName'].OutputValue | [0]" \
  --output text)"

OUTPUT_FILE="$(mktemp)"
trap 'rm -f "$OUTPUT_FILE"' EXIT

aws lambda invoke \
  "${REGION_ARGS[@]}" \
  --function-name "$FUNCTION_NAME" \
  --cli-binary-format raw-in-base64-out \
  --payload '{}' \
  "$OUTPUT_FILE" >/dev/null

AUTH_URL="$(node -e 'const fs=require("fs"); const v=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log(v.authorizationUrl);' "$OUTPUT_FILE")"
EXPIRES_AT="$(node -e 'const fs=require("fs"); const v=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log(v.expiresAt);' "$OUTPUT_FILE")"

printf 'Open this URL before %s:\n\n%s\n' "$EXPIRES_AT" "$AUTH_URL"
