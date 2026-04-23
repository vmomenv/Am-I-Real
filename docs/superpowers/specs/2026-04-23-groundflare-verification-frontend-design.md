# Groundflare Frontend Verification Design

## Scope

This spec covers the **frontend-first verification experience** for the Groundflare concept.

It defines:
- the public verification page
- the challenge flow and rules
- the frontend state model
- the backend-facing configuration and API boundaries needed for future integration

It does **not** define the password-protected backend management terminal in detail. That will be a separate spec later.

## Product Summary

The experience starts as a serious, mainstream-looking verification page for `www.spark-app.store`, then transitions into a 9-image challenge that asks the user to identify the single real image among AI-generated images.

The page should feel close to a real Cloudflare or hCaptcha flow in layout, copy hierarchy, and visual restraint, while still preserving the custom Groundflare concept and the playful final outcome.

## Goals

- Make the verification page feel immediately familiar to users who have seen mainstream image CAPTCHAs.
- Keep the frontend visually credible and restrained, not overtly game-like.
- Support desktop and mobile from the first version.
- Allow the frontend to run with mock data first, but preserve stable interfaces for a later real backend.
- Make the displayed site name and success redirect independently configurable from the backend.

## Non-Goals

- Building the backend admin terminal in this spec.
- Designing image curation workflows for operators.
- Implementing anti-bot hardening beyond ordinary application structure.
- Reproducing any third-party CAPTCHA UI 1:1.

## Chosen Direction

The chosen direction is a **single-page state flow** with a **mainstream image CAPTCHA layout**.

Key decisions already validated:
- Visual style should be closer to a real verification provider than an art installation.
- The initial site name displayed on the page should be `www.spark-app.store`.
- The displayed site name must be backend-configurable later.
- The displayed site name and success redirect must be configured separately.
- Audio should only start after the user clicks `我是人类`.
- The right-side panel is a status panel, not a scoring interface.

## Visual Design

### Overall Tone

The page should resemble a serious verification service:
- light neutral background
- white content cards
- blue-gray borders and accents
- restrained shadows
- neutral sans-serif typography
- minimal motion outside loading feedback

The visual hierarchy should feel closer to Cloudflare or hCaptcha than to a game UI.

### Brand Treatment

- `Groundflare` appears as the verification provider brand.
- The brand should be present but understated.
- The displayed site name should default to `www.spark-app.store`.
- The displayed site name should come from backend configuration rather than hardcoded frontend text.

### Core Layout

Desktop layout:
- a verification shell page on entry
- a challenge card with a 3x3 image grid on the left
- a compact status panel on the right

Mobile layout:
- the same challenge card first
- the status panel moves below the image card
- the 3x3 grid remains intact
- controls remain close to the card footer to reduce scrolling friction

## User Experience Flow

### 1. Initial Verification Shell

The page loads as a credible security verification screen.

Before the shell becomes interactive, the frontend fetches the public verification configuration needed to render the page header and later challenge behavior.

It shows:
- the configured display site name
- a loading progress bar that advances into the middle range
- explanatory copy indicating that the connection is being verified
- a Groundflare verification card containing `我是人类`

The intent is to mimic the cadence of a real connection check before presenting the challenge.

### 2. Human Confirmation Trigger

When the user clicks `我是人类`:
- the challenge session starts
- audio permission is obtained through that user gesture
- `1.mp3` begins at volume `0`
- the audio fades up to `60%`
- the challenge UI replaces the shell state

If audio playback fails, the challenge continues silently.

### 3. Challenge Rounds

Each round shows:
- a title bar telling the user to select the single real image
- a 3x3 grid containing 9 images
- exactly 1 real image and 8 AI-generated images
- a status panel showing progress and failure pressure

The user may select exactly 1 image per round.

The `验证` button remains disabled until a selection exists.

After submission:
- the UI shows a brief processing state
- the frontend does not reveal whether the last answer was right or wrong with dramatic animation
- the status panel updates with cumulative progress
- the next round loads, unless the session has already passed or failed

### 4. Success State

The challenge ends immediately when the user reaches the configured pass threshold.

Default behavior:
- total rounds available: `10`
- required correct answers: `7`

When the user reaches `7` correct answers:
- show `验证通过`
- fade out the audio
- wait briefly
- redirect to the configured `successRedirectUrl`

### 5. Failure State

The challenge ends immediately when it becomes impossible to reach the pass threshold.

With the default rule set:
- `totalRounds = 10`
- `requiredPassCount = 7`
- failure occurs on the **4th wrong answer**, because the user can then reach at most `6` correct answers

The UI should show:
- `你不是人类！`
- a neutral system-style failure message
- a `重新验证` action

The page should not auto-redirect on failure.

## Challenge Rules

### Defaults

- `totalRounds = 10`
- `requiredPassCount = 7`
- `imagesPerRound = 9`
- `realImagesPerRound = 1`

### Rule Semantics

