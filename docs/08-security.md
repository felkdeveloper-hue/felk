# 08 — Security Architecture

> Defense-in-depth for an enterprise fashion commerce API.

---

## 1. Threat Model (Summary)

| Asset           | Threats                                                |
| --------------- | ------------------------------------------------------ |
| Accounts        | Credential stuffing, token theft, privilege escalation |
| Orders/Payments | Replay webhooks, spoofed paid status, refund abuse     |
| Inventory       | Oversell races, unauthorized adjusts                   |
| PII             | Customer data leakage, log exfiltration                |
| Admin           | CSRF, XSS → session abuse, RBAC misconfig              |

---

## 2. Authentication (JWT + Refresh)

### Access Token (JWT)

- Short-lived (`15m` default)
- Claims: `sub` (userId), `roleId`, `typ: access`, `jti`
- Sent via `Authorization: Bearer`
- Signed with strong secret/algorithm (HS256 minimum; RS256 preferred at scale)

### Refresh Token

- Long-lived (`7d`–`30d`)
- **Opaque** random string; only **hash** stored in `device_sessions`
- Delivered httpOnly + Secure + SameSite cookie (web) or secure store (mobile later)
- **Rotation:** each refresh issues new token; old invalidated
- **Reuse detection:** if revoked token presented → revoke entire `familyId`

### Session Management

- One session row per device
- List/revoke endpoints for user
- Admin force-logout = revoke all sessions

---

## 3. Password & OTP

| Control        | Spec                                                 |
| -------------- | ---------------------------------------------------- |
| Hashing        | argon2id or bcrypt cost ≥ 12                         |
| Policy         | Min length 8–12; block common passwords              |
| Lockout        | After N failures → `lockedUntil` exponential backoff |
| Reset          | Time-boxed hashed token / OTP; single use            |
| OTP            | Hashed codes; TTL 5–10 min; attempt cap              |
| MFA (phase 2+) | TOTP optional for staff                              |

---

## 4. RBAC

- Deny-by-default permission checks
- Super Admin actions audited
- See [05-rbac.md](./05-rbac.md)

---

## 5. Transport & HTTP Hardening

| Control       | Implementation                                                                       |
| ------------- | ------------------------------------------------------------------------------------ |
| TLS           | Cloudflare/edge termination + HTTPS only                                             |
| Helmet        | Secure headers (CSP tuned for admin/web)                                             |
| CORS          | Explicit origin allowlist; credentials carefully                                     |
| Compression   | Enabled; avoid BREACH on secrets in responses                                        |
| Rate limiting | Redis-backed; stricter on `/auth/*`, `/webhooks/*`, `/contact`                       |
| Request size  | Cap JSON body (e.g. 1mb); multipart separate limits                                  |
| CSRF          | Double-submit or synchronizer token when cookie auth used for mutating browser calls |

---

## 6. Device Sessions & IP Tracking

Store on login/refresh:

- IP, userAgent, geo (optional), deviceLabel
- Surface to user (“sessions”)
- Flag anomalous IP change for staff (optional alert)

---

## 7. Audit & Activity Logs

| Log             | When                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `audit_logs`    | Authz-sensitive mutations, login failures (optional sample), refunds, RBAC, settings, inventory adjusts |
| `activity_logs` | Softer UI events (page views admin — optional)                                                          |

Retain audit ≥ 1 year (policy-dependent). Immutable inserts only.

---

## 8. Webhook Verification

For each payment provider:

1. Raw body signature validation
2. Timestamp tolerance to prevent replay
3. Idempotency store
4. Amount/currency binding to payment intent
5. Do not accept “paid” from client return URL alone

---

## 9. Data Protection

- Encrypt sensitive fields at rest if required (gift card raw codes never stored)
- Redact secrets in logs (tokens, passwords, webhook secrets)
- Soft-deleted PII purge job
- Admin product cost prices restricted by permission
- Separate public settings endpoint (no secrets)

---

## 10. File Uploads

- Multer memory/disk with MIME allowlist
- Sharp re-encode images (strip EXIF)
- Virus scan later at scale
- Private S3 with signed URLs for invoices; public CDN for catalog

---

## 11. API Abuse Controls

| Endpoint class   | Limit example            |
| ---------------- | ------------------------ |
| Login            | 5–10 / 15 min / IP+email |
| Register         | 5 / hour / IP            |
| Refresh          | 30 / hour / session      |
| Contact          | 5 / hour / IP            |
| Analytics ingest | 120 / min / IP           |
| Catalog read     | Generous, cacheable      |

Respond `429` + `Retry-After`.

---

## 12. Socket Security

- Authenticate on handshake with access token
- Room membership authorized (user’s own order id)
- Redis adapter for multi-instance
- No privileged admin events without permission check

---

## 13. Secure Development Rules

1. No secrets in git; rotate via env
2. Dependency scanning in CI (future Dependabot)
3. Least privilege Mongo/Redis users
4. Production `NODE_ENV=production` disables verbose errors
5. Central `AppError` — never leak stack to clients

---

## 14. Incident Response Hooks (Design)

- Kill switch setting: `checkout.enabled = false`
- Mass session revoke endpoint for Super Admin
- Payment gateway disable flags in settings

---

## Related

- [06-payment-flow.md](./06-payment-flow.md)
- [05-rbac.md](./05-rbac.md)
- [01-system-overview.md](./01-system-overview.md)
