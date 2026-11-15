# TASKS: REAL (pivoted at 10:45 from OPEN MIC)

> **12:20 FOLD-IN (from Vishnu's spec):** REAL now sells **verified Gen Z reactions + the WHY** to **creators AND brands** ("test your ad or product video on verified Gen Z before you spend on it"). Three additions: **verified .edu badge** (Lane E), **hold-to-talk "why" after each reaction → quotes in results** (Lane V), and brand framing in the pitch/copy.

> **11:35 TRACK PIVOT (small):** the only themed prizes are **Best use of Whop** and **Best use of Keiki**. So: **creators text their clip to the REAL iMessage agent (Keiki)**, pay through a **Whop** link, and get results texted back. **Reactors** use the app daily. Supermemory has no prize, so it's optional now.


> **REAL: a marketplace for verified human reactions.** Creators post a clip and pay per reaction. Reactors watch it with the front camera on, get paid the same whether they laugh or not ("we pay for attention, not applause"), and on-device face detection proves a real human watched. Creators get a **live reaction curve**: "2 of 3 laughed at 0:04, attention dropped at 0:09."

**Ground rules for every agent:** read `AGENTS.md`. Work only in your lane's files. Use the Convex API below through `api.*` (`import { api } from '../../convex/_generated/api'`; the path depends on file depth). Only Lane D edits `convex/`. **UI rule:** functionality only, using `@/ui` primitives (`Screen, Card, Button, Title, Body, Muted, tokens`). No custom styling in feature files; Lane A owns the design. Test on a real phone in Expo Go. Branch `lane-x/<thing>` → PR (Revyl checks it) → merge fast.

## Already done
- Expo app + Convex (REAL schema deployed). `useSession()` from `@/lib/session` gives `{ userId }`. Name-only onboarding.
- **Laugh detector, proven on iPhone** (`src/laugh/`): `<LaughDetector ref onScore onStatus />`, `ref.start()` / `ref.stop()`, per-frame `{ s, smile, eye, jaw, t, noFace? }`. Laugh = `s >= 0.45`.
- Tabs: **React** (`src/app/index.tsx`), **Create** (`src/app/create.tsx`), **Wallet** (`src/app/wallet.tsx`).
- `expo-video` and `expo-image-picker` installed. Revyl PR checks on. Supermemory + Keiki keys in Convex.

## Convex API contract
| Function | Args → returns |
|---|---|
| `api.users.create` | `{name, color}` → userId |
| `api.users.wallet` (query) | `{userId}` → `{balanceCents, items:[{gigTitle, earnedCents, valid, at}]}` |
| `api.gigs.generateUploadUrl` | `{}` → upload URL (POST the video file → `{storageId}`) |
| `api.gigs.create` | `{creatorId, title, question?, videoStorageId, durationMs?, priceCents, slots}` → gigId (status `draft`) |
| `api.gigs.publish` | `{gigId, paid?, whopCheckoutId?}` → makes it `live` (free test = call directly; paid = after Whop) |
| `api.gigs.feed` (query) | `{userId}` → live gigs I can react to (`creatorName, slotsLeft, priceCents, title, question`) |
| `api.gigs.get` (query) | `{gigId}` → gig + `videoUrl` |
| `api.gigs.mine` (query) | `{creatorId}` → my gigs |
| `api.reactions.submit` | `{gigId, reactorId, curve:[{t, s|null}], watchedToEnd}` → `{valid, earnedCents, laughed}` (valid = watched to end + face ≥70%) |
| `api.reactions.results` (query, live) | `{gigId}` → `{count, laughedCount, curve:[{sec, avg, laughingPct}], peakSec, reactors:[{name, color, laughed, peak}]}` |

---

## Lane B: Reactor flow (**Codex**), files: `src/app/index.tsx`, `src/components/react/*`
```
Read AGENTS.md and docs/TASKS.md (UI rule!). You own ONLY src/app/index.tsx and src/components/react/. Replace the current test screen with the REACTOR flow:
1. Gig feed: api.gigs.feed({userId}) (userId from useSession() in @/lib/session). Each card: title, creator, question, "$X.XX · N spots left". Tap → watch screen (a modal or conditional view inside your files).
2. Watch screen: load api.gigs.get({gigId}). Play videoUrl with expo-video (useVideoPlayer + VideoView), full width, no seeking. A small LaughDetector (from @/laugh/LaughDetector) shows the reactor's face. 3-2-1 countdown, then start the detector + playback together.
3. Record a curve: on every onScore push { t: player.currentTime*1000, s: noFace ? null : s } (throttle to ~10/sec).
4. When playback ends: detector.stop(), api.reactions.submit({gigId, reactorId: userId, curve, watchedToEnd: true}). If the user leaves early, submit with watchedToEnd:false.
5. Result: "Paid $X.XX" (or "Not paid: keep your face in frame") + "You laughed / You stayed deadpan, both count. We pay for attention, not applause." → back to feed.
Must work in Expo Go. `npx tsc --noEmit` in app/, test on the phone, branch lane-b/reactor, open a PR.
```

## Lane C: Creator flow + live reaction curve (**Antigravity**), files: `src/app/create.tsx`, `src/components/create/*`
```
Read AGENTS.md and docs/TASKS.md (UI rule!). You own ONLY src/app/create.tsx and src/components/create/. Build the CREATOR flow:
1. "New test": pick a video with expo-image-picker (videos only, max ~30s), title, optional question ("Is the ending funny?"), slots (default 5), price per reaction (default 50 cents). Upload: api.gigs.generateUploadUrl → POST the file → storageId → api.gigs.create({creatorId: userId, ...}) → api.gigs.publish({gigId}) (free test for now; Lane D adds Whop pay-first).
2. "My tests": api.gigs.mine({creatorId: userId}) with filled/slots.
3. Results screen (THE DEMO SCREEN): api.reactions.results({gigId}) live. Show "X of N actually laughed," reactor avatars (name color + a laughed badge), and the REACTION CURVE: a chart over the clip timeline (x = seconds, y = avg score, plus laughingPct) with a "Peak laugh at 0:0X" marker. Use react-native-svg if installed (npx expo install react-native-svg), else per-second bars from Views. Animate new points as reactions arrive (Convex is live). Optional: the clip above the chart with a synced playhead.
4. Must look good on Expo WEB too (npm run web = the big screen on stage).
Must work in Expo Go. `npx tsc --noEmit`, test with 2 phones (one creates, one reacts), branch lane-c/creator, open a PR.
```

## Lane A: Design system + polish (**Cursor**, Shri driving), files: `src/ui/*`, `src/components/onboarding.tsx`, `src/components/app-tabs.tsx`, app.json icon/splash
```
Read AGENTS.md and docs/TASKS.md. You own src/ui/ (design system), onboarding, tabs, icon/splash. Every screen uses ONLY @/ui primitives, so restyling src/ui/ restyles the whole app.
1. Design direction for REAL: trustworthy + human + a bit playful. "Verified" badges, live-signal energy, faces, a money-green accent for earnings. Implement tokens + Screen, Card, Button (primary/secondary), Title, Body, Muted, plus Badge ("Verified real"), Avatar(name, color), Money(cents), Stat (big number + label).
2. Restyle onboarding with @/ui only. Tab icons via expo-symbols: React "face.smiling", Create "video.badge.plus", Wallet "dollarsign.circle".
3. App name "REAL" in app.json, simple icon/splash.
Must work in Expo Go. `npx tsc --noEmit`, branch lane-a/design-real, open a PR.
```

## Lane K: Keiki iMessage agent (**Codex**, has the Keiki MCP), files: `app/convex/keiki.ts`, the `/keiki/*` routes in `app/convex/http.ts`, optional fields only in `schema.ts`
```
git checkout main && git pull && git checkout -b lane-k/keiki
Read AGENTS.md, docs/TASKS.md, app/convex/_generated/ai/guidelines.md, and Keiki's docs: https://onkeiki.com/setup.md, https://onkeiki.com/docs/agent-api.md, https://onkeiki.com/llms.txt. Use the Keiki MCP tools (current_context, list_agent_templates, deploy_agent, talk_to_agent, list_channel_types, get_deployment).

GOAL: creators text a clip to the REAL agent on iMessage and get verified human reactions back. Best-use-of-Keiki track.

1. Convex HTTP tools for the agent (app/convex/keiki.ts + routes in app/convex/http.ts; create http.ts if it doesn't exist. Vishnu also adds a /whop/webhook route there, so keep routes separate and merge carefully):
   - Auth: every request must send header `x-real-secret` == env KEIKI_TOOL_SECRET (npx convex env set KEIKI_TOOL_SECRET <random>). Reject otherwise.
   - POST /keiki/gig  body {handle, name?, title, videoUrl, slots?, priceCents?, question?}: find-or-create the creator user by `handle` (ADD optional field `handle: v.optional(v.string())` + index by_handle to users; you may add OPTIONAL fields/indexes only, no renames). Fetch videoUrl, store it with ctx.storage.store(blob), create the gig via the same logic as api.gigs.create. Then: if internal/api payments.checkout exists, return {gigId, payUrl}; else publish it (free test) and return {gigId, live:true}.
   - GET /keiki/results?gigId=...: returns a texting-friendly summary built from the same aggregation as api.reactions.results ("3 of 5 actually laughed · biggest laugh at 0:07 · lost them at 0:11") + the gig's `report` field if present.
   - GET /keiki/status?handle=...: the creator's latest gigs + filled/slots.
2. Deploy the agent with deploy_agent, external_ref "real-agent", name "REAL". System prompt: "You are REAL. Creators text you a short video (or a link to one) to test on real humans before posting. Ask only for what's missing (title, how many reactions 3–20 at 50¢ default). Call the create-gig tool with the video URL, then send the Whop pay link if one comes back. When asked 'how did it do?' (or proactively once results land), call the results tool and reply in 2–3 punchy lines with what to fix. Never invent numbers." Tools = the 3 HTTP endpoints above (base URL = the deployment's .convex.site URL from EXPO_PUBLIC_CONVEX_SITE_URL in app/.env.local), with the x-real-secret header from a Keiki secret.
   - Figure out how the agent receives media attachments on iMessage. If it gets an attachment URL, pass it as videoUrl. If not, accept links to .mp4 files (and say so in the PR).
3. Test with talk_to_agent end to end: create a gig from a public sample mp4 URL → confirm it appears in api.gigs.feed → ask "how did it do?".
4. Channel: call list_channel_types. Use the FREE shared iMessage number or Telegram for the demo. DO NOT buy a dedicated line or anything paid; stop and tell Shri if it needs payment.
5. Proactive text-back (stretch): when a gig reaches all its slots, schedule an action that messages the creator through Keiki's agent API (x-conversation-id = handle), if the free plan allows it.
Run `cd app && npx convex dev --once` (deploys must succeed) and `npx tsc --noEmit`. Commit, push, open a PR. In the PR description, include the agent's name and how to text it.
```

## Lane V: Hold-to-talk "why" (**Vishnu, right after Whop's createCheckout ships**), files: `app/convex/voice.ts`, optional fields in `schema.ts`, `app/src/components/react/WhyRecorder.tsx`, a small hook-up in `app/src/components/react/Watch.tsx` (result view only), a "Quotes" card in `app/src/components/create/Results.tsx`
```
git checkout main && git pull && git checkout -b lane-v/voice-why
Read AGENTS.md, docs/TASKS.md, app/convex/_generated/ai/guidelines.md. OPENAI_API_KEY is already in Convex env.

GOAL: after a reactor finishes a clip, they HOLD a mic button and say WHY in 3–15 seconds ("lost me at the intro, too slow", "the ending got me"). Creators and brands see real quotes next to the curve.
1. Recording (app): app/src/components/react/WhyRecorder.tsx, using expo-audio (npx expo install expo-audio; it's in Expo Go) with useAudioRecorder and RecordingPresets.HIGH_QUALITY. Ask mic permission on the first press. Hold to record, release to stop, max 15s. Upload the file via api.voice.generateUploadUrl → POST → storageId → api.voice.submitWhy({reactionId? or gigId+reactorId, audioStorageId}). Show it in Watch.tsx's RESULT view only (after "Paid $X"), with a "Skip" option. Use @/ui primitives only.
2. Backend (app/convex/voice.ts): mutation generateUploadUrl; mutation submitWhy stores audioStorageId on the reaction (ADD optional fields to reactions: whyAudioStorageId, whyText, whyTags, whyQuote) and schedules action internal.voice.transcribe.
   transcribe: fetch the audio from storage → OpenAI transcription (model gpt-4o-mini-transcribe or the current cheapest transcribe model) → a Responses call (gpt-6-luna) that extracts {quote (≤12 words, verbatim), sentiment: "pos"|"neg"|"mixed", tags: string[] (e.g. "slow intro", "great ending", "relatable")} → patch the reaction. Never invent text: if the transcript is empty, leave fields unset.
   query api.voice.forGig({gigId}) → [{name, color, laughed, whyQuote, sentiment, tags}] for valid reactions with a quote.
3. Results (Capy's app/src/components/create/Results.tsx): add a "What people said" Card listing the quotes (avatar + quote + sentiment badge) under the curve, plus the top 3 tags with counts ("slow intro ×3"). Keep the existing code intact; additive only.
4. Keiki: extend GET /keiki/results to include up to 3 quotes in its JSON (edit app/convex/keiki.ts minimally: add a `quotes` field from api.voice.forGig).
`cd app && npx convex dev --once` + `npx tsc --noEmit` must pass. Open a PR.
```

## Lane E: Verified .edu badge (**Cursor**, owns onboarding), files: `app/src/components/onboarding.tsx`, optional fields via a tiny `app/convex/users.ts` change, `app/src/ui/*` badge
```
git checkout main && git pull && git checkout -b lane-e/edu-badge
Read AGENTS.md and docs/TASKS.md. Add an OPTIONAL "School email" field to onboarding. If it ends in ".edu", mark the user verified. Backend: add optional fields `email`, `school` (derived from the domain, e.g. "berkeley.edu" → "Berkeley"), `verifiedStudent: boolean` to users in app/convex/schema.ts, and an optional `email` arg to api.users.create that sets them (domain check only, no email code today). Show a "✓ Verified student · Berkeley" Badge on the Wallet header and next to reactor avatars in Results/Stage (results.reactors: add `verifiedStudent` and `school` to each item in app/convex/reactions.ts results; additive only). Results header: "N verified students reacted". Keep everything optional so existing users still work. `cd app && npx convex dev --once` + `npx tsc --noEmit` pass. Open a PR.
```

## Lane T: Taste Profile + audience targeting (**Vishnu**, after Whop), files: `app/convex/taste.ts`, optional fields in `schema.ts`, `app/src/components/taste/**`, a "Taste DNA" card on `app/src/app/wallet.tsx` (coordinate with the CAPY-3 wallet PR)
```
git checkout main && git pull && git checkout -b lane-t/taste
Read AGENTS.md, docs/TASKS.md, app/convex/_generated/ai/guidelines.md. SUPERMEMORY_API_KEY and OPENAI_API_KEY are already in Convex env.

GOAL: "Real reactions from the RIGHT people." Every reaction builds a taste profile per reactor; creators target an audience; reactors get a shareable Taste DNA card.

1. MEMORY (Supermemory v5, one namespace per user: user_<userId>, docs https://supermemory.ai/docs/llms.txt): after each VALID reaction (schedule from reactions.submit via ctx.scheduler.runAfter(0, internal.taste.remember, {reactionId})), add a memory like "<name> watched '<gig title>' (<question>): laughed (peak 0.82), watched to end" or "...stayed deadpan." Add an optional `tags: v.optional(v.array(v.string()))` to gigs; when a gig is created, an OpenAI call (OPENAI_API_KEY, Responses API, gpt-6-luna) tags it from title + question with 2–4 tags (e.g. "dry humor", "gym", "skit", "product demo"), and the memory includes those tags.
2. TASTE DNA: action api.taste.refresh({userId}): search the user's Supermemory namespace + OpenAI → store on the user (optional fields): tasteSummary (e.g. "Dry, deadpan humor; gym + tech; loses interest in long intros") and tasteMix: [{label, pct}] (3–4 slices summing to 100). Query api.taste.get({userId}). Auto-refresh every 3 valid reactions.
3. TARGETING: optional `audience: v.optional(v.string())` on gigs (free text from the creator, e.g. "Gen-Z who like dry humor"). gigs.feed ranks live gigs for a reactor by match between the gig's tags/audience and the reactor's taste (simple: tag overlap with tasteMix labels via OpenAI embeddings or plain string overlap, with no blocking if there's no profile). Add `matchPct` to each feed item so the reactor sees "92% match".
4. UI: app/src/components/taste/TasteCard.tsx, a shareable "Taste DNA" card (summary + mix bars) using only @/ui primitives, rendered at the top of the Wallet tab (if CAPY-3's wallet PR is merged, add it there; otherwise render it in wallet.tsx above the placeholder). Add an "Audience" text field to the creator's NewTest (app/src/components/create/NewTest.tsx, passing `audience` to api.gigs.create; add the arg as OPTIONAL).
5. Keep every new field OPTIONAL and the existing API working. `cd app && npx convex dev --once` and `npx tsc --noEmit` must pass. Open a PR.

PITCH LINE this unlocks: "Real reactions, from the right people, before you post."
```

## Lane D: Backend, money, AI (**Vishnu, Claude Code**), files: `convex/**`
```
Read AGENTS.md and docs/TASKS.md. You own convex/. Keep the API contract stable (add, don't rename).
1. WHOP (core, track prize): creator pays before a gig goes live. Action api.payments.checkout({gigId}) creates a Whop sandbox checkout for slots*priceCents (+ platform fee), returns the URL; the app opens it with expo-web-browser. A Convex HTTP action /whop/webhook verifies WHOP_WEBHOOK_SECRET and calls gigs.publish({gigId, paid:true, whopCheckoutId}). Reactor cash-out: api.payments.cashout({userId}) (sandbox payout, or record a pending payout and zero the balance). Keys: npx convex env set WHOP_API_KEY / WHOP_WEBHOOK_SECRET.
2. AI REPORT (OPENAI_API_KEY, Responses API, gpt-6-luna): action api.report.forGig({gigId}) turns reactions.results into 3 bullets ("Laughs spike at 0:04, cut 0:00–0:02, the ending loses people"). Store it on the gig (optional field) so the creator screen shows it.
3. (OPTIONAL, no prize) SUPERMEMORY: after each valid reaction add a memory; rank gigs.feed by reactor taste. Only after 1, 2 and the Keiki support below.
5. KEIKI SUPPORT: make api.payments.checkout callable from Codex's convex/keiki.ts (export an internal version, e.g. internal.payments.createCheckout({gigId}) → {url}) so the iMessage agent can text the Whop pay link. Coordinate with Codex on convex/http.ts: you add /whop/webhook, Codex adds /keiki/*.
4. Seed: an internal mutation that seeds 2 demo users + 1 demo gig for the stage.
```

## Capy (sponsor proof): create at capy.ai on this repo
1. **Wallet screen** (`src/app/wallet.tsx` only): `api.users.wallet({userId})` from `useSession()`. A big balance ($ from cents), a list of reactions (gig title, +$X.XX or "not paid"), a "Cash out" button (disabled, "coming soon," until Lane D adds `api.payments.cashout`). Only `@/ui` primitives.

## Checkpoints
- **12:30:** a creator posts a clip on phone A → a reactor watches on phone B → paid → results on A.
- **15:00:** live reaction curve + AI report + Whop checkout.
- **16:30:** design pass merged, Revyl green, demo data seeded.
- **17:00:** FREEZE.

## Demo (3 min)
1. "Bots inflate every metric and AI fakes every testimonial. Creators post blind."
2. A creator uploads a clip and pays via **Whop**.
3. 3 judges react on phones (faces live).
4. Creator screen: the curve fills in live, "2 of 3 laughed at 0:04," reactors paid.
5. AI report: "cut the first 2 seconds."
6. "We pay for attention, not applause. REAL: know what lands before you post."
