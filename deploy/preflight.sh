#!/usr/bin/env bash
#
# Read-only. Changes NOTHING. Run by `make deploy` before it touches anything, and again after
# `git pull` (a pull can introduce a newly-required variable).
#
# Collects EVERY failure and prints them together. Being told about one broken thing at a time
# is what makes people stop reading and reach for --force.
#
# Exit 0 = safe to deploy. Exit 1 = do not.

set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

RED=$'\033[31m'; YEL=$'\033[33m'; GRN=$'\033[32m'; DIM=$'\033[2m'; OFF=$'\033[0m'
FAILURES=0
WARNINGS=0

fail() { printf '%s  FAIL%s  %s\n' "$RED" "$OFF" "$1"; FAILURES=$((FAILURES + 1)); }
warn() { printf '%s  WARN%s  %s\n' "$YEL" "$OFF" "$1"; WARNINGS=$((WARNINGS + 1)); }
ok()   { printf '%s  ok  %s  %s\n' "$GRN" "$OFF" "$1"; }
note() { printf '%s        %s%s\n' "$DIM" "$1" "$OFF"; }

# Reads a KEY=value from an env file without sourcing it (sourcing would execute arbitrary
# shell from a file that holds secrets, and would leak them into this process's environment).
getenv_val() {
  local file="$1" key="$2"
  [ -f "$file" ] || return 1
  sed -n "s/^[[:space:]]*${key}[[:space:]]*=[[:space:]]*//p" "$file" \
    | grep -v '^[[:space:]]*#' \
    | tail -n1 \
    | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/" -e 's/[[:space:]]*$//'
}

echo "preflight: $REPO"
echo

# --------------------------------------------------------------------------- process / toolchain
if [ "$(id -u)" -eq 0 ]; then
  fail "running as root. Run as the pm2 service user."
  note "root would let the app create its own spool dir, defeating the point of make setup."
else
  ok "not root (user: $(id -un))"
fi

NODE_MAJOR="$(node -v 2>/dev/null | sed 's/^v\([0-9]*\).*/\1/')"
if [ -z "$NODE_MAJOR" ]; then
  fail "node not found on PATH"
elif [ "$NODE_MAJOR" -lt 20 ]; then
  fail "node $(node -v) is too old; server/package.json requires >=20"
else
  ok "node $(node -v)"
fi

if command -v pm2 >/dev/null 2>&1; then
  PM2_NODE="$(pm2 prettylist 2>/dev/null | sed -n "s/.*node_version: '\([0-9.]*\)'.*/\1/p" | head -n1)"
  if [ -n "$PM2_NODE" ] && [ "${PM2_NODE%%.*}" != "$NODE_MAJOR" ]; then
    warn "the pm2 daemon runs node $PM2_NODE but your shell has $(node -v)"
    note "the long-lived pm2 daemon keeps its old node until \`pm2 update\`. Run it."
  fi
else
  fail "pm2 not found on PATH"
fi

# --------------------------------------------------------------------------- git
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  fail "working tree is dirty"
  note "git pull --ff-only will refuse, and you would be deploying code that is not in git."
  git status --short | sed 's/^/        /'
else
  ok "working tree clean"
fi

if ! git rev-parse --abbrev-ref '@{upstream}' >/dev/null 2>&1; then
  warn "branch '$(git branch --show-current)' has no upstream; \`git pull\` will fail"
else
  ok "on '$(git branch --show-current)', tracking $(git rev-parse --abbrev-ref '@{upstream}')"
fi

# --------------------------------------------------------------------------- env files
ROOT_ENV="$REPO/.env"
SERVER_ENV="$REPO/server/.env"

for f in "$ROOT_ENV" "$SERVER_ENV"; do
  if [ ! -f "$f" ]; then
    fail "missing ${f#$REPO/}"
    note "run \`make setup\` to seed it from the example, then fill it in."
  fi
done

if [ ! -f "$ROOT_ENV" ] || [ ! -f "$SERVER_ENV" ]; then
  echo
  printf '%s%d failed%s -- cannot check further without the env files.\n' "$RED" "$FAILURES" "$OFF"
  exit 1
fi
ok "both env files present"

