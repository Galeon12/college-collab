# Deployment for the Azure Linux VM. Run these ON the VM, from the clone.
#
#   make setup     once, ever
#   make deploy    every time. This is the whole deploy.
#
# Everything else is ad hoc. `make deploy` runs preflight first and changes nothing if it fails.

SHELL := /bin/bash
REPO  := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))
APP   := college-collab-api

# server/.env is the single source of truth for PORT -- nginx's proxy_pass has to agree with it,
# and one file is easier to keep honest than two.
PORT      := $(shell sed -n 's/^[[:space:]]*PORT[[:space:]]*=[[:space:]]*//p' $(REPO)/server/.env 2>/dev/null | tail -n1 || true)
PORT      := $(if $(PORT),$(PORT),5000)
SPOOL_DIR := $(shell sed -n 's/^[[:space:]]*SPOOL_DIR[[:space:]]*=[[:space:]]*//p' $(REPO)/server/.env 2>/dev/null | tail -n1 || true)
SPOOL_DIR := $(if $(SPOOL_DIR),$(SPOOL_DIR),/var/lib/college-collab/spool)

.PHONY: help setup preflight deploy build test restart smoke status logs spool nginx-print

help:
	@echo "college-collab -- deployment"
	@echo
	@echo "  make setup        one-time: spool dir, env files, pm2 boot persistence"
	@echo "  make deploy       pull, install, test, build, reload, smoke. THE deploy command."
	@echo
	@echo "  make preflight    check everything is deployable. Read-only, changes nothing."
	@echo "  make restart      reload the API without pulling or rebuilding"
	@echo "  make status       pm2 status + spool depth"
	@echo "  make logs         tail the API logs"
	@echo "  make spool        pending + dead-lettered submissions"
	@echo "  make smoke        prove the running app works"
	@echo "  make nginx-print  render the vhost for this checkout, ready to install"
	@echo
	@echo "  repo:  $(REPO)"
	@echo "  port:  $(PORT)     spool: $(SPOOL_DIR)"

# ---------------------------------------------------------------------------------------------
# One-time. Everything here is idempotent and safe to re-run.
# ---------------------------------------------------------------------------------------------
setup:
	@echo "==> spool directory"
	@# Created by root and chowned to us, deliberately: the app must be able to WRITE this but
	@# not CREATE it. A spool the app can conjure for itself is a spool in the wrong place --
	@# that is exactly how the old /home/data path went unnoticed. 0750 because the spool holds
	@# applicant PII and this is a shared VM.
	sudo install -d -m 0750 -o "$$(id -un)" -g "$$(id -gn)" "$(SPOOL_DIR)"
	@echo "    $(SPOOL_DIR) -> $$(stat -c '%U:%G %a' $(SPOOL_DIR))"
	@echo
	@echo "==> env files"
	@# Never overwrite. These hold live secrets.
	@if [ ! -f $(REPO)/.env ]; then \
	  cp $(REPO)/.env.example $(REPO)/.env; echo "    created .env from the example -- FILL IT IN"; \
	else echo "    .env already exists (left alone)"; fi
	@if [ ! -f $(REPO)/server/.env ]; then \
	  cp $(REPO)/server/.env.example $(REPO)/server/.env; echo "    created server/.env from the example -- FILL IT IN"; \
	else echo "    server/.env already exists (left alone)"; fi
	@echo
	@echo "==> pm2 boot persistence"
	@if pm2 startup 2>/dev/null | grep -q 'sudo env'; then \
	  echo "    NOT registered. Run the command pm2 just printed above, then \`pm2 save\`."; \
	else echo "    already registered"; fi
	@if ! pm2 list 2>/dev/null | grep -q pm2-logrotate; then \
	  echo "    pm2-logrotate not installed. Recommended: pm2 install pm2-logrotate"; fi
	@echo
	@echo "Next:"
	@echo "  1. Fill in .env and server/.env (VITE_API_URL and ALLOWED_ORIGINS must MATCH)."
	@echo "  2. make nginx-print  -- then install the vhost and run certbot. See the header."
	@echo "  3. make deploy"

# ---------------------------------------------------------------------------------------------
# The deploy. Read-only checks, then pull, then build, then swap.
# ---------------------------------------------------------------------------------------------
preflight:
	@bash $(REPO)/deploy/preflight.sh

deploy: preflight
	@echo
	@echo "==> pull"
	@# Never `git clean`: it would delete .env and server/.env (both gitignored), and the spool
	@# too if anyone ever moves it back inside the repo.
	git -C $(REPO) pull --ff-only
	@echo
	@echo "==> preflight again (the pull may have introduced a newly-required variable)"
	@bash $(REPO)/deploy/preflight.sh
	@echo
	@echo "==> install"
	@# Root keeps devDeps: vite and typescript live there and do the build.
	cd $(REPO) && npm ci
	@# Server needs prod deps only. The test suite uses node:test (built in), so it still runs.
	cd $(REPO)/server && npm ci --omit=dev
	@echo
	@echo "==> test"
	@# Safe to run against a live box: server/test/setup.js sets NODE_ENV=test and a temp
	@# SPOOL_DIR *before* env.js loads, and dotenv does not override existing vars -- so the
	@# suite cannot touch the real spool. Tests run BEFORE the build, so a failure here means
	@# nothing has changed: dist/ is still the old build and pm2 still holds the old code.
	cd $(REPO)/server && npm test
	@echo
	@echo "==> build frontend"
	@# cwd MUST be the repo root: vite.config.js calls loadEnv(mode, process.cwd()).
	cd $(REPO) && npm run build
	@echo
	@echo "==> reload api"
	@# startOrReload: starts if absent, reloads if running, so the first deploy and the fiftieth
	@# are the same command. --update-env is NOT optional -- without it pm2 reuses the env
	@# snapshot from the original start and an edited NODE_ENV silently does not take effect.
	pm2 startOrReload $(REPO)/ecosystem.config.cjs --update-env
	pm2 save --force
	@echo
	@$(MAKE) --no-print-directory smoke
	@echo
	@echo "deployed: $$(git -C $(REPO) rev-parse --short HEAD)  $$(git -C $(REPO) log -1 --format=%s)"

