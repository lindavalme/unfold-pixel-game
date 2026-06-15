# Branching Workflow

## Branch Map

```
main  ──────────────────────────────────────────────────► production
  │
  ├── feat/gameboy-frame  ──► (PR → merge → delete)
  ├── feat/intro-scene    ──► (PR → merge → delete)
  │
  ├── gift/eric    ◄── merge main periodically; never merge back
  └── gift/denval  ◄── merge main periodically; never merge back
```

## Branch Types

| Branch | Pattern | Purpose |
|---|---|---|
| `main` | (fixed) | Production. Always the **demo config** — neutral recipient, generic copy. |
| `gift/<name>` | `gift/eric` | Recipient-specific build. Forks from `main`; never merges back. |
| `feat/<scope>` | `feat/gameboy-frame` | Feature development. Branches from `main`, PRs back to `main`. |

---

## The One Unbreakable Rule

> **`main` is always the demo.** Never commit recipient names, personalized avatars, or gift-specific dialog to `main`. That content lives only on gift branches.

If you're unsure whether a change belongs on `main` or a gift branch, ask: *would a stranger scanning the production URL see anything personal?* If yes, it belongs on the gift branch.

---

## Workflows

### Starting a new feature

```bash
git checkout main
git pull origin main
git checkout -b feat/<scope>   # e.g. feat/npc-dialog
# ... work ...
git push origin feat/<scope>
# Open a PR into main on GitHub
```

After merging, delete the feature branch — it has served its purpose.

### Creating a new gift branch

```bash
git checkout main
git pull origin main
git checkout -b gift/<recipient>   # e.g. gift/sarah

# Now personalize: recipient name, avatar tints, battle opponent, dialog copy
# Commit your changes
git push -u origin gift/<recipient>
```

Share the **branch preview URL** with the recipient (see Deploy URLs below).

### Syncing a gift branch with the latest main

As you ship improvements on `main` (bug fixes, new mechanics, UI polish), pull them into existing gift branches:

```bash
git checkout gift/<recipient>
git merge main
# Resolve any conflicts — personalized content takes priority
git push origin gift/<recipient>
```

Do this before finalizing any gift so the recipient gets all current improvements.

### Deploying to production

Push to `main` — Vercel auto-deploys.

```bash
git checkout main
git push origin main
```

Production is live at **https://unfold-kappa.vercel.app** within ~1 minute.

---

## Deploy URLs

| Trigger | URL | Use for |
|---|---|---|
| Push to `main` | `https://unfold-kappa.vercel.app` | Sharing the public demo |
| Any branch push | `unfold-git-<branch>-lindavalmes-projects.vercel.app` | Sharing a stable gift link |
| Any commit | `unfold-<hash>-lindavalmes-projects.vercel.app` | Pinning a specific snapshot |

**For gift sharing, always use the branch URL** — it stays stable across pushes and you can keep improving the gift without changing the link.

---

## Quick Reference

| Situation | Action |
|---|---|
| New feature | `feat/<scope>` off `main` → PR → merge → delete |
| New recipient gift | `gift/<name>` off `main` → personalize → push → share branch URL |
| Main got improvements | `git merge main` into the gift branch |
| Ready to ship main | `git push origin main` |
| Never do this | Merge a gift branch back into `main` |
