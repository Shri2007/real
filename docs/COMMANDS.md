# Command cheat sheet

All `npm run` commands run from `app/`: `cd ~/hackathons/yc-hacks-open-mic/app`

## Always running (2 terminal tabs)
| Tab | Command | What |
|---|---|---|
| 1 | `npm run convex` | Convex watcher: pushes backend changes live, shows errors |
| 2 | `npm run phone` | Expo dev server → scan the QR code with your iPhone camera → Expo Go |

Phone can't connect (venue Wi-Fi blocks it)? Use `npm run phone:tunnel`.

## Convex
| Command | What |
|---|---|
| `npm run env:list` | which keys are set (names only) |
| `npm run env:keys` | re-set Supermemory + Keiki keys from the Mac Keychain |
| `npx convex env set OPENAI_API_KEY "..."` | add the OpenAI key (kickoff link) |
| `npx convex dashboard` | open the Convex dashboard (data, logs) |
| `npx convex logs` | stream function logs |

## Revyl
| Command | What |
|---|---|
| `npm run revyl:dev` | run the app on a cloud iPhone with hot reload |
| `npm run revyl:build` | fresh cloud iOS build (after adding native packages) |
| `npm run revyl:device` | open the latest build on a cloud iPhone |
| `npm run revyl:status` | GitHub + config health check |
| `revyl device screenshot --out shot.png` | screenshot the cloud device |

PRs get built + checked by Revyl automatically (Proof of Changes is on).

## Git (small PRs, main always works)
```bash
git checkout -b shri/laugh-detector      # or vishnu/<thing>
git add -A && git commit -m "..." && git push -u origin HEAD
gh pr create --fill                       # Revyl builds + checks it on a cloud iPhone
gh pr merge --squash --delete-branch
git checkout main && git pull
```

## Adding packages (use expo install so versions match SDK 58)
```bash
npx expo install <package>
```
Native packages that Expo Go doesn't include → need `npm run revyl:build` (a new native build). Avoid them unless agreed.

## Emergency
| Problem | Fix |
|---|---|
| App stuck or old code on phone | shake phone → Reload, or press `r` in the Expo tab |
| Metro cache weirdness | `npx expo start -c` |
| Convex "No CONVEX_DEPLOYMENT" | you're not in `app/`; `cd` there |
| Port in use | `npx expo start --port 8082` |