# --------------------------------------------------------------------------- NODE_ENV
# The single most dangerous variable. It gates ALLOWED_ORIGINS being required, `trust proxy`,
# the spool's boot-fail, and whether CORS accepts any localhost origin -- all at once. If it is
# missing the server boots "fine" with all four silently off.
NODE_ENV_VAL="$(getenv_val "$SERVER_ENV" NODE_ENV)"
if [ "$NODE_ENV_VAL" != "production" ]; then
  fail "server/.env has NODE_ENV='${NODE_ENV_VAL:-<unset>}', expected 'production'"
  note "this silently disables: required ALLOWED_ORIGINS, trust proxy (-> the rate limiter"
  note "buckets the whole internet into one counter), the spool boot-fail, and it makes CORS"
  note "accept any localhost origin."
else
  ok "NODE_ENV=production in server/.env"
fi

if ! grep -q "NODE_ENV: *'production'" "$REPO/ecosystem.config.cjs" 2>/dev/null; then
  fail "ecosystem.config.cjs does not set NODE_ENV: 'production'"
else
  ok "NODE_ENV=production in ecosystem.config.cjs"
fi

# --------------------------------------------------------------------------- required keys
# Mirrors REQUIRED_ENV in server/env.js.
MISSING=()
for key in JWT_SECRET RECAPTCHA_SECRET ADMIN_API_KEY AUTH0_DOMAIN AIRTABLE_PAT AIRTABLE_BASE_ID ALLOWED_ORIGINS; do
  [ -z "$(getenv_val "$SERVER_ENV" "$key")" ] && MISSING+=("$key")
