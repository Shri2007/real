# YC Consumer Mobile Hackathon: plan (Nov 15, 2026)

> **Status: LEADING = H + G merged (DEADPAN core + LAUGHTRACK's "who makes you laugh").** Always-on passive listening (G as originally pitched) is out: iOS battery limits and App Review make 24/7 recording a bad product, even though background audio is technically allowed (Sleep Cycle does it overnight). Laughs are detected only in short, user-started windows: hold-to-view (daily), plus an optional "hangout mode" session (stretch). Final lock after the 9 AM kickoff tracks.

## The event
- **When/where:** Sat Nov 15, YC office. 180 builders, one day.
- **Brief:** "Build an app people open every day." A consumer iOS/Android app someone would want to **open again tomorrow**. It doesn't need to be on the App Store, but it must **run on a real phone** for a live demo.
- **Rules:** teams of up to 3 (solo OK). **All code written after 10:00 AM.** **Must use Capy, Revyl and Convex.**
- **Prizes:** 1st place gets a YC interview plus an iPhone 18 Pro each. 2nd gets a MacBook Neo each, 3rd an Apple Watch each. Track prizes are announced at kickoff.
- **Sponsors:** Capy (AI software engineer), Revyl (mobile build/test/debug), Convex (reactive backend), Candle (YC consumer app, 1M+ users, on the floor all day), Whop (payments/business API), Supermemory (memory for agents). More to be announced.
- **Judges:** consumer founders with products used by millions, plus a YC partner.

### Schedule
| Time | Event | Our move |
|---|---|---|
| 8:00 | Doors open | Get a table, set up 3 phones, test Wi-Fi |
| 9:00 | Kickoff + tracks | **Final pick by 9:45** using the decision rule below |
| 10:00 | Hacking starts | First code |
| 12:30 | Lunch | **Room recruitment push** (QR codes on tables) |
| 6:00 | **Submissions due** | Feature freeze at 5:00 |
| 7:00 | Finalist demos | |
| 8:00 | Winners | |

## What the brief actually rewards
| Source | Signal | What we need |
|---|---|---|
| The brief | "open every day", "open again tomorrow", "on your home screen" | A behavior that's truly daily, where tomorrow is different from today |
| Judges | Consumer founders + a YC partner | Could be a company: universal need, small habit, a viral loop |
| YC Fall 2026 RFS, "AI consumer products for 1B people" | An agent that takes real actions, learns, one main action, fun daily, shareable moments; social connection is a named area | AI that *does* something, not a chatbot |
| Candle | Sustains *existing* relationships; DAU/MAU about 50%; #1 complaint: "questions are becoming repetitive" | Personal, never-repeating daily content; other people as the retention |
| Last month's YC Hacks winners | Real data, a learning loop, a hard before/after number ("0/30 → 29/30", "-66% cost on 400 real tickets") | A measured result from real use **during the day** |

### Principles we're holding ourselves to
1. **Start with a real problem**, not a technology looking for one.
2. **Build the strange idea until it feels obvious.** Weirdness wins (see RoboOI: "living neurons teach robots"), but only on top of a real problem.
3. **The smallest version that proves the hard part works.** One loop, end to end, on a real phone.
4. **Put it in front of people, learn fast, keep shipping.** The 180 people in the room are our users.
5. **Honest scoring.** My first-pass scores ran 5–9 points high three times. Use the corrected numbers.

## Shortlist (not locked)
Honest score = 6 × 10-point rubric (Novelty, Feasibility, Scalability, Impact, Demo, Fit). Target 48+; no consumer idea has cleared it.

### A. DREAMWALK: walk inside your friends' dreams. Leader on weirdness. ~45
> Every morning you forget your dream within minutes. Speak it, and it becomes a 3D world your friends can walk inside.
- **Daily trigger:** waking up. Dreams fade in minutes, so you open it first thing.
- **Hook:** 🔔 "You were in Maya's dream last night. Step inside." (tag people who showed up)
- **Social:** visit friends' dreams, leave voice notes pinned in place, overlapping dreams merge.
- **Tech:** World Labs World API (text → explorable 3D world) rendered in a WebView with Spark (three.js), steered by tilting the phone.
- **Why world models fit:** they invent what they can't see. That's a bug for real places and exactly right for dreams.
- **Stage:** "This is what YC Hacks dreamed last night." 100 dreams from kickoff merged into one walkable dreamscape on the judges' phones.
- **Checked:** no app does walkable, shared dreams (closest is Vision Pro-only Digital Dream, no sharing). Dream *journals and maps* are crowded (DreamLog, Codreaming, Dream Match), so the novelty lives in walkable + "you were in my dream."
- **Scores (revised after outside review):** N8 F6 S6 I5 D9 Fit8 = **42**. An outside review gave it 28 assuming live 3D generation on stage. Generation is async and the demo is pre-generated, but the review was right that **other people's dreams are boring** and full 3D is costly.
- **Fix 1: 360° panorama instead of walkable 3D.** Text → 360° pano (World Labs' pano step or Blockade Labs Skybox), about 30–60 seconds, roughly cents each, viewed by tilting the phone. Light, smooth, cheap. You lose "walk," you keep "stand inside."
- **Fix 2: only dreams you're in or from your 3 closest people.** No stranger feed. Each dream is a 15-second moment, not an exploration.

### B. HERE: "Wish you were here." Now they are. ~38 (→43 hardened)
> One photo of where you are becomes a 3D postcard your friend can step inside.
- **Problem:** friends drift when they move apart. Texts are flat, FaceTime needs you both free.
- "In the mail" for about 3 minutes, which turns generation latency into a feature.
- **Weak spots:** Facebook 3D Photos (2018) flopped; "why not FaceTime?"; world models invent the parts of your real room they can't see; $0.16–$1.28 per world.

### C. TEND: one friend a day, one text. ~40 (→45 hardened)
> Every day, one person you've drifted from, plus the reason to reach out. You write the words.
- Camera roll as the memory: "You and Sam, 52 days ago, Tacos El Gordo." Opener = the photo.
- **Stage number:** A/B photo openers vs plain "hey" reminders, real replies from the room.
- **Weak spots:** novelty (Dex, Garden, Clay exist); iOS can't read message history or replies, so replies are self-reported.

### D. VOTED IN: friends vote you into the daily quest. ~39 (→44 hardened)
> Every morning your group votes "who's most likely to talk to a stranger?" The winner gets the quest.
- Gas-style polls plus an AI quest engine that learns which quests get completed.
- **Weak spots:** novelty (Gas, quest apps); depends on getting the room installed.

### E. PULSE: your friends know you're struggling before you do. ~40
> A 10-second daily voice check reads *how* you sound, not what you say, and quietly tells your 3 closest friends when you've sounded off for days.
- **Stage number:** "This room's vocal energy dropped 31% from 10 AM to 5 PM."
- **Weak spots:** wellness/medical-claim territory; less visual.

### F. REM: while you sleep, your phone dreams about you. Craziest yet. ~46
> Plug your phone in at night. It falls asleep and dreams about your day. Every morning: "I dreamed about you last night."
- **Problem:** journaling changes lives and nobody does it. Days blur and photos go unseen. REM is reflection that takes zero effort.
- **Mechanism:** during the day the app gathers today's photos, places, steps and calendar (expo-media-library, expo-sensors pedometer, expo-calendar). Charging overnight = the phone is "asleep." A Convex scheduled job turns the day into a surreal dream image or 360° pano plus a short dream told in the phone's own voice (TTS).
- **Fixes both DREAMWALK flaws:** no remembering or logging your own dream, and the dream is about **you**, the one subject you never find boring.
- **Social:** people from your photos show up in your phone's dream → 🔔 "You were in Sam's phone's dream last night."
- **Memory:** Supermemory gives the phone long-term memory of you: recurring motifs, "I've been dreaming about the gym less lately."
- **Stage:** plug the phone in on stage → it "naps" for 30 seconds → wakes up and tells the dream of your YC Hacks day. Then "what 140 phones dreamed about today."
- **Checked:** no app generates overnight dreams from your camera roll (closest: typed-dream visualizers, photo filters).
- **Scores:** N7 F7 S7 I6 D10 Fit9. **Weak spot:** does it still delight on day 14? Supermemory continuity is the answer.

### G. LAUGHTRACK: you track your steps; you've never tracked your joy. Only idea at 9+ on N/Fit/Demo. ~47
> Your phone quietly counts every time you laugh, and works out **who made you laugh**.
- **Truth:** adults laugh about 18 times a day on average (range 0–89). **Shared laughter predicts relationship quality** (Kurtz & Algoe). We measure steps, sleep and calories, but never joy.
- **Mechanism (the novel tech):**
  1. Passive on-device laugh detection: Apple SoundAnalysis built-in classifier (`SNClassifierIdentifier.version1`, about 300 classes, including laughter, giggling, belly_laugh, chuckle_chortle, snicker). No audio is stored or uploaded; only the event "laugh at 3:41 PM" leaves the phone.
  2. **Working out who made you laugh across phones:** friends' phones nearby (BLE) + the phone that heard *speech* loudest just before your laugh = the person talking = who made you laugh.
  3. **Shared laughs:** two phones detecting laughter at the same moment = you laughed *together*.
- **Daily hooks:** 🔔 "You made Sam laugh 9 times today." Nightly joy report. "You haven't laughed with Maya in 3 weeks." Weekly/yearly "Joy Wrapped."
- **Stage:** phones on the judges' table. Tell a joke → the screen updates live: "Judges laughed 3 times. Made them laugh: [presenter]." Then the team's real day: "I laughed 61 times at YC Hacks. 22 were because of Priya." **The room doesn't need to install anything**; a few demo phones do the listening.
- **Checked:** existing "laugh tracker" apps are **tap-to-log** (Laughter Meter) or smile counters (Egao). Nothing detects laughter passively or works out who caused it.
- **Strict score: 43** (N8 F5 S7 I6 D9 Fit8). First pass said 47. **Biggest risk: "whose laugh is it?"** A phone hears every laugh nearby, not just yours. **Fix = acoustic consensus across phones:** when several app phones hear the same laugh, it belongs to the phone where it was loudest; same for who was talking right before. That's the genuinely new tech, and it gets back to about 47 if it works.
- **Tonight's test:** run Apple's sample "classify live audio with the built-in sound classifier" on 2 phones side by side in a noisy room. Laugh near one. Does the closer phone report clearly higher confidence/level? If yes, the idea holds.
- **Other weak spots:** always-on mic (privacy pitch must be airtight: on-device, nothing recorded); battery; background audio on iOS needs a native build (Swift or an Expo dev build with a native module), not Expo Go.
- **Stack lean:** native Swift (SoundAnalysis + CoreBluetooth + background audio) or Expo dev build + a small Swift module. Convex for laugh events, friends, the live stage counter.

### H. DEADPAN: "LMAO" is the biggest lie on the internet. Strict ~42 (→ ~46 merged with G)
> A messaging app for close friends where you can't send a laugh unless you actually laughed.
- **Mechanism:** hold to view a meme → the front camera and mic watch for 5 seconds only (on-device smile/laugh detection: ARKit face blendshapes or ML Kit `smilingProbability` + SoundAnalysis laughter). Real laugh → a 1-second reaction clip goes back free. Fake "lol" → blocked, the composer scrambles, or pay a $1 "Pity Tax" (Whop).
- **Fixes LAUGHTRACK's biggest flaws:** no crowd noise, no battery drain, no "whose laugh," no always-on mic.
- **Prior art:** reaction-capture apps exist (Dumbstruck, ReactBack, Seen 2024), so the *clip* isn't new. **New:** verified laughs, blocking fake laughs, "who actually makes you laugh."
- **Scores:** N6 F7 S7 I5 D9 Fit8.
- **Watch out:** you can't intercept the iOS system keyboard (scramble our own composer instead); Revyl cloud devices can't verify a real smile (don't claim it); the $1 going *to the friend* is user-to-user payments, so in the demo charge into our Whop and show it as a credit.
- **Merge with G (the strongest version):** the product is for the **sender**: *"did my joke actually land?"* Daily hook: you open it to see if they *really* laughed. LAUGHTRACK's "who makes you laugh" stats become the weekly payoff ("Dave makes you laugh 12% of the time; Priya 71%"). Pity Tax = the comedy layer for the demo.

### I. OPEN MIC: an AI-hosted comedy show for your friends every night, scored by real laughs. Strict 41 alone, ~45 merged with H+G
> All day, friends drop jokes and memes. At 9 PM the AI host performs the best ones live (voice), everyone watches with the front camera on, and **real laughs** score each joke on a live leaderboard.
- **Why:** HQ Trivia proved a daily live appointment is very sticky (millions playing at once). It died because producing a show every day cost too much. **AI makes the show free and personal.**
- **Prior art:** AI party trivia about friends (Inside Joke Battle Arena, Trivai), live gameshow apps (Instant Gameshow), smile-detection "try not to laugh" apps (StraightFace). The combination (AI host performs *your friends'* jokes, scored by face-verified laughs) is new; the parts aren't.
- **Stage = the room plays:** people install through Expo Go QR during the day and submit jokes. At the demo the AI host performs the top jokes over the speakers; the room's phones measure real laughs live; the big screen shows "Funniest person at YC Hacks: ___ (61 real laughs)."
- **Scores alone:** N6 F6 S7 I5 D9 Fit8 = 41. **Merged with the laugh-verified app** (async memes all day → live show at night, same face detection + Convex + humor graph): N7 F6 S7 I6 D10 Fit9 = **~45**.
- **Biggest risks:** face detection inside Expo Go's web view (untested), syncing a live show across 100+ phones, and the room actually installing by mid-afternoon.
- **The Novelty-9 piece: the LAUGH CONTAGION MAP.** Every phone timestamps the exact moment its owner starts laughing (clocks synced to the Convex server with a quick round-trip offset estimate). Put the timestamps together and you see **how laughter spreads through a room**: who laughed first (the "laugh starter"), how fast it spread, and who sets off whom. Stage: *"That joke started with Judge X and reached 80% of the room in 1.9 seconds."* Daily: "You set off Sam 80% of the time"; "Priya is your group's laugh starter."
  - **Prior art checked:** laugh *counting* per seat exists (Pay Per Laugh, iPads on theater seats; Disney/Caltech audience face tracking; MIT Mood Meter). **No one has measured laughter *spreading* person to person across phones.** New framing + new measurement → Novelty 9.
  - **Needs:** about 30+ phones in the room, clock offset under about 100 ms, similar detection speed across devices.

### J. PARENT MODE (your idea): an agent auto-sends a parent-safe photo collage from your camera roll. Strict 38 (→ ~42)
> Tell an agent "send my parents a collage every 2 days." It picks good photos, **filters out anything you wouldn't want your mom to see**, makes the collage, and sends it on schedule.
- **Real founder problem:** "my parents always ask what I'm up to." Universal for college students; a great YC founder story.
- **Prior art (close):** Trove (AI picks best family photos + weekly email), Knoto (auto-share by face), Aura frames auto-add from Google Photos people albums, FamilyAlbum, Retro recaps.
- **The twist that's yours:** the **parent-safe filter** (red cups, parties, exes, screenshots, gym selfies → out) + the agent writing the caption in your voice.
- **Scores:** N4 F8 S7 I6 D8 Fit5. **Fit problem:** the student sets it and forgets it, so *they* don't open it daily. **Fix:** the **parent** is the daily user (FamilyAlbum proves grandparents check daily): parents open the app to see today's collage and send a voice note back, and you get one digest of their replies. → Fit 7, Impact 7, ~42.
- **Fails the Novelty-9 bar.** Most real problem on the list; least insane.

### Patterns from Solana Mobile winners (Sprouts, Vanna, Glyf, Battle Cities)
- **Sprouts (1st, $30k):** Acorns-style round-ups + a garden that grows. A **proven boring mechanic + an emotional visual.** Not insane.
- **Glyf:** an AI keyboard that does actions. **Live inside a surface people already use 100×/day.**
- **Battle Cities:** real-time multiplayer. **Vanna:** DeFi credit.
- **Takeaway:** these were month-long crypto hackathons; winners looked like real startups (brand, domain, landing page, waitlist) and polished a proven loop. **Polish + a proven loop + one delightful twist** beats "insane."
- **Killed:** friend-memory keyboard. iOS keyboards can't see who you're texting and can't use the camera or mic.

### ⚠️ "Work on it beforehand" vs the rules
The rules say **all code is written after 10:00 AM.** Building early risks disqualification, and judges ask. Allowed before 10:
- Research and design: data model, screens on paper, the pitch, the demo script.
- Accounts, keys, provisioning profiles, an empty Xcode/Expo setup with no app code.
- Running **Apple's own** SoundAnalysis sample project to check how well it detects laughter (their code, not ours).
- Reading docs: SoundAnalysis, CoreBluetooth background, AVAudioSession background modes.

### Killed (and why)
| Idea | Why it died |
|---|---|
| DOUBT (friend goal betting + AI clone) | Legal shape is OK with points only, but the referee is sponsor theater; 34/60 |
| Doppel (Turing test vs friends' clones) | Deceiving friends reads creepy; novelty wears off |
| MOB (friends vote, AI ships features live) | Can't hot-load AI code into a native app in 8 hours |
| OVERNIGHT (your agents talk to your friends' agents) | Already exists: Pickle, Instinct, Digipals (YC) |
| Day-as-a-song | Already exists: Melodiary, Murmelo, Boppi |
| AGAIN (step into old memories) | The daily driver is nostalgia/sadness, which is unhealthy retention |
| Dream map / collective dreams | Crowded: DreamLog, Codreaming, DreaMap |
| FLAKE.WTF (stake $20 on hangouts, AI lie detector) | Weekly, not daily; the "lie detector" needs screen time/texts that iOS doesn't give apps; 31/60 |
| TRAITOR (agent sells your private thoughts when you ghost) | Kills its own input (nobody records honest notes after the first leak); pay-to-extract secrets about a person is a harassment tool; anti-Candle; 36/60 |

## Tonight (Nov 14): tests that decide it
No project code tonight (rule: code after 10 AM). Accounts, keys and API pokes in the Marble web app or with curl are fine.

1. **Dream → 360° panorama (the main test now):** type a real dream into a text-to-360 generator (World Labs pano step or Blockade Labs Skybox), time it, and open it in a 360° viewer on your phone, tilting to look around. Pass = under about 60 seconds and it *feels like stepping into a dream*.
1b. **World API, text → full 3D world (stretch):** same dream, note the time, the credits, and whether walking adds enough over the 360° version to be worth it.
2. **World API, photo → world:** same with a photo of your room (decides HERE).
3. **Mobile render check:** open a generated world on your phone in the browser. Does it load in under 10 seconds and run smoothly?
4. **Accounts and keys:** Capy (token at capy.ai/settings/tokens), Revyl (`revyl auth login` or API key), Convex, World Labs (buy $5 of credits), Supermemory, Whop sandbox.
5. **Distribution check:** confirm the Expo Go QR flow works on an iPhone and an Android. The room must be able to install in under 30 seconds.

## Decision rule (9:00–9:45 AM)
1. **World API under about 5 min and looks good?** → DREAMWALK (or HERE if a track favors real places/long-distance).
2. **World API slow, ugly or broken?** → TEND + camera roll (best fit, low tech risk).
3. **A track announced at kickoff clearly rewards one idea?** That overrides 1–2 if the score gap is 3 points or less.
4. Whatever we pick, it has to answer in one sentence: **what problem, why daily, what the stage moment is.**

## Day-of build (works for whichever idea wins)
**Stack (default):** Expo / React Native (Expo Go via QR for the room, Android APK), Convex backend, an LLM API, plus the idea's special API. **Capy** writes features from tasks, **Revyl** runs the core flow on a real device for every build, **Convex** handles all state and realtime.

| Time | Milestone |
|---|---|
| 10:00–11:00 | **The one loop, end to end, ugly.** (DREAMWALK: speak → world → friend opens it → voice note) |
| 11:00 | Running on 3 phones owned by 3 different people. Revyl test for the loop green |
| 11:00–12:30 | Make the loop feel good: onboarding under 1 min, push/notification hook |
| 12:30 | **Room push:** QR codes on tables, seed content, sponsor teams first |
| 1:00–5:00 | Ship v2→v4 from real feedback; track **one** number (e.g. % who reciprocate) |
| 5:00 | **Feature freeze.** Pre-generate the hero demo content |
| 5:00–6:00 | Submission, backup video, rehearse the 3-minute demo twice |

### Team roles (for 3 people)
- **App (Expo):** screens, the 3D WebView/camera/voice, the notification hook.
- **Backend + AI:** Convex schema/functions, LLM + special API pipeline, the Supermemory layer.
- **Room + pitch:** recruitment, the live metric, Revyl tests, the demo script, the backup video. (This role is half the win.)

## Sponsor map (fill in after kickoff)
| Sponsor | Required? | Role |
|---|---|---|
| Capy | ✅ | Writes features from tasks during the day (show the task log) |
| Revyl | ✅ | Device test of the core loop on every build ("caught N broken builds") |
| Convex | ✅ | All app state, realtime feed/presence, the live stage metric |
| Supermemory | track | Long-term memory (dream symbols, friend context) |
| Whop | track | Pro tier checkout |
| Candle | track | Mission fit: keeps people close; ask their team about retention at lunch |

## Pitch skeleton (3 min)
1. **Problem** (15s), in human terms, no tech words.
2. **Why existing options fail** (15s).
3. **The strange idea** (30s): hand the judges a phone.
4. **The live moment** (60s): the room's real content.
5. **Proof** (30s): one real number from today.
6. **Why it's a company** (30s): the daily loop, the viral hook, the paid tier.

## Open questions
- Team size and who's on it? Native Swift experience, or Expo?
- Which tracks get announced at kickoff?
- World API latency/cost/quality (tonight's test).
- Can Capy's API turn tasks around fast enough to show live, or do we just use it as our builder?