build:
	cd $(REPO) && npm run build

test:
	cd $(REPO)/server && npm test

restart:
	pm2 startOrReload $(REPO)/ecosystem.config.cjs --update-env
	@$(MAKE) --no-print-directory smoke

# ---------------------------------------------------------------------------------------------
# Prove the running app actually works. Runs at the end of every deploy.
# ---------------------------------------------------------------------------------------------
smoke:
	@echo "==> smoke"
	@# 1. The single-instance invariant. If someone "optimises" this to cluster mode, the deploy
	@#    fails here rather than silently losing spool entries and duplicating Airtable rows.
	@mode=$$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const a=JSON.parse(s).find(x=>x.name==='$(APP)');console.log(a?a.pm2_env.exec_mode:'missing')})"); \
	 count=$$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).filter(x=>x.name==='$(APP)').length)})"); \
	 if [ "$$mode" != "fork_mode" ] || [ "$$count" != "1" ]; then \
	   echo "  FAIL  pm2 is running '$$mode' with $$count instance(s); required: fork_mode, 1"; \
	   echo "        This server is single-instance BY DESIGN -- see ecosystem.config.cjs."; \
	   echo "        Cluster mode silently loses spooled submissions and duplicates Airtable rows."; \
	   exit 1; \
	 fi; \
	 echo "  ok    pm2: fork mode, 1 instance"
	@# 2. Node is up and answering on loopback.
	@if curl -fsS --max-time 5 "http://127.0.0.1:$(PORT)/" >/dev/null 2>&1; then \
	   echo "  ok    api responding on 127.0.0.1:$(PORT)"; \
	 else \
	   echo "  FAIL  api not responding on 127.0.0.1:$(PORT)"; \
	   echo "        pm2 logs $(APP) --lines 40"; \
	   exit 1; \
	 fi
	@# 3. Bound to loopback ONLY. A publicly-bound Node lets callers forge X-Forwarded-For and
	@#    walk straight past every rate limiter.
	@if command -v ss >/dev/null 2>&1; then \
	   if ss -ltnH "sport = :$(PORT)" | grep -qE '(0\.0\.0\.0|\*|\[::\]):$(PORT)'; then \
	     echo "  FAIL  port $(PORT) is bound publicly, not to 127.0.0.1"; exit 1; \
	   fi; \
	   echo "  ok    bound to loopback only"; \
	 fi
	@# 4. The spool is writable. If it is not, a failed Airtable write is lost forever.
	@if [ -w "$(SPOOL_DIR)" ]; then echo "  ok    spool writable ($(SPOOL_DIR))"; \
	 else echo "  FAIL  spool not writable: $(SPOOL_DIR)"; exit 1; fi

# ---------------------------------------------------------------------------------------------
# Ad hoc
# ---------------------------------------------------------------------------------------------
status:
	@pm2 describe $(APP) 2>/dev/null | grep -E 'status|exec mode|instances|node version|uptime|restarts|script path' || pm2 status
	@echo
	@$(MAKE) --no-print-directory spool

logs:
	pm2 logs $(APP) --lines 100

# Replaces the runbook. Everything in these files was shown a SUCCESS message to the applicant
# -- a spooled write answers 202 -- so a dead-lettered entry is a person who believes they
# applied and did not.
spool:
	@pending=$$(wc -l < "$(SPOOL_DIR)/failed-writes.jsonl" 2>/dev/null || echo 0); \
	 dead=$$(wc -l < "$(SPOOL_DIR)/dead-letter.jsonl" 2>/dev/null || echo 0); \
	 corrupt=$$(wc -l < "$(SPOOL_DIR)/corrupt.jsonl" 2>/dev/null || echo 0); \
	 echo "spool: $(SPOOL_DIR)"; \
	 echo "  pending      $$pending   (drainer retries every 60s)"; \
	 echo "  dead-letter  $$dead   NEEDS A HUMAN -- never retried automatically"; \
	 echo "  corrupt      $$corrupt"; \
	 if [ "$$dead" -gt 0 ]; then \
	   echo; \
	   echo "  Most common cause: an Airtable column name does not match server/db/airtable.js"; \
	   echo "  (422 -> permanent -> dead-lettered, while the applicant saw a success message)."; \
	   echo "  Fix the mismatch, then replay:"; \
	   echo "    cd $(SPOOL_DIR) && jq -c '.attempts=0 | .lastError=null' dead-letter.jsonl >> failed-writes.jsonl && rm dead-letter.jsonl"; \
	 fi

# Render the vhost with this checkout's real path and port. Prints to stdout so you can inspect
# it before installing. The Makefile deliberately never touches nginx: this VM serves other
# sites, and a bad reload takes them all down.
nginx-print:
	@if [ -z "$(SERVER_NAME)" ]; then \
	  echo "usage: make nginx-print SERVER_NAME=apply.yourdomain.com" >&2; exit 1; fi
	@sed -e 's|__REPO__|$(REPO)|g' \
	     -e 's|__PORT__|$(PORT)|g' \
	     -e 's|__SERVER_NAME__|$(SERVER_NAME)|g' \
	     $(REPO)/deploy/nginx/college-collab.conf.template
