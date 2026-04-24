# Groundflare Admin Backend Design

## Scope

This spec defines the first backend/admin subsystem for Groundflare.

It covers:
- the password-protected admin terminal
- authentication and security boundaries
- media storage and metadata models
- site configuration management
- random challenge generation and session persistence
- admin API boundaries and backend testing strategy

It does not cover a multi-admin organization model, analytics dashboards, or a separate microservice split.

## Product Summary

The backend is a desktop-first admin terminal for a single operator. After logging in with a username and password, the operator lands in a modern control surface built around a dual image desk:
- left column: AI image pool
- right column: real photo pool
- bottom rail: site configuration and challenge rules

The backend is responsible for three core jobs:
- protecting admin access
- managing AI, real, and audio assets
- generating stable random challenge sessions for the public verification flow

## Goals

- Keep backend v1 inside the existing Next.js monorepo for the fastest path to a usable system.
- Make asset management the primary workflow, with configuration as a secondary but always-available rail.
- Preserve strict separation between public challenge APIs and private admin APIs.
- Make each challenge session deterministic after it starts, even though the session is randomly generated.
- Keep the admin UI practical and focused instead of overbuilding dashboards or workflow tooling.

## Non-Goals

- Multi-user roles, teams, or invitation workflows
- Object storage integration in v1
- Detailed analytics and reporting dashboards
- Manual per-round challenge editing
- External service decomposition

## Chosen Direction

The approved direction is:
- same Next.js monorepo
- single admin username/password login
- `Dual Image Desk` admin layout
- lightweight media cards
- backend-uploaded media files
- automatic random challenge generation
- admin management scope including both media and site settings

## Architecture Overview

### Repository Shape

The backend stays in the current Next.js application rather than becoming a separate server.

Responsibility split:
- public verification routes remain under `/api/challenge/*`
- admin pages live under `/admin/*`
- admin APIs live under `/api/admin/*`
- service-layer logic remains in typed server modules under `src/server/*`

This keeps the current frontend and future backend sharing the same codebase, type system, and deployment unit, while still preserving a clear separation of concerns at the route boundary.

### Admin Terminal Shape

The first admin UI is desktop-first and centered on one main workspace:
- login page
- authenticated dual image desk
- upload modal or drawer
- bottom settings rail

The primary screen is not a settings page. It is an operator workspace dominated by the AI and real image pools.

## UI Structure

### 1. Login Page

The login page is minimal and terminal-like, with a single admin form:
- username
- password
- submit button
- invalid-login feedback

No password recovery or self-service user management is in scope.

### 2. Dual Image Desk

After login, the operator lands in the main admin workspace.

Layout:
- top status bar: current operator, last update time, upload shortcut, logout action
- main body: two equal columns
- bottom rail: site settings and challenge rule controls

Columns:
- `AI Image Pool`
- `Real Photo Pool`

Each side supports:
- search
- sort by upload time
- filter by active/inactive state
- multi-select for bulk state changes in later iterations

### 3. Lightweight Asset Cards

Each media card should stay intentionally light.

Visible information:
- thumbnail or waveform/icon preview
- asset name or generated identifier
- upload time
- quick actions

Quick actions:
- enable/disable
- remove/archive from active use
- open details/edit affordance if needed later

The card should not show every metadata field by default. Width, height, mime type, and file size belong in details or backend metadata, not the main desk surface.

### 4. Settings Rail

The settings rail is always available at the bottom of the main desk.

Editable settings:
- `displaySiteName`
- `successRedirectUrl`
- `audioAssetId`
- `totalRounds`
- `requiredPassCount`

This keeps site behavior directly editable without turning the whole admin into a config-heavy form application.

## Storage And Data Model

### Storage Strategy

Backend v1 uses:
- SQLite for structured state
- local filesystem directories for uploaded files

Suggested upload layout:
- `uploads/ai/`
- `uploads/real/`
- `uploads/audio/`

Database rows store metadata and file references. Binary files stay on disk.

### Core Tables

#### `admin_users`

Fields:
- `id`
- `username`
- `passwordHash`
- `createdAt`
- `updatedAt`

V1 still uses a real user table even though only one admin is expected. This keeps the authentication boundary clean and avoids encoding credentials into config files.

#### `image_assets`

Despite the name, this table stores all operator-managed media, including audio, so the `kind` field must be explicit.

Fields:
- `id`
- `kind` with values `ai | real | audio`
- `filePath`
- `originalFilename`
- `mimeType`
- `width` nullable
- `height` nullable
- `fileSize`
- `createdAt`
- `updatedAt`
- `isActive`

Notes:
- `width` and `height` are nullable so audio assets fit the same model cleanly.
- The dual desk renders only `ai` and `real` assets in its two columns.
- Audio assets are selected through the settings rail or upload flow, not shown as a third permanent column.

#### `site_settings`

Backend v1 manages a single active site configuration record.

Fields:
- `id`
- `displaySiteName`
- `successRedirectUrl`
- `audioAssetId` nullable
- `totalRounds`
- `requiredPassCount`
- `updatedAt`

#### `challenge_sessions`

This table records each verification session and its generated challenge snapshot.

Fields:
- `id`
- `status` with values `active | passed | failed | expired`
- `startedAt`
- `finishedAt` nullable
- `currentRoundIndex`
- `correctCount`
- `mistakeCount`
- `roundPlanJson`

The `roundPlanJson` field stores the exact per-session challenge plan so the session remains stable after creation.

