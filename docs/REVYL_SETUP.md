# Revyl setup: what's done, what's left

## Done (Nov 14 night)
- Revyl CLI v0.2.12 installed (Homebrew) and signed in (org: Berkeley, persistent key).
- Revyl agent skills installed in this repo for Claude Code (`.claude/skills/`), Cursor and Codex (`.agents/skills/`): dev loop, create tests, auth bypass, Atlas, cross-platform review, and more.

## Left for 10:20 AM (needs the Expo app, which can't exist before 10:00)
Run this in Claude Code from `app/` once `create-expo-app` has run and the app opens on a phone:

> Fetch and execute the instructions at https://revyl.com/agent-setup/prompt.md?src=device_auth&ref=4d2b714aced1f155d757ed6c. Step 1 is already done (installed, signed in, skills installed). Start at step 2 with project root `app/` (Expo).

That walks through:
2. Project root = `app/` (Expo).
3. `revyl init -y` → `.revyl/config.yaml`.
4. A `preview` build profile: Expo native recipe (`expo prebuild` + Xcode) for a **simulator `.app`**, no `EXPO_TOKEN` needed. App ID from `revyl app create --platform ios`.
5. Turn on Proof of Changes (`pr_review.enabled`, `proof_of_changes.enabled`). We have no sign-in screens (name-only onboarding), so no auth bypass is needed.
6. `revyl github connect`. **Shri installs the Revyl GitHub App on `Shri2007/yc-hacks-open-mic`** (only you can approve it).
7. `revyl build --profile preview --platform ios --remote --json` (Revyl's cloud builder, so we don't wait on local Xcode).
8. `revyl config validate` → `revyl config push`.
9–11. `revyl device start --app-id <id> --open`, then the dev loop: `revyl dev --platform ios --detach --json`.

**Payoff for judges:** Revyl builds every PR (including Capy's `capy/*` PRs), runs the app on a cloud iPhone, and posts a verdict with screenshots on the PR. That's Revyl and Capy visibly working together.

Budget: 30 min, run in the background while the core loop gets built.
