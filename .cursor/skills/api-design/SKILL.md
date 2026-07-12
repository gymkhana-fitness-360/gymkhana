---
name: api-design
description: Reference for large-system HTTP and RPC boundaries—REST contracts, path/query/body rules, JSON, status codes, OpenAPI, auth (Bearer, OAuth2, Basic), authz (RBAC, ABAC, ACL), security (CORS, CSRF, XSS, injection, rate limits), REST vs GraphQL vs gRPC tradeoffs, lifecycle and versioning, optional private single-endpoint APIs with strict validation and JWT-aware rate limits. This repository enables always-on application via .cursor/rules/api-design-always-apply.md; use for route handlers, gateways, webhooks, auth edges, clients, and service contracts.
---

# API design

**Always apply** in this workspace: enforced by `.cursor/rules/api-design-always-apply.md` (`alwaysApply: true`). This file is the source of truth—shape HTTP surfaces, pick protocols, harden boundaries, prefer **contract-first** specs (OpenAPI, GraphQL schema, or proto) for anything external.

## Instructions

1. Classify the consumer (**public** third-party vs **browser** vs **owned** mobile/web) before choosing conventions.
2. For **public** APIs: standard verbs, meaningful **status codes**, stable resource URLs, documented errors, no secrets in URLs.
3. For **owned-only** high-churn clients: optional **private** pattern at end of this file is allowed if the team commits to it.
4. On every change: validate **authn + authz**, input shape, and rate/abuse limits for the operation.

## API contract

- **Contract** — allowed operations, request/response shapes, errors, versioning rules.
- **Abstraction** — expose operations, not raw storage layout.
- **Boundary** — implementations may change behind a stable interface.

## API styles

| Style | Transport | When |
|-------|-----------|------|
| **REST** | HTTP, usually JSON | Default; resource URLs; **stateless** requests; CDN/cache friendly. |
| **GraphQL** | HTTP, often one URL | Client-chosen fields; fewer round trips; needs **query cost limits**, batching against **N+1**, per-field **auth**. |
| **gRPC** | HTTP/2, Protobuf | Internal services; **streaming**; shared `.proto` contracts. |
| **SOAP** | HTTP, XML | Legacy integration only. |
| **WebSockets** | Long-lived socket | Server push, bidirectional realtime. |

**REST vs GraphQL (summary):** REST favors **caching** and simple CRUD tooling; GraphQL favors **flexible reads** and costs more in **gateway complexity** and resolver discipline. Learn REST before GraphQL.

## Design principles

- **Consistency** — naming, errors, pagination, versioning patterns.
- **Simplicity** — endpoints reflect use cases, not every internal table.
- **Security** — authn, authz, strict **input validation**, least privilege.
- **Performance** — pagination/cursors, safe caching headers, avoid GraphQL **N+1**.

## Process and lifecycle

**Approaches:** top-down (UX → API), bottom-up (data → API; avoid leaking internals), **contract-first** (spec before code).

**Lifecycle:** design (contract, errors, SLAs) → build/test against contract → deploy (staging → prod) → maintain patterns → **deprecate** with versions, migration window, sunset communication.

## JSON (REST)

Quoted keys; types: string, number, boolean, `null`, object, array. Not valid JSON: `undefined`, `Date`, functions.

## HTTP verbs

| Verb | Use | Idempotent |
|------|-----|------------|
| GET | Read | Yes (safe) |
| POST | Create | No — dedupe or accept duplicate risk |
| PUT | Replace full resource | Yes |
| PATCH | Partial update | Often yes if defined |
| DELETE | Delete | Yes |

Follow conventions so clients and caches behave; idempotent writes help retries.

## URLs: resources, nesting, queries

- Collections **plural** (`/posts`). **Path** = **which instance** (`/comments/321`).
- Version prefix common: `/api/v1/...`.
- **Nested:** `/posts/{id}/comments` — good for **few** access patterns.
- **Collection + query:** `/comments?postId=123` — good for **many** filters; optional params stack (`?sort=…&page=…`).
- **Method + path** = one logical interaction; routing implementation (one handler vs many) does not change the contract.

**Example (comments, base path omitted):**

| Action | Request |
|--------|---------|
| List for post | `GET /posts/{postId}/comments` |
| Create on post | `POST /posts/{postId}/comments` + JSON **body** |
| One comment | `GET /comments/{commentId}` |
| Update/delete | `PUT` / `PATCH` / `DELETE /comments/{commentId}` |

Replies: parent id in **URL** (`…/comments/{id}/replies`) or **body** (`parentCommentId`) — pick one style per product. Alternate bucket: `GET /users/{userId}/comments`.

