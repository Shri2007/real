# REAL: verified Gen Z reactions + the why, before you post or launch

YC Consumer Mobile Hackathon, Nov 15, 2026. Team: Shri + Vishnu. (Pivoted at 10:45 from OPEN MIC after judge feedback: "zero impact"; the judges suggested a niche UGC marketplace.)

> **Brands and creators are flying blind on Gen Z: bots inflate every metric, and AI fakes every testimonial.** Test your ad, product video or post on **verified students** first: their faces prove they watched, their voices say why. Students use REAL as a **For you feed that learns their taste**: they swipe on clips, react on camera and get paid. Once the feed knows them, they unlock **paid UGC jobs picked for their taste** and make content for the brands. **We pay for attention, not applause**, so nobody has a reason to fake it.

- **Build plan, lanes, API contract:** [`docs/TASKS.md`](docs/TASKS.md) (demo seed + Keiki tool setup at the bottom)
- **Agent rules:** [`AGENTS.md`](AGENTS.md)
- **Commands:** [`docs/COMMANDS.md`](docs/COMMANDS.md) · **Env/secrets:** [`docs/ENV.md`](docs/ENV.md)

## How it works

```mermaid
flowchart LR
  subgraph Student["Student (app)"]
    O[Name + .edu code + interests] --> F[For you feed]
    F -->|swipe| T[Taste profile]
    F -->|Watch & earn| W[Camera reaction + hold-to-talk why]
    W --> T
    T --> F
    T -->|after 5 signals| U[UGC jobs matched to you]
    U --> V[Film / upload] --> P[Approved → paid]
  end
  subgraph Brand["Brand / creator (app or Keiki iMessage)"]
    C[Post clip + pay via Whop] --> R[Live results: curve, quotes, AI fixes, segments]
    R --> J[Post UGC job + fund via Whop]
    J --> A[Approve student videos]
  end
  C --> F
  W --> R
  J --> U
  V --> A
```

### Student side
- **Onboarding:** name and color. Optional `.edu` email: we **email a 6-digit code** (Convex + Resend), and only a correct code gives the "✓ Verified student · School" badge. One verified account per school email. Then pick 3+ interests to seed the feed.
- **For you tab (preference engine):** one card at a time, swipe right or left. Every clip and job is AI-tagged at creation. Each student has per-tag weights that move with swipes (±1), laughing during a reaction (+1), a positive or negative voice "why" (±1), and claiming a job (+2). The feed ranks by those weights, and every 4th card explores something different. Cards show a match % and the reason ("Because you liked gym").
- **Reacting:** a 3-2-1 countdown, then on-device face detection (MediaPipe in a WebView) draws a laugh curve. No video is uploaded. Paid the same whether they laugh or not (watched to the end, face in frame ≥70%). Then **hold to say why** (3–15s), transcribed into a quote and reason tags.
- **Tailored UGC jobs:** locked until the engine has 5 signals ("🔒 Swipe N more…"). After that, only jobs that match the student's taste show, first card then every 3rd: "Picked for you: you're into energy drinks + comedy". Verified students only. Pick → film or upload → brand approves → paid to wallet.
- **Wallet:** balance, streak, history, cash out.

### Brand / creator side
- **Create a test:** upload a clip of 30s or less, set slots and price, pay with **Whop** (slots × price + 20%), or publish a free demo.
- **Live Results:** laugh curve over the video, "What people said" quotes and top reasons, an AI "What to fix" report (3 timestamped edits, auto-written when slots fill), "Who it landed with" (verified / school / taste segments), A/B compare, and **Present** (projector view).
- **UGC jobs:** post a brief, payout and spots, then fund them with Whop UGC credits. Review submitted videos: Approve & pay, or Pass.
- **Keiki (iMessage):** text a clip to make a test and get results texted back. Tools for UGC jobs, review and inbox updates are on the backend (`/keiki/*`); see `docs/TASKS.md`.

## Status (17:00 freeze)
| Area | State |
|---|---|
| Clip test → camera reaction → paid → live results, A/B, stage | ✅ merged, used on phones earlier |
| Hold-to-talk why → quotes, AI report, segment insights | ✅ merged + deployed; OpenAI live-tested (tags, report) |
| For you feed + preference engine, interest picker | ✅ merged + deployed; backend-tested |
| Tailored UGC jobs (unlock + taste match), claim → submit → approve → paid | ✅ merged + deployed; backend-tested |
| `.edu` email-code verification | ✅ merged + deployed; real email delivered |
| Whop checkout + webhook (tests and UGC credits) | 🟡 code merged; Shri wiring the sandbox webhook |
| Keiki agent: UGC/inbox tools | 🟡 backend routes live; tools need adding to the REAL agent (Shri's Keiki account) |
| Revyl core-flow test | 🟡 updated in repo; push + run with the Revyl CLI |
| New screens on a real phone | ⬜ not yet tried |

**Demo backend:** Convex dev deployment `hip-partridge-245`, seeded with `npx convex run seed:demo` + `seed:moreUgc` (8 brands, 12 clips, 12 UGC jobs, one finished test). Codes from Resend only reach the Resend account's own email until a domain is verified.

## Sponsors
| Sponsor | Role |
|---|---|
| **Convex** (required) | all data, the live results, the preference engine, verification codes, scheduled AI jobs |
| **Capy** (required) | built the voice why, Whop + AI report, For you + UGC, demo seed, tailored UGC, `.edu` codes (`capy/*` PRs) |
| **Revyl** (required) | every PR built + checked on a cloud iPhone (Proof of Changes) |
| **Whop** | brands pay per test and fund UGC jobs; students cash out |
| **Keiki** | brands test clips, post UGC jobs and approve videos over iMessage |
| **OpenAI** | transcription, quote extraction, AI tags, "What to fix" report |

## Money
A brand pays per reaction slot + 20% platform fee, and funds UGC jobs (payout × spots + 20%). Students earn per valid reaction and per approved UGC video.
