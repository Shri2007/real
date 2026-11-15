# OPEN MIC: laughs you can't fake

YC Consumer Mobile Hackathon, Sat Nov 15, 2026. Team: **Shri** + **Vishnu** (+ maybe recruits).

> Every "lol" you send is a lie. OPEN MIC is an app where a laugh only counts if your face actually laughed. Friends send memes, you hold to view, the phone checks for a real laugh, and the sender gets your real reaction back. Every night an AI host runs a live show from the day's best jokes, and the **laughter contagion map** shows how laughter spread through the room. Over time you learn **who actually makes you laugh**.

Concept video (27s mockup, not app code): [`docs/open-mic-concept.mp4`](docs/open-mic-concept.mp4)

**Rules that shape everything:** all code is written **after 10:00 AM**, it must **run on a real phone**, and we must use **Capy, Revyl and Convex**. This repo only holds docs until 10:00. No app code before then.

---

## 1. What we're building (scope, in priority order)

| # | Feature | Must-have? | What "done" looks like |
|---|---|---|---|
| 1 | **Hold-to-view + real-laugh check** | ✅ core | Hold a meme → front camera checks smile + eye squint for about 5s → "REAL LAUGH" or "DEADPAN" |
| 2 | **Real laughs go back to the sender** | ✅ core | Sender sees "Sam actually laughed" + a reaction (photo frame or 1s clip) |
| 3 | **Friends + sending memes** | ✅ core | Pick a friend, send an image or text joke |
| 4 | **Humor graph** | ✅ core | "Who actually makes you laugh": % real laughs per friend |
| 5 | **Live show + laughter contagion map** | ⭐ demo finale | AI host posts a joke; every phone timestamps its laugh start; the map shows the spread, "84% of the room in 1.9s," and the laugh starter |
| 6 | **Pity Tax** (pay $1 to fake a laugh) | 🎭 comedy bit | Whop checkout (sandbox), shows the friend a credit |
| 7 | AI host voice | stretch | TTS reads the joke during the live show |

**Cut order if behind:** 7 → 6 → the voice part of 5. **Never cut 1–4**, and keep 5's map, which is the Novelty-9 moment.

---

## 2. Stack