- The session may end before round 10 if the user already passed.
- The session may end before round 10 if the user can no longer mathematically reach the pass threshold.
- The status panel should show cumulative mistakes and how many more mistakes can occur before forced failure.

For the default rule set, the failure threshold is derived as:

`failureMistakeThreshold = totalRounds - requiredPassCount + 1`

So with the default values:

`failureMistakeThreshold = 4`

The UI copy `还有 x 次机会` should represent:

`remainingMistakesBeforeFailure = failureMistakeThreshold - mistakeCount`

This keeps the text aligned with the actual pass/fail math.

## Configuration Model

The frontend should depend on a backend-provided configuration object rather than hardcoded display values.

### Site Configuration

Minimum fields:

```json
{
  "brandName": "Groundflare",
  "displaySiteName": "www.spark-app.store",
  "successRedirectUrl": "https://www.spark-app.store",
  "audioUrl": "/1.mp3",
  "totalRounds": 10,
  "requiredPassCount": 7
}
```

Configuration rules:
- `displaySiteName` controls the site name shown in the verification shell.
- `successRedirectUrl` controls where the user is sent after success.
- `displaySiteName` and `successRedirectUrl` are independent settings.
- `audioUrl` points to the music track used during the challenge.

## Question and Round Data Model

Each round should contain exactly 9 options.

Suggested structure:

```json
{
  "roundId": "round-03",
  "prompt": "请选择唯一真实照片",
  "options": [
    { "id": "img-1", "imageUrl": "/images/round-03/img-1.jpg" },
    { "id": "img-2", "imageUrl": "/images/round-03/img-2.jpg" },
    { "id": "img-3", "imageUrl": "/images/round-03/img-3.jpg" },
    { "id": "img-4", "imageUrl": "/images/round-03/img-4.jpg" },
    { "id": "img-5", "imageUrl": "/images/round-03/img-5.jpg" },
    { "id": "img-6", "imageUrl": "/images/round-03/img-6.jpg" },
    { "id": "img-7", "imageUrl": "/images/round-03/img-7.jpg" },
    { "id": "img-8", "imageUrl": "/images/round-03/img-8.jpg" },
    { "id": "img-9", "imageUrl": "/images/round-03/img-9.jpg" }
  ]
}
```

Important constraint:
- the frontend must **not** receive the correct answer in a form it uses for scoring
- whether an option is `real` or `ai` belongs in mock fixtures or backend-side evaluation, not in live UI logic

## Backend API Boundary

The frontend-first build may start with mocks, but the API contract should already match future backend behavior.

### Get Public Verification Config

`GET /api/challenge/config`

Purpose:
- return the public configuration needed to render the verification shell before session start

Example response:

```json
{
  "brandName": "Groundflare",
  "displaySiteName": "www.spark-app.store",
  "successRedirectUrl": "https://www.spark-app.store",
  "audioUrl": "/1.mp3",
  "totalRounds": 10,
  "requiredPassCount": 7
}
```

### Start Challenge

`POST /api/challenge/start`

Purpose:
- start a verification session
- return public site config and the first round

Example response:

```json
{
  "sessionId": "sess_123",
  "brandName": "Groundflare",
  "displaySiteName": "www.spark-app.store",
  "successRedirectUrl": "https://www.spark-app.store",
  "audioUrl": "/1.mp3",
  "totalRounds": 10,
  "requiredPassCount": 7,
  "currentRoundIndex": 1,
  "round": {
    "roundId": "round-01",
    "prompt": "请选择唯一真实照片",
    "options": [
      { "id": "img-1", "imageUrl": "/images/r1-1.jpg" },
      { "id": "img-2", "imageUrl": "/images/r1-2.jpg" },
      { "id": "img-3", "imageUrl": "/images/r1-3.jpg" },
      { "id": "img-4", "imageUrl": "/images/r1-4.jpg" },
      { "id": "img-5", "imageUrl": "/images/r1-5.jpg" },
      { "id": "img-6", "imageUrl": "/images/r1-6.jpg" },
      { "id": "img-7", "imageUrl": "/images/r1-7.jpg" },
      { "id": "img-8", "imageUrl": "/images/r1-8.jpg" },
      { "id": "img-9", "imageUrl": "/images/r1-9.jpg" }
    ]
  }
}
```

### Submit Round Answer

`POST /api/challenge/answer`

Request:

```json
{
  "sessionId": "sess_123",
  "roundId": "round-01",
  "selectedOptionId": "img-2"
}
```

Pass-through response shape:

