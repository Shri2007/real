# TASKS: REAL (pivoted at 10:45 from OPEN MIC)

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

## Lane D: Backend, money, AI (**Vishnu, Claude Code**), files: `convex/**`
```
Read AGENTS.md and docs/TASKS.md. You own convex/. Keep the API contract stable (add, don't rename).
1. WHOP (core, track prize): creator pays before a gig goes live. Action api.payments.checkout({gigId}) creates a Whop sandbox checkout for slots*priceCents (+ platform fee), returns the URL; the app opens it with expo-web-browser. A Convex HTTP action /whop/webhook verifies WHOP_WEBHOOK_SECRET and calls gigs.publish({gigId, paid:true, whopCheckoutId}). Reactor cash-out: api.payments.cashout({userId}) (sandbox payout, or record a pending payout and zero the balance). Keys: npx convex env set WHOP_API_KEY / WHOP_WEBHOOK_SECRET.
2. AI REPORT (OPENAI_API_KEY, Responses API, gpt-6-luna): action api.report.forGig({gigId}) turns reactions.results into 3 bullets ("Laughs spike at 0:04, cut 0:00–0:02, the ending loses people"). Store it on the gig (optional field) so the creator screen shows it.
3. SUPERMEMORY (SUPERMEMORY_API_KEY, v5, namespace user_<id>): after each valid reaction add a memory ("NAME laughed at a 20s skit about roommates"); later rank gigs.feed by reactor taste → "matched to reactors who like this humor."
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