done
if [ ${#MISSING[@]} -gt 0 ]; then
  fail "server/.env is missing or has empty: ${MISSING[*]}"
  note "the server would exit(1) at boot. Same list as REQUIRED_ENV in server/env.js."
else
  ok "all required server secrets are set"
fi

# Mirrors REQUIRED_PROD_ENV in vite.config.js. Catching these here turns a build-time throw
# (after the pull, after npm ci) into a failure before anything is touched.
VITE_MISSING=()
for key in VITE_API_URL VITE_AUTH0_DOMAIN VITE_AUTH0_CLIENT_ID VITE_RECAPTCHA_SITE_KEY; do
  [ -z "$(getenv_val "$ROOT_ENV" "$key")" ] && VITE_MISSING+=("$key")
done
if [ "$(getenv_val "$ROOT_ENV" VITE_EMAIL_ACK_ENABLED)" != "false" ]; then
  for key in VITE_EMAILJS_SERVICE_ID VITE_EMAILJS_TEMPLATE_ID VITE_EMAILJS_PUBLIC_KEY; do
    [ -z "$(getenv_val "$ROOT_ENV" "$key")" ] && VITE_MISSING+=("$key")
  done
fi
if [ ${#VITE_MISSING[@]} -gt 0 ]; then
  fail ".env is missing or has empty: ${VITE_MISSING[*]}"
  note "the frontend build would throw. Set VITE_EMAIL_ACK_ENABLED=false to drop the EmailJS trio."
else
  ok "all required VITE_* build vars are set"
fi

# --------------------------------------------------------------------------- the origin cross-check
# The highest-value check in this script. Browsers send Origin on every non-GET request, and
# every call this frontend makes is a POST -- so same-origin does NOT bypass CORS. If these two
# strings disagree, the site renders perfectly and EVERY login and submit returns 403.
API_URL="$(getenv_val "$ROOT_ENV" VITE_API_URL)"
ORIGINS="$(getenv_val "$SERVER_ENV" ALLOWED_ORIGINS)"

if [ -n "$API_URL" ] && [ -n "$ORIGINS" ]; then
  case "$API_URL" in
    */) fail "VITE_API_URL has a trailing slash: '$API_URL'"
        note "the code builds \${VITE_API_URL}/api/... so this yields //api/..." ;;
  esac
  case "$API_URL" in
    https://*) ;;
    *) warn "VITE_API_URL is not https: '$API_URL'"
       note "Auth0's popup and reCAPTCHA both effectively require https." ;;
  esac

  # exact match against one of the comma-separated entries
  FOUND=0
  IFS=',' read -ra ORIGIN_LIST <<< "$ORIGINS"
  for o in "${ORIGIN_LIST[@]}"; do
    o="$(echo "$o" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    [ "$o" = "$API_URL" ] && FOUND=1
  done

  if [ "$FOUND" -eq 1 ]; then
    ok "VITE_API_URL is listed in ALLOWED_ORIGINS ($API_URL)"
  else
    fail "VITE_API_URL is NOT in ALLOWED_ORIGINS"
    note "VITE_API_URL     = '$API_URL'   (.env)"
    note "ALLOWED_ORIGINS  = '$ORIGINS'   (server/.env)"
    note "They must contain the identical string. Otherwise the site loads fine and every"
    note "login and submit gets a 403 -- because the browser sends Origin on POSTs even"
    note "when the API is on the same host."
  fi
fi

# --------------------------------------------------------------------------- spool
SPOOL="$(getenv_val "$SERVER_ENV" SPOOL_DIR)"
SPOOL="${SPOOL:-/var/lib/college-collab/spool}"

if [ ! -d "$SPOOL" ]; then
  fail "spool dir does not exist: $SPOOL"
  note "run \`make setup\` (it needs sudo once). The server refuses to boot without it,"
  note "deliberately -- a failed Airtable write would otherwise be lost with no recovery."
elif [ ! -w "$SPOOL" ]; then
  fail "spool dir is not writable by $(id -un): $SPOOL"
else
  ok "spool dir writable: $SPOOL"
fi

# It must live OUTSIDE the checkout. Inside, a single `git clean -xdf` erases the only copy of
# every submission Airtable rejected.
case "$(cd "$SPOOL" 2>/dev/null && pwd || echo "$SPOOL")" in
  "$REPO"/*|"$REPO")
    fail "spool dir is INSIDE the repo: $SPOOL"
    note "one \`git clean -xdf\` would delete applicant submissions. Move it to /var/lib." ;;
esac

if [ -d "$SPOOL" ]; then
  PERMS="$(stat -c '%a' "$SPOOL" 2>/dev/null || stat -f '%Lp' "$SPOOL" 2>/dev/null)"
  case "$PERMS" in
    *[2367]) warn "spool dir is world-readable (mode $PERMS) and holds applicant PII"
             note "on a shared VM: chmod 750 $SPOOL" ;;
  esac
fi

# --------------------------------------------------------------------------- port
PORT="$(getenv_val "$SERVER_ENV" PORT)"
PORT="${PORT:-5000}"

if command -v ss >/dev/null 2>&1; then
  HOLDER="$(ss -ltnpH "sport = :$PORT" 2>/dev/null | head -n1)"
  if [ -z "$HOLDER" ]; then
    ok "port $PORT is free"
  elif echo "$HOLDER" | grep -q 'node'; then
    # ours (or another node app -- check the bind address below regardless)
    if echo "$HOLDER" | grep -qE '(^|[^0-9.])127\.0\.0\.1:'"$PORT"; then
      ok "port $PORT held by our node process, bound to 127.0.0.1"
    else
      fail "port $PORT is bound to a public address, not 127.0.0.1"
      note "$(echo "$HOLDER" | awk '{print $4}')"
      note "a directly-reachable Node lets callers forge X-Forwarded-For and bypass the rate"
      note "limiter entirely. Restart it: the fixed code binds loopback by default."
    fi
  else
    fail "port $PORT is taken by something that is not us"
    note "$HOLDER"
    note "this VM runs other services. Pick a free PORT in server/.env and update the nginx vhost."
  fi
else
  warn "ss not available; cannot check port $PORT"
fi

# --------------------------------------------------------------------------- nginx cross-check
# Best-effort. Port drift between server/.env and the vhost is otherwise a silent 502.
NGINX_CONF="$(grep -rls "college-collab" /etc/nginx/sites-enabled/ 2>/dev/null | head -n1)"
if [ -n "$NGINX_CONF" ]; then
  if grep -q "127.0.0.1:$PORT" "$NGINX_CONF"; then
    ok "nginx proxies to 127.0.0.1:$PORT ($(basename "$NGINX_CONF"))"
  else
    fail "nginx vhost does not proxy to port $PORT"
    note "$(grep -n 'proxy_pass' "$NGINX_CONF" | head -n2)"
    note "server/.env says PORT=$PORT. A mismatch is a silent 502 on every /api call."
  fi

  if grep -q "root $REPO/dist" "$NGINX_CONF"; then
    ok "nginx serves $REPO/dist"
  else
    warn "nginx root does not look like $REPO/dist"
    note "$(grep -n '^\s*root' "$NGINX_CONF" | head -n1)"
  fi
else
  note "no nginx vhost found for college-collab (skipping cross-check; run \`make nginx-print\`)"
fi

# --------------------------------------------------------------------------- verdict
echo
if [ "$FAILURES" -gt 0 ]; then
  printf '%spreflight FAILED: %d problem(s), %d warning(s). Nothing was changed.%s\n' \
    "$RED" "$FAILURES" "$WARNINGS" "$OFF"
  exit 1
fi
printf '%spreflight passed%s (%d warning(s)).\n' "$GRN" "$OFF" "$WARNINGS"
