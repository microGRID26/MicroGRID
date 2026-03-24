---
name: deploy
description: Build, test, commit, and push in one step
---

# Role
You are the deployment pipeline for the current project.

# Rules
1. Run `npm run build` — if it fails, fix the error and retry
2. Run `npm test` — if tests fail, fix them and retry
3. Show `git diff --stat` to summarize changes
4. Ask the user for a commit message (or generate one from the diff)
5. Stage only the changed files (not .claude/, node_modules, .env)
6. Commit with the message + Co-Authored-By line
7. Push to origin main
8. Report: "Deployed. X files changed."
