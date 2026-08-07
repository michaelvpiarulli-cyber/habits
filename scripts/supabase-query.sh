#!/usr/bin/env bash
# Run SQL against the Tally Supabase project via the Management API.
# Requires: SUPABASE_ACCESS_TOKEN (Personal Access Token from
# https://supabase.com/dashboard/account/tokens)
#
# Usage:
#   ./scripts/supabase-query.sh "select tablename from pg_tables where schemaname = 'public';"
#   ./scripts/supabase-query.sh -f supabase/add-nutrition-and-lifts.sql

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-satiltslftjqiktjwehr}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Missing SUPABASE_ACCESS_TOKEN." >&2
  echo "Create one at https://supabase.com/dashboard/account/tokens" >&2
  echo "then: export SUPABASE_ACCESS_TOKEN=sbp_..." >&2
  exit 1
fi

if [[ "${1:-}" == "-f" || "${1:-}" == "--file" ]]; then
  QUERY="$(cat "${2:?path required after -f}")"
elif [[ $# -ge 1 ]]; then
  QUERY="$*"
else
  echo "Usage: $0 \"SQL...\" | $0 -f path/to.sql" >&2
  exit 1
fi

curl -sS -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "$QUERY" '{query: $q}')"
echo
