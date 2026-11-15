# AGENTS.md: rules for every coding agent on REAL

Read this before touching anything. It applies to Claude Code, Codex, Cursor, Antigravity, Capy, and any human.

## What this is
**REAL** is a consumer iOS/Android app (Expo) for the YC Consumer Mobile Hackathon (Nov 15, 2026): **a marketplace for verified human reactions.** Creators post a short clip and pay per reaction. Reactors watch it with the front camera on and get paid **the same whether they laugh or not** ("we pay for attention, not applause"). On-device face detection proves a real human watched and records a laugh curve over the clip timeline. Creators get a live reaction curve + an AI report. **The current tasks and API contract live in `docs/TASKS.md` and override anything below about the old OPEN MIC idea.**

## Hackathon rules (hard constraints)
1. **All code is written after 10:00 AM on Nov 15.** Never paste in code that predates that.
2. **It must run on a real phone** (Expo Go on iPhone/Android). Never ship anything that only works in a browser or simulator.
3. **We must use Convex, Capy and Revyl.** Supermemory and Whop are for track prizes. Don't remove or stub out a sponsor integration.
4. **Submission is due at 18:00. Feature freeze is at 17:00.** After 17:00, only bug fixes that make the demo safer.

## Stack
- Expo SDK (latest) + TypeScript + Expo Router. Package manager: **npm**.
- Laugh detection: MediaPipe Face Landmarker (`@mediapipe/tasks-vision`) inside `react-native-webview`, talking to RN with `postMessage`. **Must work in Expo Go**, so don't add native modules that need a custom dev client unless the team agrees.
- Backend: **Convex** (`app/convex/`). Before writing Convex code, read `app/convex/_generated/ai/guidelines.md` and follow it over anything you remember.
- Memory: Supermemory, called **only from Convex actions** (server-side).
- Payments: Whop sandbox, called **only from Convex actions**. Webhooks go to a Convex HTTP action.
- AI host: an LLM called from a Convex action. TTS is optional.

## Repo layout (created at 10:00 by `create-expo-app`)
```
app/                    Expo app root (package.json, app.json)
  app/                  Expo Router screens: Shri
  components/           shared UI: Shri
  laugh/                WebView laugh detector + RN bridge: Shri
  convex/               schema, functions, actions, http: Vishnu
  .revyl/               Revyl config + tests: Shri
docs/                   plan, skills, demo script, concept video
```

## Ownership: don't cross lanes without telling the owner
| Area | Owner | Others may... |
|---|---|---|
| `app/app/`, `app/components/`, `app/laugh/`, `.revyl/` | **Shri** | read; propose changes in a PR |
| `app/convex/**` | **Vishnu** | call functions via the generated `api`; don't edit the schema |
| `docs/` | anyone | edit freely |
| `capy/*` branches | Capy | humans review and merge |

**The contract between lanes is the Convex `api`.** If the phone side needs new data, ask Vishnu for a query or mutation (or write the spec in an issue). Don't change `schema.ts` from the phone side.

## Data model (agreed shape, implement at 10:00)
- `users`: name, avatar color, pushToken?
- `friendships`: a, b
- `memes`: from, to, kind (image|text), text?, storageId?, createdAt
- `laughs`: memeId, viewer, sender, peakScore, isReal, onsetAt (server-corrected ms), reactionStorageId?
- `shows`: status (lobby|joke|results), currentJoke, startedAt
- `showLaughs`: showId, user, onsetAt (server-corrected ms), seat? (for the map)
- `pityTaxes`: from, to, memeId, whopCheckoutId, status
- Humor graph = aggregate of `laughs` per (viewer, sender): realLaughs / viewed.

## Laugh detection contract
- Score per frame: `s = min(1, 0.55*smile + 0.35*max(eyeSquint, cheekSquint) + 0.15*jawOpen)`, where smile = average of the left/right `mouthSmile`.
- `isReal = peak >= 0.45` (tune with real faces; keep the threshold in one constant).
- **onsetAt** = first frame where `s` crosses the threshold, converted to server time with the clock offset (see below).
- Camera runs **only while the user is holding** (or during an active live show the user joined). Never in the background.

## Clock sync (for the contagion map)
- On app start and every 60s: call a Convex query that returns server time; offset = serverNow − (sent + received)/2. Keep the median of the last 5.
- Every `onsetAt` sent to Convex is `localMs + offset`. The target error is under 100 ms.

## Privacy (say this on stage, so it must be true)
- No raw video is ever uploaded or stored. Only scores and timestamps, plus **one** reaction frame or 1s clip **when the laugh is real and the viewer allows sending it**.
- No always-on camera or mic.

## Sponsor usage checklist (don't break these)
- [ ] Convex: every piece of app data + realtime + clock sync
- [ ] Capy: at least 2 merged `capy/*` PRs for real features
- [ ] Revyl: `.revyl/config.yaml` + a core-flow test, run on the latest build
- [ ] Supermemory: memory writes on each real laugh; reads for the humor graph and host picks
- [ ] Whop: sandbox checkout for the Pity Tax works end to end

## Writing Capy tasks (Vishnu or Shri)
A Capy task must be **self-contained** and name: the files to create, the Convex functions to call (by `api.*` name), the screen behavior, and what done looks like. Good: "Build `app/app/graph.tsx`, a humor-graph screen that calls `api.graph.forUser` and shows friends sorted by real-laugh %, with bars." Bad: "make the stats better."

## Git workflow
- `main` must always run on a phone. Never push a broken `main`.
- Branches: `shri/<thing>`, `vishnu/<thing>`, `capy/<thing>`. Small PRs, merged fast.
- Pull + rebase before you push. If you hit a conflict in someone else's lane, ask; don't resolve it blind.
- Never commit secrets. Keys live in `.env.local` (Expo public URL only) and **Convex env vars** (`npx convex env set`) for everything secret.

## Testing / verification
- **Every change** gets tested on a real phone in Expo Go before merging.
- After core-flow changes, run the Revyl dev loop / test: `revyl dev --platform ios --detach --json`, then `revyl dev status`; tests live in `.revyl/`.
- Convex: watch `npx convex dev` output for errors; it must be clean before merging.

## Don't
- Don't add auth providers. Use a name-only onboarding (pick a name and color). Auth burns time.
- Don't build an App Store / TestFlight flow. Not needed.
- Don't add new native modules that break Expo Go.
- Don't store or upload raw camera frames or video beyond the single opt-in reaction.
- Don't claim a sponsor does something it doesn't. Capy writes code from tasks; Revyl tests builds on cloud devices.

## Definition of done (for any feature)
Works on 2 real phones, data flows through Convex, nothing crashes on a slow network, and the demo path to it takes 3 taps or fewer.
