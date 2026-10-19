# CodeGuard Security Review

Reviewed folder: `/Users/kennedy.toomey/Documents/secure-coding-agent-research/gpt-5.5-security`

Reviewer: CodeGuard security skill with `codeguard-security` subagent

## Findings

### 1. High: Spoofable client IP can bypass rate limits

File: `server/src/app.js`, lines 18 and 56-68

`server/src/app.js` sets `trust proxy` globally while rate limits are keyed from request IP. If the API is reachable directly, or if the upstream proxy does not scrub inbound `X-Forwarded-For`, an attacker can rotate that header so `express-rate-limit` treats each login attempt as a different client.

Impact: Auth and API rate limits can be bypassed, weakening brute-force and abuse controls.

Exploit scenario: An attacker repeatedly posts to `/api/auth/login` while changing `X-Forwarded-For`, avoiding the configured auth limiter.

Remediation: Default `trust proxy` to `false`. In production, configure explicit trusted proxy hops or CIDRs only behind a known proxy, and ensure the edge strips inbound forwarded headers.

### 2. Medium: Build job has deploy/OIDC permissions while running npm code

File: `.github/workflows/deploy-pages.yml`, lines 9-12 and 31-35

The workflow grants `pages: write` and `id-token: write` at workflow scope before `npm ci` and `npm run build`. A compromised dependency lifecycle script or build-time package can run with permissions that are only needed by the deploy job.

Impact: Malicious package code could tamper with GitHub Pages deployment or request an OIDC token for any cloud trust configured for the repository.

Exploit scenario: A compromised npm package executes during install/build and abuses `GITHUB_TOKEN` or OIDC permissions available to the build job.

Remediation: Move permissions to job level. The build job should use only `contents: read`; the deploy job should get `pages: write` and `id-token: write`. Pin GitHub Actions by full commit SHA where practical, and consider `npm ci --ignore-scripts` if compatible.

### 3. Medium: Uploads are not malware-scanned or quarantined

Files: `server/src/routes/documents.js`, lines 107-121; `server/src/security/uploads.js`, lines 5-30 and 60-82

Uploads are persisted after extension, MIME type, and magic-byte checks. Those checks are useful, but they do not detect weaponized PDFs, malformed images targeting parser vulnerabilities, or malicious text/markdown content opened by users in local tools.

Impact: Authenticated users can store malicious files that managers or admins are expected to download from a trusted portal.

Exploit scenario: A member uploads a valid-looking malicious PDF; a manager downloads it through the portal and opens it locally.

Remediation: Write uploads to quarantine, scan with antivirus/CDR or a managed malware scanning service, mark documents downloadable only after a clean verdict, and log scan failures.

### 4. Medium: No upload quota can exhaust disk

File: `server/src/routes/documents.js`, lines 16-22 and 117-121

The app enforces a per-file upload size but does not enforce per-user or global storage quotas before writing files permanently.

Impact: Any authenticated account can repeatedly upload files up to `MAX_UPLOAD_BYTES`, filling disk and disrupting the API host.

Exploit scenario: A self-registered or compromised account uploads many 10 MB files until disk capacity is exhausted.

Remediation: Enforce per-user and global storage quotas transactionally before `fs.writeFile`, add stricter upload-specific rate limits, and add cleanup or retention jobs.

### 5. Low: README encourages inline admin password seeding

File: `README.md`, line 13

The setup example passes `SEED_ADMIN_PASSWORD` inline in the shell command. Operators may replace the placeholder with a real password, which can land in shell history and may be visible through local process/environment inspection.

Impact: The initial admin password can be exposed through local history or process metadata.

Exploit scenario: A local user or leaked terminal history reveals the seeded admin password.

Remediation: Document a safer flow using a protected secret store, CI secret, or hidden TTY prompt. Avoid inline secrets in commands.

## Positive Observations

- No apparent hardcoded live credentials were found. Secret-like hits were placeholders or test values.
- No X.509 certificate material was found.
- Passwords are hashed with Argon2id.
- Session JWTs pin `HS256`, validate issuer/audience, and are backed by server-side revocation records.
- CSRF checks are applied to protected state-changing routes.
- SQL queries reviewed use PostgreSQL bind parameters.
- User-controlled document, comment, and profile fields are rendered with `textContent` or otherwise escaped.
- Production dependency audit reported no known vulnerabilities.

## Verification

Commands run:

```bash
npm test
npm audit --omit=dev --audit-level=moderate
```

Results:

- `npm test` passed: 2 tests passed, 0 failed.
- `npm audit --omit=dev --audit-level=moderate` found 0 vulnerabilities.

No source files were edited as part of the review.
