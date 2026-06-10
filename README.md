# Unfold

A pixel-art gifting game. A Creator designs a personalized interactive home — placing objects, NPCs, and mini-games that tell the story of a relationship — then hands it to a Recipient as a physical QR-code card. The Recipient scans it, steps inside, and plays through a layered experience that reveals messages, unlocks rooms, and ends with something they'll want to keep.

> For the full product spec, see [BRIEF.md](BRIEF.md).

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build

```bash
npm run build   # outputs to /dist
npm run preview # preview the production build locally
```

## Project Structure

```
src/
  scenes/         # Phaser scenes (BootScene, WorldScene)
  entities/       # Player, NPC (planned)
public/assets/
  tilemaps/       # home.tmj (Phaser runtime), home.tmx (Tiled working file)
  tilesets/       # PNG + .tsj files — relative paths, keep alongside .tmx
  characters/     # player.png — LimeZu 32×64 spritesheet
```

## Map Editing

1. Open `public/assets/tilemaps/home.tmx` in [Tiled Map Editor](https://mapeditor.org)
2. Edit layers and tilesets as needed
3. **File → Export As → JSON (.tmj)** → overwrite `public/assets/tilemaps/home.tmj`
4. Tilesets must remain **embedded** in the `.tmj` — Phaser cannot read external `.tsj` references

## Deploy Cheat Sheet

| Intent | Say to Claude | Command run |
|---|---|---|
| Test a change | "deploy for testing" | `vercel` → per-deploy preview URL + branch URL |
| Ship to production | "deploy to prod" | `git push origin main` + `vercel --prod` |
| Save progress only | "commit this" | commit + push branch, no deploy |

**Two types of preview URLs:**
- **Per-deploy** `unfold-<hash>-lindavalmes-projects.vercel.app` — snapshot of one specific deploy, never changes
- **Branch** `unfold-git-<branch-name>-lindavalmes-projects.vercel.app` — always reflects latest push to that branch, good for sharing

**Rules:**
- `main` = production (https://unfold-kappa.vercel.app)
- All feature work lives on `feature/*` branches — deploys from these are always previews
- Claude will always ask for confirmation before merging to `main`

**Full flow:**
```bash
# Start a feature
git checkout -b feature/my-feature

# Test it
vercel                          # → unique preview URL

# Ship it (Claude does this, after confirming)
git checkout main
git merge feature/my-feature --no-ff
git push origin main            # → triggers production deploy
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Game engine | Phaser 3 |
| Pathfinding | EasyStar.js |
| Map format | Tiled (.tmj) |
| Bundler | Vite |
| Deployment | Vercel |

## Assets

Tilesets and character sprites from [LimeZu Modern Interiors](https://limezu.itch.io/moderninteriors) (paid license).