## Challenge Generation Rules

### Generation Timing

The system generates the full challenge snapshot once, when `/api/challenge/start` is called.

It does not re-randomize between answers.

### Per-Round Composition

Each round contains:
- exactly 1 real asset
- exactly 8 AI assets

The public frontend still receives only the sanitized options, never the answer key.

### Uniqueness Rules

To keep v1 practical while still avoiding trivial repetition:
- real assets must be unique across the session
- AI assets must be unique within a single round
- AI assets may repeat across different rounds

This implies the minimum active pool requirements for a valid configuration are:
- active real assets >= `totalRounds`
- active AI assets >= `8`

### Snapshot Structure

`roundPlanJson` should contain, per round:
- real asset id
- eight AI asset ids
- final shuffled display order
- correct option id

This enables:
- deterministic answer validation
- stable session replay/debugging
- future lightweight reporting without introducing more relational tables in v1

## Authentication And Security

### Admin Authentication

- credentials are username/password based
- password is stored only as `passwordHash`
- use a modern password hashing algorithm such as `bcrypt` or `argon2`
- successful login creates an `HttpOnly` session cookie

### Session Cookie Rules

The admin session cookie should be:
- `HttpOnly`
- `Secure` in production
- `SameSite=Lax` or stricter

### Admin Route Protection

Every `/admin/*` page and `/api/admin/*` route must require a valid admin session.

### Basic Abuse Controls

V1 should include lightweight login throttling per IP or per username/IP combination to limit brute-force attempts.

### Upload Safety

Uploads must validate:
- allowed mime type
- file size
- expected media category (`ai`, `real`, or `audio`)

Extension checks alone are not sufficient.

## Admin Workflows

### Upload Flow

- operator clicks upload
- operator chooses media type
- operator selects file
- backend validates file
- backend stores file on disk
- backend writes metadata row
- UI returns to the dual desk with refreshed media lists

### Enable/Disable Flow

- operator toggles asset availability directly from the card
- disabled assets stay in the system but are excluded from challenge generation

### Remove Flow

V1 should treat the visible “delete/remove” action as removing the asset from active use, not as aggressive physical cleanup.

Minimum rule:
- if the asset is currently referenced by active site settings, the backend must block removal until the setting is changed

### Settings Save Flow

When the operator updates settings, backend validation must reject invalid state such as:
- `requiredPassCount > totalRounds`
- insufficient real pool size for the configured round count
- insufficient AI pool size for 8-per-round generation

If no audio asset is configured, settings may still save, but the system should mark the frontend as expected to run in silent-degraded mode.

## API Design

### 1. Auth APIs

- `POST /api/admin/auth/login`
- `POST /api/admin/auth/logout`
- `GET /api/admin/auth/session`

These endpoints only manage login state.

### 2. Asset APIs

- `GET /api/admin/assets`
- `POST /api/admin/assets/upload`
- `PATCH /api/admin/assets/:id`
- `DELETE /api/admin/assets/:id`

`GET /api/admin/assets` supports filtering by:
- `kind=ai|real|audio`
- search query
- active state

### 3. Settings APIs

- `GET /api/admin/settings`
- `PUT /api/admin/settings`

These endpoints manage the currently active public site behavior.

### 4. Challenge Session APIs

- `GET /api/admin/challenges`

V1 uses this for a basic recent-session list only, not a full analytics dashboard.

### Error Shape

Admin API errors should return a stable machine-readable structure:

```json
{
  "code": "INSUFFICIENT_POOL_SIZE",
  "message": "Not enough active real assets for the configured round count"
}
```

Suggested codes:
- `UNAUTHORIZED`
- `INVALID_FILE_TYPE`
- `ASSET_IN_USE`
- `INSUFFICIENT_POOL_SIZE`
- `INVALID_SETTINGS`

## Testing Strategy

### Auth Tests

- correct password logs in successfully
- incorrect password is rejected
- unauthenticated requests cannot access `/api/admin/*`

### Asset Tests

- AI, real, and audio uploads all persist file + metadata successfully
- invalid mime types are rejected
- assets referenced by current settings cannot be removed

### Settings Tests

- current settings can be read
- invalid rule combinations cannot be saved
- pool-size validation blocks impossible challenge settings

### Challenge Generation Tests

- `startChallenge` creates a full session snapshot
- each round contains exactly 1 real and 8 AI options
- the session stays stable across answer submissions
- different sessions may generate different random plans

### Session Lifecycle Tests

- session transitions from `active` to `passed`, `failed`, or `expired`
- counts and status persist correctly after each answer

### Layering Rule

Route tests should focus on:
- HTTP shape
- auth checks
- input/output contract

Core rules such as:
- random challenge generation
- removal blocking
- configuration validation
- session state updates

should live primarily in service-layer tests.

## Desktop Priority

The admin terminal is desktop-first in v1.

Requirements:
- optimized for laptop and large-screen use
- mobile may remain minimally usable but is not a primary design target

## Out Of Scope For Backend V1

- multi-admin roles and permissions
- analytics dashboards and pass-rate charts
- cloud object storage
- manual round-by-round challenge authoring
- full audit logs
- asset deduplication pipelines

## Summary

Backend v1 is a same-repo admin terminal built around a dual image desk, local media upload, a single admin login, SQLite persistence, and stable per-session random challenge generation. It deliberately keeps the system small, typed, and operationally simple while giving the public verification flow a real backend contract instead of mock state.
