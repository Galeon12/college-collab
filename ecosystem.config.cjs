// pm2 process definition for the API.
//
// CommonJS ON PURPOSE. package.json declares "type": "module", so a .js file here would be
// parsed as ESM and `module.exports` would throw. The .cjs extension is what makes this
// loadable. Do not rename it.
//
// Used by the Makefile as:  pm2 startOrReload ecosystem.config.cjs --update-env

const path = require('node:path');

const REPO = __dirname;

module.exports = {
  apps: [{
    name: 'college-collab-api',

    // Exec node directly rather than `npm start`. An npm shim between pm2 and node does not
    // reliably forward signals, which would silently defeat the graceful shutdown in
    // server/index.js -- requests would be killed mid-Airtable-write instead of draining.
    script: 'index.js',
    interpreter: 'node',

    // MUST be the server/ directory, not the repo root. server/env.js calls dotenv.config()
    // with no path, so it resolves `.env` relative to process.cwd(). Point this at the repo
    // root and server/.env is never read: no JWT_SECRET, no AIRTABLE_PAT, and env.js exits 1.
    cwd: path.join(REPO, 'server'),

    // =========================================================================================
    //  DO NOT set exec_mode: 'cluster'. DO NOT set instances > 1, or 'max'.
    //
    //  This server is single-instance BY DESIGN. Three mechanisms assume exactly one Node
    //  process, and NOT ONE of them throws an error if you break that. The app keeps serving
    //  traffic and quietly does the wrong thing:
    //
    //   1. server/db/spool.js -- the durable write spool serialises every append through ONE
    //      in-process promise chain. Two processes interleave partial lines into
    //      failed-writes.jsonl, and reconcileSpool() rewrites the whole file from one process's
    //      view of it, DELETING the other's entries. That is silent loss of applicant
    //      submissions, inside the machinery built to prevent exactly that.
    //
    //   2. server/index.js -- `inFlightEmails` is an in-process Set that closes the
    //      check-then-create race on submit. N processes means N chances to write the same
    //      applicant twice, and Airtable has no unique constraint to catch it. DUPLICATE ROWS.
    //
    //   3. express-rate-limit uses its default in-memory store, so counters are per-process.
    //      N processes means every limit is silently N times higher than it reads. The login
    //      brute-force budget of 10 per 15 minutes becomes 10 * N.
    //
    //  Clustering safely is not a config change: it needs a shared queue, a distributed lock,
    //  and a Redis-backed rate limit store. `make smoke` asserts fork/1 and fails the deploy if
    //  this is ever changed.
    // =========================================================================================
    exec_mode: 'fork',
    instances: 1,

    // Set here AS WELL AS in server/.env, deliberately.
    //
    // This single variable gates: whether ALLOWED_ORIGINS is required at all, `trust proxy`
    // (without it every client looks like nginx and the rate limiters bucket the whole internet
    // into one counter), the spool's refusal to boot when its directory is unwritable, and
    // whether CORS quietly accepts any localhost origin. Miss it and the server boots "fine"
    // with all four silently off. Belt and braces; `make preflight` asserts both copies agree.
    //
    // PORT is deliberately NOT set here. server/.env is its single source of truth, because
    // nginx's proxy_pass must agree with it and one file is easier to keep honest than two.
    // (pm2's env would win over dotenv anyway, so a PORT here could silently desync nginx.)
    env: {
      NODE_ENV: 'production',
    },

    // server/index.js gives itself 10s to finish in-flight requests before force-exiting.
    // pm2's default kill_timeout is 1600ms, which would SIGKILL the process 8.4 seconds before
    // its own graceful path gives up -- making that graceful shutdown a fiction. 11s > 10s, so
    // the app always exits on its own terms.
    kill_timeout: 11_000,

    autorestart: true,
    restart_delay: 2_000,
    // env.js and spool.js both process.exit(1) on bad config. These turn that into a visible
    // `errored` status in `pm2 status` after 10 fast failures, rather than an invisible
    // crash-loop that looks like it is running.
    min_uptime: '30s',
    max_restarts: 10,

    // Never watch. `git pull` rewrites these files mid-deploy, and watching would restart the
    // process into a half-updated tree.
    watch: false,

    time: true,   // timestamp every log line
  }],
};
