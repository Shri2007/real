# TASKS: who builds what (parallel lanes)

**Ground rules for every agent:** read `AGENTS.md` first. Work only in the files listed for your lane. Use the Convex functions below through `api.*` (`import { api } from '../../convex/_generated/api'`; the path depends on the file's depth). Don't edit `convex/` unless you're Lane D. Test on a real phone in Expo Go before merging. Branch `lane-x/<thing>`, open a PR (Revyl checks it), merge fast.


## 🎨 UI rule (read before building any screen)
The current UI is a placeholder. **Do NOT copy its styling or layout.** Build features **functionality-first** using only the shared primitives in `src/ui/` (`Screen`, `Card`, `Button`, `Title`, `Body`, `Muted`). If a primitive is missing, add a plain one there. No hard-coded colors, fonts, or shadows in feature files. **Lane A (Cursor) owns `src/ui/` and the design**, and a later design pass restyles everything at once by changing `src/ui/` only.

## Already done (10:00–10:25)
- Expo app + Convex deployed. `ConvexProvider` + `SessionProvider` in `src/app/_layout.tsx`.
- **Onboarding** (`src/components/onboarding.tsx`): name + color → create a group or join with a code. Session (userId, groupId) is saved on the device. `useSession()` from `@/lib/session` gives `{ userId, groupId }`. `todayKey()` gives `YYYY-MM-DD`.
- **Laugh detector** (`src/laugh/`): `<LaughDetector ref onScore onStatus />` with `ref.start()` / `ref.stop()`. Score per frame `{ s, smile, eye, jaw, t }`. Real laugh = peak `s >= 0.45`. **Proven on a real iPhone.**
- Tabs: **Drop** (`src/app/index.tsx`), **Show** (`src/app/show.tsx`), **You** (`src/app/graph.tsx`).
- Revyl PR checks are on. Supermemory + Keiki keys are in Convex env.

## Convex API contract (Lane D owns `convex/`)
| Function | Args → returns |
|---|---|
| `api.users.create` (mutation) | `{name, color}` → userId |
| `api.groups.create` / `api.groups.join` | `{name, userId}` → `{groupId, code}` / `{code, userId}` → groupId |
| `api.groups.mine` / `api.groups.members` | `{userId}` → groups / `{groupId}` → users |
| `api.drops.generateUploadUrl` (mutation) | `{}` → upload URL (POST the image, get `storageId`) |
| `api.drops.send` (mutation) | `{groupId, userId, day, kind:'text'|'image', text?, storageId?}` → dropId |
| `api.drops.today` (query) | `{groupId, day}` → drops with `imageUrl, senderName, senderColor, views, realLaughs` |
| `api.laughs.record` (mutation) | `{dropId, viewerId, peak, onsetAt?, reactionStorageId?}` → `{isReal}` |
| `api.laughs.forDrop` (query) | `{dropId}` → `[{viewerName, isReal, peak, reactionUrl}]` |
| `api.laughs.graph` (query) | `{userId}` → `[{senderId, name, viewed, real, pct}]` sorted by pct |
| `api.shows.now` (mutation) | `{}` → server ms (clock sync) |
| `api.shows.start` / `tellJoke` / `end` | `{groupId}` → showId / `{showId, jokeText}` / `{showId}` |
| `api.shows.current` (query) | `{groupId}` → latest show |
| `api.shows.laugh` (mutation) | `{showId, userId, onsetAt}` (server-corrected ms) |
| `api.shows.contagion` (query) | `{showId}` → `{jokeStartedAt, starter, people:[{name, onsetAt, msAfterStarter}]}` |

---

## Lane B: Daily Drop feed (**Codex**), files: `src/app/index.tsx`, `src/components/drop/*`
Prompt to paste into Codex:
> Read AGENTS.md and docs/TASKS.md. You own `src/app/index.tsx` and `src/components/drop/`. Replace the laugh-test screen with the **Daily Drop feed** for the current group (`useSession()`): (1) a header with the group name and join code (`api.groups.mine`), (2) a "Drop something funny" composer: text, or an image via `expo-image-picker` uploaded with `api.drops.generateUploadUrl` and then `api.drops.send` with `day: todayKey()`, (3) a list of today's drops (`api.drops.today`). Each drop card is **blurred until you hold it**. While held, run the existing `<LaughDetector>` from `@/laugh/LaughDetector` (`start` on press-in, `stop` on press-out), track the peak score, then call `api.laughs.record({dropId, viewerId: userId, peak})` and show 😂 REAL LAUGH or 😐 DEADPAN. (4) On *my own* drops, show "N of M actually laughed" from `api.laughs.forDrop`. Use one shared LaughDetector instance for the screen (small selfie preview top-right). Dark UI (#0e0e12 background, #ffb020 accent). Keep it working in Expo Go. Run `npx tsc --noEmit` and test on the phone.

## Lane C: Live show + contagion map (**Antigravity**), files: `src/app/show.tsx`, `src/components/show/*`, `src/lib/clock.ts`
Prompt to paste into Antigravity:
> Read AGENTS.md and docs/TASKS.md. You own `src/app/show.tsx`, `src/components/show/`, `src/lib/clock.ts`. Build the **live show + laughter contagion map**. (1) `src/lib/clock.ts`: a hook `useServerClock()` that calls `api.shows.now` 5 times on mount (and every 60s), computes offset = serverNow − (sent + received)/2, keeps the median, and exposes `serverNow()`. (2) The Show screen for the current group (`useSession()`): if there's no show, a "Start show" button (`api.shows.start`) and a "Tell joke" text box (`api.shows.tellJoke`). When `api.shows.current` has status `joke`, show the joke big on every phone and run `<LaughDetector>`. The **first frame where score ≥ 0.45** → call `api.shows.laugh({showId, userId, onsetAt: serverNow()})` once. (3) The **contagion map** from `api.shows.contagion`: one dot per person, lighting up in order of `msAfterStarter` with an expanding ring from the starter (Reanimated), plus "🥇 Laugh starter: NAME" and "X% of the room laughed in Y.Ys" (laughers ÷ group members via `api.groups.members`). Make the map look great on Expo **web** too (`npm run web` on the laptop = the big-screen view on stage). Dark UI, #ffb020 accent. Test with 2+ phones.

## Lane A: polish + integration (**Cursor**, Shri driving)
> Read AGENTS.md and docs/TASKS.md. You own `src/components/onboarding.tsx`, `src/components/app-tabs.tsx`, `src/constants/`, app icon/splash, and integration bugs between lanes. Tasks: (1) onboarding polish (show the group code after creating, a "share code" button via the `Share` API), (2) a reaction photo: when a laugh is real, capture one frame (add a `snapshot` message to `src/laugh/detectorHtml.ts` that returns a JPEG data URL of the video frame) and upload it as `reactionStorageId`, (3) consistent theme + nice tab icons, (4) merge PRs from the other lanes and keep `main` working on the phone.

## Lane D: backend + AI (**Vishnu, Claude Code**), files: `convex/**`
> Read AGENTS.md and docs/TASKS.md. You own `convex/`. Keep the API contract stable (add, don't rename). Tasks in order: (1) **Daily Drop scheduler**: `crons.ts` hourly → for each group without today's `dropPrompts`, pick a random time 10:00–21:00, insert it; expose `api.drops.prompt({groupId, day})`. (2) **Group streak**: when every member has dropped today, `streak+1` (once per day). (3) **Supermemory** (`SUPERMEMORY_API_KEY`, v5 namespace API, one namespace per user `user_<id>`): in an action after each real laugh, add a memory ("NAME really laughed at SENDER's drop: TEXT"); `api.humor.profile({userId})` returns their humor summary. (4) **AI host** (`OPENAI_API_KEY`, Responses API, `gpt-6-luna`): action `api.host.pickJokes({groupId})` ranks today's drops by real laughs + Supermemory and writes a 1-line host intro for each, for the live show. (5) Whop / Keiki only if their prizes are confirmed.

## Capy tasks (create at capy.ai on this repo, isolated files)
1. **Humor graph screen** (`src/app/graph.tsx` only): "Who actually makes you laugh," using `api.laughs.graph({userId})` from `useSession()`. Rows: name, a bar (green ≥60%, amber ≥30%, red below), `pct%`, "real/viewed". Header "Your week in real laughs." Empty state: "Hold some drops to build your graph." Dark UI, #ffb020 accent.
2. *(later)* **Humor Twin card** on the graph screen once Lane D adds `api.humor.twin`.

## Checkpoints
- **12:30:** Drop → hold → verdict → the sender sees "N actually laughed," on 2 phones.
- **15:00:** live show + contagion map with 3+ phones.
- **16:30:** AI host + Supermemory in, Revyl green.
- **17:00:** FREEZE.