- **App:** Expo (React Native + TypeScript, Expo Router). Runs in **Expo Go** on our phones (free, no Apple Developer account).
- **Laugh detection (fast path):** MediaPipe Face Landmarker (face blendshapes: `mouthSmileLeft/Right`, `eyeSquintLeft/Right`, `cheekSquint*`, `jawOpen`) running inside a `react-native-webview`. Already tested on a phone on Nov 14: it works in mobile Safari.
- **Backend:** **Convex**: users, friends, memes, laughs, live show state, contagion timestamps, humor graph. Realtime by default.
- **Memory:** **Supermemory**: what makes each person laugh (powers the humor graph and the AI host's joke picks).
- **AI:** an LLM picks and writes the host's bits; optional TTS.
- **Payments:** **Whop** sandbox checkout for the Pity Tax.
- **Builder:** **Capy** (GitHub app on this repo) takes well-scoped tasks and opens `capy/*` PRs.
- **Testing:** **Revyl**: an Expo simulator dev build on Revyl cloud devices; a test for the core flow (send → hold → verdict).

---

## 3. Sponsor integrations (we must visibly use these)

| Sponsor | Required | Our real use | Proof for judges |
|---|---|---|---|
| **Convex** | ✅ | Whole backend + realtime live show + contagion timestamps (server time sync) | Live map updating from 30+ phones |
| **Capy** | ✅ | Builds isolated features from task specs (humor-graph screen, onboarding, leaderboard) | Show merged `capy/*` PRs + the task log |
| **Revyl** | ✅ | Dev build on a cloud iPhone + an automated test of the core flow on every build | "Revyl ran our core flow on N builds and caught X breaks" |
| **Supermemory** | track | Per-user humor memory: what lands with whom | Humor graph + host picks |
| **Whop** | track | Pity Tax checkout (sandbox) | Live $1 checkout on stage |
| **OpenAI** | free $100 credits | The AI host (picks and writes the show's bits) via the Responses API (`gpt-6-luna`) from a **Convex action**. Also powers Capy threads on our credits | Host lines in the live show |
| Keiki | skip | Text-the-agent over iMessage needs a paid plan, so not worth it today | — |

> Assumption: "the 4 tools" = Convex, Capy, Revyl + Supermemory. Whop is the 5th, for its track. Confirm at kickoff when tracks are announced.

---

## 4. Who does what

Each person owns folders. **Don't edit the other person's folders without a heads-up** (see `AGENTS.md`).

### Shri: the phone side
- `app/` screens (Expo Router): feed, hold-to-view, verdict, friends, humor graph, live show view.
- `app/laugh/`: the WebView laugh detector (MediaPipe) + the bridge that posts `{peak, onsetAt}` to React Native.
- **Revyl** setup + the core-flow test.
- Runs Claude Code + Cursor in parallel: one agent on screens, one on the laugh detector.

### Vishnu: the brain side
- `app/convex/`: schema, queries/mutations, live show state machine, contagion timestamp ingest + server clock sync, humor graph aggregation.
- **Supermemory** client (server-side, in Convex actions).
- **Whop** checkout action + webhook.
- AI host (LLM in a Convex action; TTS if time allows).
- Writes the **Capy** task specs and reviews `capy/*` PRs.

### Recruit #3 (if we get one): room + pitch
- Room recruitment (QR to Expo Go link), seed jokes, the big-screen contagion view, demo script, backup video, submission form.

---

## 5. Timeline (we arrive at 10:00 and start immediately)

| Time | Shri | Vishnu | Together / checkpoint |
|---|---|---|---|
| **10:00–10:20** | `npx create-expo-app@latest app` → push → install Expo Go build on phone | Join repo; in `app/`: `npm i convex` → `npx convex dev` (creates deployment) | **10:20: app opens on both phones, talks to Convex** |
| **10:20–10:50** | **Connect Revyl:** `revyl auth login`, `revyl init`, simulator dev build, `revyl dev --platform ios` | **Connect Capy** (GitHub app on this repo) + **Supermemory** key + **Whop** sandbox key into Convex env | **10:50: all 5 sponsors connected** (screenshot each for the submission) |
| 10:50–12:30 | Laugh detector WebView + hold-to-view screen | Schema + send meme + record laugh + realtime feed | **12:30: core loop works end to end on 2 phones** (send → hold → verdict → sender sees it) |
| 12:30–13:00 | Lunch: **room push** (QR codes on tables), seed memes | Lunch: same | Get 30+ installs |
| 13:00–15:00 | Humor graph screen (or hand it to Capy) + polish | Live show state machine + contagion timestamps + clock sync | 15:00: live show works with our 3+ phones |
| 15:00–16:30 | Contagion map view + big-screen view | AI host picks + Supermemory + Whop Pity Tax | 16:30: full flow incl. the map, Revyl test green |
| **16:30–17:00** | Bug bash | Bug bash | **17:00: FEATURE FREEZE** |
| 17:00–17:30 | Run a full rehearsal live show with the room | Pre-seed demo data, backup recording | |
| 17:30–18:00 | Submission: video, sponsor proof screenshots, README | Same | **18:00: SUBMIT** |

---

## 6. Setup checklist (do tonight, it's not code)

- [ ] Expo Go on your iPhone (App Store, free)
- [ ] Expo account: `npx expo login` (free)
- [ ] Xcode installed + iOS Simulator runtime (needed for the Revyl simulator build)
- [ ] `npm i -g eas-cli` (optional, for builds)
- [ ] Convex: `npx convex login`
- [ ] Revyl CLI: install + `revyl auth login` (docs: https://docs.revyl.com/install.md)
- [ ] Capy account + GitHub app installed on **this repo**
- [ ] Supermemory API key, Whop sandbox account + API key
- [ ] LLM API key for the AI host
- [ ] Skills installed (see `docs/SKILLS.md`)

**Money:** none of this needs a paid Apple Developer account. We demo on our own phones through **Expo Go**. **TestFlight is NOT needed** (it costs $99/yr and needs Apple review). Revyl uses a **simulator** build, which doesn't need Apple signing.

---

## 7. Demo (3 min)

1. **Hook:** "Every 'lol' you send is a lie."
2. **Core:** a co-founder sends a meme; blank face → blocked (Pity Tax gag) → a real laugh → the reaction lands on their phone.
3. **Finale:** an AI host joke to the room → **the contagion map spreads live** → "84% of this room in 1.9s, started by [judge]."
4. **Proof:** the humor graph from today + "N people in this room used it today."
5. **Why it's a company:** the daily "did my joke land?" loop + the weekly humor graph + the nightly show.

Full plan and idea history: [`docs/PLAN.md`](docs/PLAN.md).