## Path vs query vs body

| Where | For | Never |
|-------|-----|--------|
| Path | Resource **identity** | Secrets |
| Query | Filter, sort, **pagination** | Secrets |
| Body | Payloads, **secrets**, registration/login | — |

URLs are logged and shared — no credentials in path or query. HTML form POST puts data in **body** (browser “resubmit” = repeat POST).

## Request shape

Method + URL; **headers** (`Content-Type: application/json`, auth, tracing); **JSON body** for writes. Same shape in curl/Postman/IDE clients.

## Status codes

**2xx** success (e.g. **201 Created** on create); **3xx** redirect; **4xx** client fault; **5xx** server fault. Document ambiguous domain failures for public consumers.

## Documentation

Use **OpenAPI** (or equivalent) so clients and codegen share one contract.

## Authentication

| Mechanism | Notes |
|-----------|--------|
| HTTP Basic | TLS only; mostly legacy/admin. |
| Bearer | Opaque or JWT in `Authorization`; short TTL + refresh when applicable. |
| OAuth2 | Delegated tokens from an authorization server; correct flow per client type (confidential vs public). |

Do not treat **API keys** (app identity) as end-user session proof unless designed that way.

## Authorization

| Model | Use |
|-------|-----|
| RBAC | Role bundles permissions. |
| ABAC | Attributes (user, resource, env) drive rules. |
| ACL | Per-resource allow/deny lists. |

Enforce on **every** sensitive handler; missing authz is a bug.

## Security baseline

- **Rate limiting** — abuse/cost (see private section for keying ideas).
- **CORS** — explicit origin allowlist for browser callers.
- **Injection** — parameterized SQL, safe builders, validated NoSQL inputs.
- **Edge** — WAF where appropriate; private network/VPN for internal-only APIs.
- **CSRF** — for cookie sessions: tokens or SameSite + correct verb usage.
- **XSS** — encode/sanitize; CSP when returning HTML or dangerous redirect targets.

---

## Private / first-party APIs (optional)

Only when **all** callers are owned; public and LLM-facing surfaces stay REST/GraphQL as usual.

| Caller | Pattern |
|--------|---------|
| Public | Verbs, status codes, resources, OpenAPI. |
| Owned | May use **one POST URL**, **operation id in body**, strict schemas, explicit success/error envelope — supports **batching** multiple ops in one HTTP call. |

**Order of operations:** validate body (includes operation id) → **rate limit** → handler with **auth first**.

**Rate limit keys:** unauthenticated → **IP** (+ tenant if needed); authenticated → **account id + operation name**. **JWT:** verify signature to read `accountId` for limiter without DB; full session checks in handler when required.

**Layout:** per operation — `handler` + metadata (**input schema** e.g. Zod, rate tier, roles). Optional **output schema** for types/codegen.

**Anti-patterns:** `200` with hidden failure (public APIs); only path-based op names when **batching** is required; one global user limit with **no per-operation** key.

## Brownfield: “more REST” without rewriting the world

Use when the codebase already has RPC-style `POST /api/.../do-thing` routes:

1. **Stop the sprawl** — For *new* non-CRUD endpoints, prefer either **nested instance routes** (`POST /api/members/{id}/payments` or similar) or a dedicated **`POST /api/operations/{name}`** bucket so verbs do not accumulate as unrelated top-level paths.
2. **Keep what works** — Do not rename stable URLs without **`/api/v{n}`** (or headers) and a communicated migration; aliasing two paths briefly is acceptable.
3. **Tighten the core** — Ensure **resource** areas (members, payments, plans) stay verb+plural consistent; use a single **path constants module** in-app so refactors do not rely on grep alone.
4. **Still not Fielding REST** — Hypermedia (HATEOAS) is optional; the goal is **predictable resources + honest command buckets**, not purity.

## Checklist

- [ ] Consumer type chosen; contract-first spec for external APIs.
- [ ] REST vs GraphQL vs gRPC vs WebSockets matches latency, caching, streaming, and team ops cost.
- [ ] Verbs and idempotency correct; **201** (or documented alternative) on create if clients rely on it.
- [ ] Identity in path; filters/pagination in query; secrets in body only.
- [ ] Authn mechanism fit; authz model applied on every sensitive route.
- [ ] Rate limits, CORS, injection, CSRF (if cookies), XSS considered.
- [ ] Versioning and deprecation path known before breaking changes.
- [ ] If private pattern: validation → limits → handler auth; per-op limit keys.
