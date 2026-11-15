# REAL: verified Gen Z reactions + the why, before you post or launch

YC Consumer Mobile Hackathon, Nov 15, 2026. Team: Shri + Vishnu. (Pivoted at 10:45 from OPEN MIC after judge feedback: "zero impact"; the judges suggested a niche UGC marketplace.)

> **Brands and creators are flying blind on Gen Z: bots inflate every metric, and AI fakes every testimonial.** Test your ad, product video or post on **verified students** first: their faces prove they watched, their voices say why. REAL is a marketplace for **verified human reactions**: creators post a clip and pay per reaction; real people watch it with their camera on and get paid; on-device face detection proves a real human watched. Creators get a **live reaction curve** ("2 of 3 laughed at 0:04, attention dropped at 0:09") and an AI report. **We pay for attention, not applause**, so nobody has a reason to fake it.

- **Build plan, lanes, API contract:** [`docs/TASKS.md`](docs/TASKS.md)
- **Agent rules:** [`AGENTS.md`](AGENTS.md)
- **Commands:** [`docs/COMMANDS.md`](docs/COMMANDS.md) · **Env/secrets:** [`docs/ENV.md`](docs/ENV.md)

## Sponsors
| Sponsor | Role |
|---|---|
| **Convex** (required) | gigs, reactions, live reaction curve, wallet |
| **Capy** (required) | builds screens from task specs (wallet, ...) |
| **Revyl** (required) | every PR built + checked on a cloud iPhone (Proof of Changes) |
| **Whop** | creators pay per test; reactors cash out (core money flow) |
| **Supermemory** | reactor taste memory → match clips to the right audience |
| **OpenAI** | AI report on each clip's reactions |

## Daily loop
- **Reactors:** a daily gig drop, 30-second paid clips, a growing balance.
- **Creators:** test every clip before posting, fix it, re-test.

## Money
A creator pays per reaction slot + a platform fee; reactors earn per valid reaction (watched to the end, face in frame ≥70%).