```json
{
  "status": "continue",
  "correctCount": 1,
  "mistakeCount": 0,
  "remainingMistakesBeforeFailure": 4,
  "currentRoundIndex": 2,
  "round": {
    "roundId": "round-02",
    "prompt": "请选择唯一真实照片",
    "options": [
      { "id": "img-1", "imageUrl": "/images/r2-1.jpg" },
      { "id": "img-2", "imageUrl": "/images/r2-2.jpg" },
      { "id": "img-3", "imageUrl": "/images/r2-3.jpg" },
      { "id": "img-4", "imageUrl": "/images/r2-4.jpg" },
      { "id": "img-5", "imageUrl": "/images/r2-5.jpg" },
      { "id": "img-6", "imageUrl": "/images/r2-6.jpg" },
      { "id": "img-7", "imageUrl": "/images/r2-7.jpg" },
      { "id": "img-8", "imageUrl": "/images/r2-8.jpg" },
      { "id": "img-9", "imageUrl": "/images/r2-9.jpg" }
    ]
  }
}
```

Pass response shape:

```json
{
  "status": "passed",
  "correctCount": 7,
  "mistakeCount": 1,
  "redirectUrl": "https://www.spark-app.store"
}
```

Fail response shape:

```json
{
  "status": "failed",
  "correctCount": 3,
  "mistakeCount": 4,
  "message": "你不是人类！"
}
```

### Session Expiry Handling

If the backend reports an expired or invalid session, the frontend should:
- reset to the initial verification shell
- show a neutral error message
- require the user to start again

## Frontend Architecture

The frontend should be implemented as one page with a small set of focused units.

### `VerificationShell`

Responsibilities:
- render the initial verification page
- show configured site name and provider identity
- display loading progress
- expose the `我是人类` action
- present initial connection or session errors

### `ChallengeCard`

Responsibilities:
- render the challenge title bar
- render the 3x3 image grid
- manage the single selected option for the current round
- render the verification button and round-local loading states
- show reload affordances for image failures

### `ChallengeStatusPanel`

Responsibilities:
- show round count
- show cumulative wrong answers
- show remaining mistakes before failure
- show concise rule text

### `useChallengeFlow`

Responsibilities:
- own the state machine for the page
- call the start and answer APIs
- coordinate transitions between shell, challenge, success, failure, and error states
- control audio fade-in and fade-out behavior

## Frontend State Model

The frontend should use explicit finite states rather than ad hoc booleans.

Required states:

- `loading`
- `readyToVerify`
- `inChallenge`
- `submitting`
- `passed`
- `failed`
- `expired`
- `error`

State rules:
- `loading` covers public config fetch, initial shell progress, and initial data preparation
- `readyToVerify` means the shell is visible and waiting for the user click
- `inChallenge` means a round is active and selectable
- `submitting` prevents double submission during answer verification
- `passed` and `failed` are terminal views for the active session
- `expired` forces reset behavior
- `error` is used for recoverable but non-expiry failures

## Error Handling and Recovery

### Image Load Failure

If challenge images fail to load:
- the round should not become submittable
- the UI should show a neutral inline message
- the user should be able to reload the round

### Answer Submission Timeout

If answer submission times out:
- keep the current selection intact
- show a retryable inline message
- re-enable submission once the request settles
- prevent accidental duplicate requests while a request is in flight

### Audio Failure

If the audio file fails to load or play:
- do not block the challenge
- continue silently
- do not show a large disruptive error state

### Session Expiry

If the session expires:
- show a small system message
- reset to the initial shell
- require a fresh verification start

## Responsive Behavior

### Desktop

- challenge grid card on the left
- status card on the right
- the card layout should preserve a familiar verification-provider feel

### Mobile

- challenge grid remains 3x3
- status panel moves below the challenge card
- card paddings and gaps tighten
- footer actions stay visually close to the grid
- no horizontal scroll is allowed

## Accessibility and Motion

- all selectable image cells need a visible selected state
- keyboard focus states must be visible on all actions
- color must not be the only selection indicator
- loading and transition motion should respect `prefers-reduced-motion`
- reduced motion should not remove essential system feedback

## Testing Strategy

The first implementation should ship with behavior-driven coverage around the agreed rules.

### State Flow Tests

- initial render shows the verification shell
- clicking `我是人类` enters the challenge flow
- success state appears once the pass threshold is reached
- failure state appears once the threshold becomes unreachable

### Rule Tests

- default configuration uses 10 total rounds
- default configuration requires 7 correct answers
- each round allows only one selection
- the session ends immediately on the 7th correct answer
- the session ends immediately on the 4th wrong answer under the default rule set

### Configuration Tests

- displayed site name comes from `displaySiteName`
- redirect target comes from `successRedirectUrl`
- audio source comes from `audioUrl`
- provider name comes from `brandName`

### Error Tests

- image load failure shows a reload path
- submit timeout preserves selection
- expired session resets to the initial shell
- audio failure does not block the challenge

### Responsive Tests

- desktop uses split layout
- mobile stacks the status card below the challenge
- 3x3 grid remains usable on small screens

## Out of Scope for This Spec

The future password-protected backend terminal will need its own spec for:
- admin authentication
- challenge package management
- site configuration editing
- image asset upload and validation
- activation of the currently published challenge set

This frontend spec intentionally only defines the API and configuration surfaces that backend work must satisfy.
