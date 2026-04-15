# Stash — Project Guide

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16, App Router, TypeScript strict |
| Styling | Tailwind CSS 4 + Shadcn/ui (New York style) |
| Database | PostgreSQL via Prisma 7 |
| Sessions | iron-session (encrypted httpOnly cookies) |
| Client state | Zustand (crypto key store) |
| Client crypto | @noble/curves (X25519), @noble/ciphers (AES-GCM), @noble/hashes (SHA-256, HKDF), hash-wasm (Argon2id) |
| Server crypto | @node-rs/argon2 (password hashing) |
| Dev/deploy | Docker Compose |

## Development Setup

```bash
# Start Postgres only (run Next.js locally with hot reload)
docker compose -f docker-compose.dev.yml up -d

# Apply migrations
npx prisma migrate dev

# Run Next.js dev server
npm run dev

# OR: build and run everything in Docker
POSTGRES_PASSWORD=secret SESSION_SECRET=changeme docker compose up --build
```

Copy `.env.example` → `.env.local` and fill in values before running locally.

## Ground Rules

- **No server-side plaintext.** Every stash-related field in the DB (`encryptedMetadata`, `encryptedContent`, `memberSlots`, etc.) is a ciphertext blob. The server never sees stash names, member identities, listing content, or order details in plaintext.
- **Client-side crypto only.** Argon2id key derivation, X25519 key generation, and ECIES encryption all happen in the browser (`lib/crypto/` modules are `"use client"` context or called from client components). Server-side crypto is limited to password hashing (`@node-rs/argon2`).
- **Small, focused files.** Organize into folders and modules. Avoid files over ~150 lines.
- **Ask before assuming.** When design intent is unclear, ask rather than guessing.
- **Docker for everything.** Dev uses `docker-compose.dev.yml` (Postgres only). Production uses `docker-compose.yml` (full stack).
- **Git commits without AI attribution.** Human-style commit messages only.

## Cryptographic Architecture

### Key Hierarchy

```
password + username
    │
    ▼ Argon2id (client only, hash-wasm)
masterKey  ──────────────────────────────────────► encrypt identityPrivKey
    │                                                        │
    │                                             encryptedIdentityBundle → stored on server
    │
    ▼ HKDF(identityPrivKey, stashId, "stash-member-key-v1")
memberPrivKey (X25519, per-stash, pseudonymous)
    │                    │
    ▼                    ▼
memberPubKey      SHA256(memberPubKey) = memberToken  → stored in slot, not linked to userId
    │
    ▼ ECIES decrypt
stashKey (AES-256-GCM, 32 bytes)
    │
    ▼ HKDF(stashKey, "epoch-N")
epochKey  → encrypts all content (listings, orders, events)
```

### Member Slot Privacy Invariant

`stashes.memberSlots` is a padded JSON array (multiples of 16 slots). Every slot — real or dummy — looks identical:
```json
{ "token": "<32B base64>", "publicKey": "<32B base64>", "encryptedStashKey": "<~80B base64>" }
```
Dummy slots contain random bytes. **The server cannot count real members.** Actual member count lives inside `encryptedMetadata`.

### Challenge-Response Stash Access

1. `POST /api/stash/[id]/auth/challenge` — client sends `memberToken`; server finds slot, returns ECIES-encrypted random token
2. `POST /api/stash/[id]/auth/verify` — client decrypts token with `memberPrivKey`, sends it back; server validates and grants stash session
3. Client decrypts `encryptedStashKey` from the slot using `memberPrivKey` → has `stashKey` in memory (Zustand)

### Known Limitations

- Kicked members retain access to historical content encrypted under the old epoch key (no retroactive forward secrecy)
- The server can correlate which user account triggered a stash auth event (timing/IP side-channel)
- Key material is lost on browser clear — no cross-device sync in v1
- Slot padding reveals capacity tier (≤16, ≤32, …) but not exact count

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Min 32-char secret for iron-session |
| `NEXT_PUBLIC_APP_URL` | Public base URL (used in invite links) |
| `POSTGRES_PASSWORD` | Production Docker secret (not used in dev) |

## Build Stages

1. **Foundation** ✅ — Docker, Prisma schema, session config, middleware, landing page
2. **Auth** — Crypto libs, register/login with client-side key derivation
3. **Stash Creation & Dashboard** — Create stash, encrypted metadata, dashboard list
4. **Invites & Join** — Invite links, join flow, challenge-response stash auth
5. **Listings & Orders** — Encrypted CRUD for listings and orders
6. **Member Management** — View roster, kick + re-key
7. **Polish** — Landing page, profile, error handling, mobile
