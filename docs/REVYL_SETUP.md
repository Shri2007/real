# Revyl: how to run it (and fix it when it breaks)

The Revyl project lives in **`app/`** (`app/.revyl/config.yaml`, test in `app/.revyl/tests/real-core-flow.yaml`). Run every `revyl` command from `app/`, or pass `-C app`. From the repo root, `revyl doctor` reports "Not in a Git worktree / Build System: Not detected", which is the most common reason the CLI "doesn't work".

## 1. Install + sign in (once per machine)
```bash
curl -fsSL https://revyl.com/install.sh | sh
export PATH="$HOME/.revyl/bin:$PATH"     # add to ~/.zshrc so new terminals find it
revyl auth login                          # prints a link: open it, sign in, approve
revyl auth status                         # should say authenticated
```
For a CI or agent machine: put an API key from the Revyl dashboard in `REVYL_API_KEY` and run `revyl auth persist-cloud-env`.

## 2. Health check
```bash
cd app
revyl doctor            # API, auth, project config, build system
revyl config validate   # local + connected validation of .revyl/config.yaml
revyl billing status    # free build/device minutes left (out of minutes = builds fail fast)
```

## 3. Read a failed PR build
The PR check "Revyl preview builds" links to `app.revyl.ai/.../builds/<build-job-id>#logs`. With the CLI:
```bash
revyl build status <build-job-id>          # status + recent logs
revyl build status <build-job-id> --debug --json
```
A failure in under about a minute never reached Xcode: it's setup (npm install / prebuild / pod install), billing or capacity. Check `revyl billing status` first.

## 4. Push the test and run it
```bash
revyl test push real-core-flow                        # uploads app/.revyl/tests/real-core-flow.yaml
revyl build --profile preview --platform ios --remote  # fresh cloud build of the current branch
revyl test run real-core-flow                          # runs it on a cloud iPhone
```
The test signs up as a student with the demo pass `yc2026`, picks 3 interests, then watches the first clip on the React tab. It needs the dev backend seeded (`seed:demo` + `seed:moreUgc`).

## 5. Reproduce the build steps locally (no Revyl account needed)
```bash
cd app && npm install
npx expo prebuild --platform ios --no-install --clean   # same as Revyl's setup step
npx expo export --platform ios                          # proves the JS bundles
# macOS only: cd ios && pod install && xcodebuild ... (see .revyl/config.yaml)
```
