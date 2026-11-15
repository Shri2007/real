# Skills and tools to install (tonight)

Everything here is **free**. Install for each agent you'll use (Claude Code, Codex, Cursor). Vishnu installs the same set.

## Must-have

| What | Why | Install |
|---|---|---|
| **Expo skills** (official) | Teaches your agent Expo Router, native UI, dev clients, EAS, animations, data fetching. Your biggest gap is iOS, and this covers it | Claude Code: `claude plugin install expo@claude-plugins-official` · Codex: `codex plugin add expo@openai-curated` · Cursor (run in the repo): `npx skills add expo/skills` |
| **Convex plugin/skills** | Correct Convex functions, schema, actions, crons (you already have it in Claude Code) | Claude Code: already installed (`convex:*` skills). Others: `npx convex ai-files install` inside `app/` at 10:00 |
| **Revyl skills** | Dev loop on cloud devices, writing tests, Expo auth bypass | After installing the Revyl CLI: `revyl skill install --force` (docs: https://docs.revyl.com/agents/skills.md) |
| **Revyl CLI** | Required sponsor | https://docs.revyl.com/install.md, then `revyl auth login` |
| **Expo Go** (iPhone app) | Run the app on your phone with no Apple Developer account | App Store, free |
| **Xcode + iOS Simulator** | Needed to make the simulator `.app` that Revyl runs | Mac App Store, free (big download: start tonight) |

## Already in your Claude Code (use them)
- `superpowers:brainstorming`, `superpowers:writing-plans`, `superpowers:executing-plans`: plan, then execute.
- `superpowers:systematic-debugging`: when something breaks, use this instead of guessing.
- `superpowers:dispatching-parallel-agents` / `superpowers:subagent-driven-development`: run several agents on separate files at once.
- `ecc:react-native-patterns`, `ecc:react-patterns`, `ecc:typescript-patterns`: RN/TS code quality.
- `ecc:frontend-design-direction`, `ecc:make-interfaces-feel-better`: polish the UI fast.
- `superpowers:verification-before-completion`: check it really works before saying done.
- `hackathon-idea-evaluator`: stress-test the pitch.

## Nice-to-have
- **Supermemory skills/CLI** if they publish one for agents (check https://supermemory.ai/llms.txt). Otherwise point your agent at that file.
- **Whop docs for agents:** point your agent at https://docs.whop.com/llms.txt when doing checkout.
- **Capy:** no local install. It runs in the cloud. Install its GitHub app on the `yc-hacks-open-mic` repo and create tasks at capy.ai.

## What you do NOT need (save money)
- ❌ Apple Developer Program ($99/yr), ❌ TestFlight, ❌ App Store submission. The rules only need the app running on a real phone. Expo Go does that for free.
- ❌ Paid EAS plan. The free tier is enough, and Revyl can build on its own remote runners.

## How to actually use skills (you said you don't yet)
1. Skills load **automatically** when your request matches them. Just describe the task ("add an Expo Router tab layout").
2. You can force one: in Claude Code type `/expo-router` or say "use the expo-native-ui skill."
3. Start every big task with: "Read AGENTS.md first." Every agent then knows the lanes, rules and stack.
4. For a feature: "brainstorm → write plan → execute plan" (superpowers) keeps agents from going off the rails.
