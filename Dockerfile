# college-collab, for AKS. Two targets, because the VM served two things:
#
#   --target api   the Express server (server/), behind /api/
#   --target web   nginx serving the Vite build (dist/) at the domain ROOT
#
#   docker buildx build --platform linux/arm64 --provenance=false \
#     --target api -t <registry>/algouni/college-collab-api:<sha> .
#   docker buildx build --platform linux/arm64 --provenance=false \
#     --target web -t <registry>/algouni/college-collab-web:<sha> .
#
# THE FRONTEND MUST BE AT A DOMAIN ROOT. deploy/nginx/college-collab.conf.template
# says so at line 22 and it is a build property, not a preference: the Vite build
# emits ABSOLUTE asset URLs (/assets/...), so mounting this under a subpath of
# another host serves a page whose every asset 404s. It needs its own hostname.
#
# THE API IS SINGLE-INSTANCE BY DESIGN. ecosystem.config.cjs spells out why, and
# none of the three mechanisms errors if you break it -- the app keeps serving
# traffic and quietly does the wrong thing:
#   1. server/db/spool.js serialises every append through ONE in-process promise
#      chain, and reconcileSpool() rewrites the whole file from one process's
#      view of it. Two processes means SILENT LOSS of applicant submissions,
#      inside the machinery built to prevent exactly that.
#   2. `inFlightEmails` is an in-process Set closing the check-then-create race
#      on submit. N processes means N chances to write the same applicant, and
#      Airtable has no unique constraint to catch it.
#   3. express-rate-limit uses its in-memory store, so every limit is silently
#      N times higher than it reads.
# So the Deployment is replicas: 1 with strategy Recreate, and the spool needs a
# PVC. Clustering safely is not a config change; it needs a shared queue, a
# distributed lock and a Redis-backed rate limiter.

# ---- frontend build ---------------------------------------------------------
FROM node:20-bookworm-slim AS web-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# THE FRONTEND'S CONFIG IS BAKED IN AT BUILD TIME, so it arrives as build args
# and this image is ENVIRONMENT-SPECIFIC. vite.config.js:25-45 refuses to build
# without these, and `loadEnv` folds them into the bundle -- there is no runtime
# override, so one image cannot serve two environments. Same shape as
# SEO_INDEXING in the v2 app.
#
# They are build args and not secrets: every one ships to the browser. The real
# SECRETS (JWT_SECRET, AIRTABLE_PAT, RECAPTCHA_SECRET, ADMIN_API_KEY) belong to
# the API target and are runtime env, never baked.
#
# Setting VITE_EMAIL_ACK_ENABLED=false drops the three EMAILJS values and leaves
# four required -- vite.config.js says so itself when only those are missing.
ARG VITE_API_URL
ARG VITE_AUTH0_DOMAIN
ARG VITE_AUTH0_CLIENT_ID
ARG VITE_RECAPTCHA_SITE_KEY
ARG VITE_EMAIL_ACK_ENABLED=true
ARG VITE_EMAILJS_SERVICE_ID
ARG VITE_EMAILJS_TEMPLATE_ID
ARG VITE_EMAILJS_PUBLIC_KEY
ENV VITE_API_URL=$VITE_API_URL \
    VITE_AUTH0_DOMAIN=$VITE_AUTH0_DOMAIN \
    VITE_AUTH0_CLIENT_ID=$VITE_AUTH0_CLIENT_ID \
    VITE_RECAPTCHA_SITE_KEY=$VITE_RECAPTCHA_SITE_KEY \
    VITE_EMAIL_ACK_ENABLED=$VITE_EMAIL_ACK_ENABLED \
    VITE_EMAILJS_SERVICE_ID=$VITE_EMAILJS_SERVICE_ID \
    VITE_EMAILJS_TEMPLATE_ID=$VITE_EMAILJS_TEMPLATE_ID \
    VITE_EMAILJS_PUBLIC_KEY=$VITE_EMAILJS_PUBLIC_KEY

# `tsc && vite build` -- the typecheck is part of the build script, so a type
# error fails the image rather than shipping.
RUN npm run build

# ---- api dependencies -------------------------------------------------------
FROM node:20-bookworm-slim AS api-deps
WORKDIR /app/server
# server/ is its own npm project, NOT a workspace of the root one.
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- api runtime ------------------------------------------------------------
FROM node:20-bookworm-slim AS api
ENV NODE_ENV=production
WORKDIR /app/server
COPY --from=api-deps /app/server/node_modules ./node_modules
COPY server/ ./

# The spool directory. server/db/spool.js REFUSES TO BOOT when this is not
# writable under NODE_ENV=production, which is the correct behaviour and also
# means the PVC has to be mounted here and owned by this uid.
ENV SPOOL_DIR=/var/lib/college-collab/spool
RUN mkdir -p /var/lib/college-collab/spool && chown -R 1000:1000 /var/lib/college-collab

# NODE_ENV=production is load-bearing beyond the usual: it gates whether
# ALLOWED_ORIGINS is required at all, `trust proxy` (without which every client
# looks like the ingress and the rate limiters bucket the whole internet into one
# counter), the spool's refusal to boot on an unwritable directory, and whether
# CORS quietly accepts any localhost origin. Miss it and the server boots "fine"
# with all four silently off.
USER 1000
EXPOSE 5000
ENV PORT=5000
# No shell: server/index.js installs its own SIGTERM handler and gives itself 10s
# to drain in-flight requests before force-exiting. A shell as PID 1 would not
# forward the signal and that graceful path would be fiction -- the same reason
# ecosystem.config.cjs sets kill_timeout above 10s. Set
# terminationGracePeriodSeconds > 10 on the pod for the same reason.
CMD ["node", "index.js"]

# ---- web runtime ------------------------------------------------------------
FROM nginx:1.27-alpine AS web
# Non-root under a runAsNonRoot PodSecurityContext: stock nginx:alpine writes to
# /var/cache/nginx, /var/run and /etc/nginx/conf.d as root and dies instantly
# otherwise. Same prep the Django web-static stage uses.
RUN chown -R 10001:0 /var/cache/nginx /var/run /etc/nginx/conf.d \
    && chmod -R g+w /var/cache/nginx /var/run /etc/nginx/conf.d
COPY --from=web-build /app/dist /usr/share/nginx/html
# The server block is NOT baked in: deploy/nginx/college-collab.conf.template
# carries __REPO__ and __PORT__ placeholders for the VM layout, and the pod's
# paths and upstream differ. Mount the rendered conf as a ConfigMap at
# /etc/nginx/conf.d/default.conf -- keeping the SPA fallback (`try_files $uri
# $uri/ /index.html`) and the `=404` rule for assets, which is what stops a
# missing .mp4 or .pdf being answered with the index page.
USER 10001
EXPOSE 8080
