# Project Overview
Unfold is a pixel-art gifting game built with Phaser 3, where a Creator designs a personalized interactive home and hands it to a Recipient as a physical QR-code card. The Recipient scans it, steps inside, and plays through layered interactions, mini-games, and unlocks — a living love letter you walk through.

For full product vision, milestones, and element specs, see [BRIEF.md](BRIEF.md).

# Tech Stack
- **Phaser 3** — game engine (tilemap, physics, sprites, input)
- **Vite** — bundler and dev server
- **EasyStar.js** — A* pathfinding for click/tap-to-move
- **Tiled (.tmj)** — map format; tilesets embedded in `.tmj` (never external)
- React + Tailwind — Builder UI (planned, not yet scaffolded)
- Deployment: Vercel (auto-deploy from `main`)

# Architecture & Patterns

## Folder Structure
```
src/
  scenes/       # Phaser scenes (BootScene, WorldScene; IntroScene + UIScene planned)
  entities/     # Player, NPC (planned)
public/assets/
  tilemaps/     # home.tmj (Phaser), home.tmx (Tiled working file)
  tilesets/     # *.png + *.tsj — relative paths, must stay alongside .tmx
  characters/   # player.png — LimeZu 32×64 spritesheet
```

## Scene Pipeline
`BootScene` → `IntroScene` (planned) → `WorldScene` → `UIScene` (planned overlay)

## Tilemap Layer Order (bottom → top)
| Layer | Depth | Notes |
|---|---|---|
| `Floor` | 0 | |
| `Floor_Decor` | 1 | |
| `Walls` | 2 | |
| `Decor` | 3 | |
| `Decor_Mid` | 4 | |
| `Decor_High` | 5 | |
| `Walls_Above` | 7 | |
| Player sprite | 8 | Runtime |
| `Collision` | — | Logic only, invisible |
| `Entities` | — | Object layer; spawn points |

## Naming Conventions
- `camelCase` for variables and functions
- `PascalCase` for classes and Phaser scene keys
- Tileset keys match filename exactly (e.g. `'Generic_Home_1_Layer_1_32x32'`)

# Spritesheet Reference (Critical)

**File:** `public/assets/characters/player.png` — LimeZu Modern Interiors Premade Character  
**Frame size:** `frameWidth: 32, frameHeight: 64` — ⚠️ never load with `frameHeight: 32`

| Animation | Frames | Notes |
|---|---|---|
| `idle-right` | 56–61 | row 1, dir 0 |
| `idle-up` | 62–67 | row 1, dir 1 |
| `idle-left` | 68–73 | row 1, dir 2 |
| `idle-down` | 74–79 | row 1, dir 3 |
| `walk-right` | 112–117 | row 2, dir 0 |
| `walk-up` | 118–123 | row 2, dir 1 |
| `walk-left` | 124–129 | row 2, dir 2 |
| `walk-down` | 130–135 | row 2, dir 3 |

Physics body: `setSize(16, 8).setOffset(8, 52)` — slim foot-area box.

# Coding & UX Rules
- Tilesets in `.tmj` must remain **embedded** — Phaser cannot read external `.tsj` references.
- Tilesets with tile-level collision properties (`collides: true`) must have their `.tsj` loaded separately as JSON and injected into `Tileset.tileData` before `createLayer`. See `WorldScene.js` for the pattern.
- Collision is set via `setCollisionByProperty({ collides: true })` — never hardcode tile indices.
- Movement is click/tap-to-move (EasyStar A*) as the primary input; WASD/arrow keys are secondary desktop-only.
- Game canvas is pixel-art (`pixelArt: true`, `antialias: false`) — never scale or filter sprites.
- Config storage is URL hash in v1 — no backend writes.
- The Home JSON schema is the source of truth for element configuration — see BRIEF.md §10.

# Workflow Rules
- Start in `Plan` mode before execution.
- Do not make changes to major flows (scene pipeline, tilemap layers, Home JSON schema, interaction system) without explicit approval.
- Check current milestone status in BRIEF.md §20 before picking up new work.
- After editing the Tiled working file (`home.tmx`): export as JSON → overwrite `home.tmj` with tilesets embedded.

# References
- [BRIEF.md](BRIEF.md) — full product spec, milestones, element/mini-game types, data model
- [LimeZu Modern Interiors](https://limezu.itch.io/moderninteriors) — paid asset pack (tilesets + characters)
- [Tiled Map Editor](https://mapeditor.org) — for editing `.tmx` maps
- [Phaser 3 Docs](https://newdocs.phaser.io/docs/3.88.2)
- [EasyStar.js](https://github.com/prettymuchbryce/easystarjs)
