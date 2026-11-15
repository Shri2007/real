# Capy tasks (heavy lanes). Paste each as its own Capy thread on Shri2007/real

Every task: read `AGENTS.md` + `docs/TASKS.md` first, use **only `@/ui` primitives** for visuals (layout-only sizes on media are OK, kept in one `mediaLayout` object), never edit `convex/` (Lane D/Vishnu), never edit files outside your list. Must run in **Expo Go** (no new native modules except ones already installed: expo-video, expo-image-picker, react-native-reanimated, react-native-webview, expo-web-browser). Run `cd app && npx tsc --noEmit` before opening the PR. Revyl builds + checks every PR on a cloud iPhone, so make sure its checks pass.

---

## CAPY-1: Creator flow + live reaction curve + A/B test (heaviest; the demo screen)
**Files:** `app/src/app/create.tsx`, `app/src/components/create/**` (new). Add `react-native-svg` with `npx expo install react-native-svg` if you need it (it's in Expo Go).

```
Build the CREATOR side of REAL (a marketplace where creators pay real people to react to a clip before posting; reactors' faces are verified on-device and produce a laugh curve over the clip timeline).

1. New test (src/components/create/NewTest.tsx):
   - Pick 1 video (expo-image-picker, mediaTypes 'videos', allowsEditing false, max ~60s). Show a preview.
   - Fields: title, optional question ("Is the ending funny?"), slots (stepper 3–20, default 5), price per reaction (stepper 25¢–$2, default 50¢). Show the total: slots × price + 20% fee.
   - OPTIONAL "A/B test": pick a SECOND cut of the same clip. If set, create TWO gigs with the same title + " (A)" / " (B)", each with half the slots.
   - Upload: api.gigs.generateUploadUrl → fetch(url, {method:'POST', headers:{'Content-Type': mime}, body: blob}) → {storageId}. Get durationMs from the picker asset.
   - api.gigs.create({creatorId: userId, title, question, videoStorageId, durationMs, priceCents, slots}) → gigId.
   - Payment: IF api.payments?.checkout exists in the generated api, call it and open the URL with expo-web-browser (Lane D adds Whop). ELSE call api.gigs.publish({gigId}) directly (free test). Write this as a small `goLive(gigId)` helper so swapping later is trivial.
2. My tests (src/app/create.tsx): api.gigs.mine({creatorId: userId}) list with status (draft/live/done), filled/slots, a "New test" button. Tap → Results.
3. RESULTS: the money screen (src/components/create/Results.tsx), all LIVE via useQuery(api.reactions.results, {gigId}):
   - Header stats: "X of N actually laughed", reactions in / slots, peak moment "Biggest laugh at 0:07".
   - The clip on top (expo-video, no controls) with a PLAYHEAD synced to a REACTION CURVE chart below it (react-native-svg): x = seconds of the clip, y = avg laugh score (0..1) as a smooth area, plus a thin line for laughingPct. When a new reaction arrives, animate the curve morphing to the new shape (react-native-reanimated) and pulse a "+1 reaction" badge.
   - Tapping a point on the curve seeks the video there.
   - "Drop-off" markers: seconds where avg score falls >40% from the previous 2s → label "lost them here".
   - Reactor row: Avatar(name, color) chips with a laughed/deadpan badge, in arrival order.
   - If the gig has a `report` field (Lane D adds an AI report) or api.report?.get exists, show its 3 bullets in a Card titled "What to fix".
4. A/B compare (src/components/create/Compare.tsx): for gigs titled "(A)"/"(B)" with the same base title, show both curves overlaid and a verdict: "Cut B gets the laugh 2.1s earlier and keeps 30% more attention. Post B."
5. Everything must look good on Expo WEB too (`npm run web`). That's the big screen on stage, so make Results responsive (wide = video left, curve right).
```

## CAPY-2: Stage mode, the projector view for the live demo
**Files:** `app/src/components/stage/**` (new), plus ONE button added at the top of `app/src/components/create/Results.tsx` *after CAPY-1 merges* (or render it from `create.tsx` if Results doesn't exist yet).

```
Build STAGE MODE for REAL: a fullscreen, projector-friendly live view of one gig's reactions for the 3-minute demo.
- A "Present" button on the creator's Results screen opens <Stage gigId> fullscreen.
- Layout (landscape, web-first, also works on phone): the clip big on the left with a playhead; on the right, a giant live counter "3 / 5 reacted · 2 laughed" and a big animated REACTION CURVE (same data: useQuery(api.reactions.results, {gigId})).
- "Live wall": one tile per reactor (Avatar + name) that pops in with a spring animation when their reaction lands, glowing for a laugh and greyed for deadpan.
- A "Verified real humans" badge with a short explainer: "Face in frame ≥70% of the clip · watched to the end · paid the same either way."
- Money ticker: "$X.XX paid to N real people" (sum of valid reactions × priceCents from api.gigs.get).
- Keyboard: on web, press F for browser fullscreen and R to replay the curve animation from 0.
Use @/ui primitives + react-native-reanimated. No new data needed from convex/.
```

## CAPY-3: Wallet + streaks (reactor retention)
**Files:** `app/src/app/wallet.tsx`, `app/src/components/wallet/**` (new).

```
Build the REACTOR WALLET for REAL using useQuery(api.users.wallet, {userId}) (userId from useSession()).
- A big balance as dollars from balanceCents, with a "Verified reactions" count.
- History list: gig title, "+$0.50" (valid) or "Not paid: face out of frame" (invalid), relative time.
- A STREAK card computed client-side from items[].at: consecutive days with ≥1 valid reaction ("🔥 4-day streak, react today to keep it").
- A "Cash out" button: if api.payments?.cashout exists in the generated api, call it with {userId} and show the confirmation; else disabled with "Cash out via Whop, coming soon".
- An empty state when there are no reactions: "Watch your first clip on the React tab and earn."
```
