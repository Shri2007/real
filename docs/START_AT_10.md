# 10:00 AM: start sequence (paste these in order)

The GitHub repo gets created at 10:00 so the whole repo's history is from the event.

## 1. Create the repo and push the planning docs (10:00, ~1 min)
```bash
cd ~/hackathons/yc-hacks-open-mic && git init -b main && git add -A && git commit -m "Planning docs only (README, AGENTS.md, skills): no app code" && gh repo create yc-hacks-open-mic --private --source . --push
```

## 2. Add Vishnu (replace VISHNU_GH)
```bash
gh api -X PUT repos/Shri2007/yc-hacks-open-mic/collaborators/VISHNU_GH -f permission=push
```

## 3. Create the Expo app (10:02)
```bash
cd ~/hackathons/yc-hacks-open-mic && npx create-expo-app@latest app --yes
```
```bash
cd ~/hackathons/yc-hacks-open-mic/app && npx expo start
```
Scan the QR code with your iPhone camera → it opens in Expo Go.

## 4. Connect Convex (Vishnu, or you if solo)
```bash
cd ~/hackathons/yc-hacks-open-mic/app && npm i convex && npx convex dev
```
Choose **create a new project**. Then set the Supermemory key straight from the Keychain:
```bash
npx convex env set SUPERMEMORY_API_KEY "$(security find-generic-password -s supermemory-open-mic -w)"
```

## 5. Commit + push the scaffold
```bash
cd ~/hackathons/yc-hacks-open-mic && git add -A && git commit -m "Scaffold Expo app + Convex" && git push
```

## 6. Sponsors (10:20–10:50)
- **Capy:** in Capy → Settings → Integrations → GitHub, give the app access to `yc-hacks-open-mic`. (Tip: if you installed it for "All repositories," it's already covered.)
- **Revyl:** paste the prompt from `docs/REVYL_SETUP.md` into Claude Code from `app/`.
- **Supermemory:** done in step 4. The docs MCP loads from `.mcp.json`.
- **Whop:** only if kickoff announced a Whop prize.
- **OpenAI ($100 free credits):** claim with your personal link from kickoff (platform.openai.com/p/…) → create a secret key in that org →
  - **Capy:** Settings → Models → Your connections → OpenAI → paste the key, and **drag it above other OpenAI connections** so Capy threads use the free credits. Then in a thread: + → Environment variables → Project → `OPENAI_API_KEY`.
  - **Convex** (the AI host calls OpenAI only from a Convex action; the key never ships in the app):
    ```bash
    cd ~/hackathons/yc-hacks-open-mic/app && npx convex env set OPENAI_API_KEY "<paste key>"
    ```
  - Model: `gpt-6-luna` (cheap) via the Responses API. `gpt-6.1-sol` only if you need it.

## 7. First WebView camera check (10:30)
On your phone, the laugh detector inside the app must show live smile/eye-squint scores. If it fails by 11:00, switch to the `expo-camera` snapshot route.
