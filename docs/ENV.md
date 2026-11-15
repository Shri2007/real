# Environment variables and secrets

**Rule: secrets never go in the Expo app.** Anything named `EXPO_PUBLIC_*` is bundled into the app and readable by anyone. All API keys live in **Convex env vars** and get used only inside Convex actions.

## `app/.env.local` (auto-created by `npx convex dev`, gitignored)
```
CONVEX_DEPLOYMENT=dev:xxxx-xxxx-123     # written by convex dev
EXPO_PUBLIC_CONVEX_URL=https://xxxx.convex.cloud   # written by convex dev, safe to be public
```
That's the only local env file. Don't add keys here.

## `app/.env.example` (commit this at 10:00 so Vishnu knows the shape)
```
CONVEX_DEPLOYMENT=
EXPO_PUBLIC_CONVEX_URL=
```

## Convex env vars (secrets: set with `npx convex env set NAME value` from `app/`)
| Name | For | Required? |
|---|---|---|
| `OPENAI_API_KEY` | AI host (Responses API, `gpt-6-luna`) | ✅ |
| `SUPERMEMORY_API_KEY` | humor memory / graph / host picks | ✅ (track) |
| `WHOP_API_KEY` | Whop sandbox: checkout, UGC funding, student cash-out transfers | ✅ |
| `WHOP_COMPANY_ID` | the `biz_…` company that receives payments and sends cash-outs | ✅ |
| `WHOP_API_BASE` | override the Whop API (defaults to `https://sandbox-api.whop.com/api/v1`) | no |
| `WHOP_WEBHOOK_SECRET` | verify Whop webhooks in a Convex HTTP action | ✅ |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | send `.edu` codes to any inbox (Gmail SMTP, 16-char app password) | ✅ for real codes |
| `RESEND_API_KEY` / `RESEND_FROM` | fallback email sender; only reaches any inbox with a verified domain in `RESEND_FROM` | no |
| `DEMO_PASS` | judges' demo pass instead of a `.edu` (defaults to `yc2026`) | no |
| `KEIKI_API_KEY` | text-the-host over iMessage | only if the event plan unlocks the gateway (see below) |

Supermemory key from the Keychain (no typing):
```bash
npx convex env set SUPERMEMORY_API_KEY "$(security find-generic-password -s supermemory-open-mic -w)"
```
Check what's set: `npx convex env list`.

## Elsewhere (not files)
- **Capy:** + → Environment variables → Project: `OPENAI_API_KEY` (so Capy threads can test AI code), plus your OpenAI key in Settings → Models.
- **Revyl:** `.revyl/config.yaml` holds **no secrets**. Use `revyl build secret set NAME` if a build ever needs one.
- **Supermemory docs MCP:** `.mcp.json` is public-safe (no key).

## Keiki: only if it's actually free
The event page says the invite code gives **build credits + an iMessage line, no card**. But it also says **channels and the API gateway "require a plan."** At kickoff, ask the Keiki people: *"Does the event invite unlock the API gateway and the shared iMessage number?"*
- **Yes:** a strong use is **"friends without the app can join the Daily Drop by texting the OPEN MIC number."** That solves the chicken-and-egg problem and gives you a live "text it right now" moment on stage.
- **No:** skip it. Don't pay for a plan.
