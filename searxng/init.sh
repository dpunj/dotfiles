#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

if [[ -f .env ]]; then
	echo ".env already exists; leaving it unchanged."
	exit 0
fi

secret="$(openssl rand -hex 32)"
cat >.env <<EOF
SEARXNG_VERSION=latest
SEARXNG_HOST=127.0.0.1
SEARXNG_PORT=8080
SEARXNG_BASE_URL=http://127.0.0.1:8080/
SEARXNG_SECRET=${secret}
SEARXNG_LIMITER=false
SEARXNG_PUBLIC_INSTANCE=false
GRANIAN_HOST=0.0.0.0
FORCE_OWNERSHIP=false
EOF

echo "Created $(pwd)/.env with a generated SearXNG secret."
