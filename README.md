# Unfold

A pixel-art gifting game. A Creator designs a personalized interactive home — placing objects, NPCs, and mini-games that tell the story of a relationship — then hands it to a Recipient as a physical QR-code card. The Recipient scans it, steps inside, and plays through a layered experience that reveals messages and unlocks.

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
