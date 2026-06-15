# 🏠 Unfold — Project Specification
**Version:** 3.0  
**Last updated:** June 2026

---

## 1. Product Vision

**Unfold** is a gifting ritual disguised as a game. One person (the *Creator*) builds a personalized pixel-art home — placing objects, NPCs, mini-games, and mementos that tell the story of their relationship — then hands it to someone else (the *Recipient*) as a physical printable artifact containing a QR code. The Recipient scans it, steps inside, and plays through a layered experience that reveals messages, unlocks rooms, and ends with something they'll want to keep.

It is a living love letter. A scrapbook you walk through. A ritual with physical weight and digital warmth.

---

## 2. User Roles

| Role | Description |
|---|---|
| **Creator** | Uses the guided Builder UI to design the home, configure elements and mini-games, record an intro message, and generate a physical printable to hand to the Recipient. |
| **Recipient** | Scans the QR code, hears the intro message, and plays through the home — no account needed, no setup. Pure discovery. |

---

## 3. Core Experiences

### 3.1 The Builder (Creator-facing)
A guided, mobile-friendly step-by-step flow where the Creator:
- Names the home and the recipient's character
- Records a voice intro (or writes a text intro)
- Places Elements (objects, NPCs, signs, mini-games) onto a floor grid
- Configures each Element's behavior and story beat
- Publishes and downloads/prints the physical QR artifact

### 3.2 The Intro (Recipient-facing, pre-game)
Before the game world appears, the Recipient experiences:
- A warm title screen showing the home name and recipient's character name
- The creator's voice message (or animated text if text-only) plays over ambient sound
- A gentle "Step inside →" prompt to begin

### 3.3 The Game (Recipient-facing)
A mobile-first 2D pixel game where the Recipient:
- Spawns as their named character in a partially sparse home
- Walks around using click/tap-to-move on all platforms
- Discovers Elements that trigger interactions and mini-games
- Completes mini-games to unlock letters, decor, and outfit changes
- Finishes with a closing scene and a fully alive, decorated home

### 3.4 The Printable (Physical artifact)
A beautifully designed, game-themed card the Creator physically hands to the Recipient containing:
- The recipient's name and a creator-written tagline
- Pixel art illustration reflecting the home's configured elements
- A QR code linking to the game
- The product name/brand (*Unfold*)

---

## 4. Scope — v1 Demo

### In Scope
- [ ] 1 home template (single floor, 20×15 tile grid)
- [ ] Builder UI: guided step-by-step flow, mobile-friendly, localStorage draft persistence
- [ ] Minimum viable gift (see §4.1)
- [ ] 3 Element types: NPC, Object, Sign (see §5)
- [ ] 2 Mini-game types: Trivia and Hidden Object (see §6)
- [ ] Layered unlocks: letter, decor, outfit change, closing scene (see §7)
- [ ] Player character named by Creator
- [ ] Voice intro (recorded in browser) or text intro fallback
- [ ] Click/tap-to-move navigation on all platforms (primary)
- [ ] WASD / arrow keys as secondary input on desktop
- [ ] Proximity-triggered interaction with sparkle indicator
- [ ] Dialog box UI for messages
- [ ] Failure states: everything eventually completable, hints after 3 wrong attempts
- [ ] Shareable URL via URL hash (v1 — no backend required)
- [ ] Printable QR artifact exported as PDF from Builder

### Out of Scope (v1)
- Multi-floor navigation (data model supports it — deferred to v2)
- Creator accounts / cloud draft saving (localStorage only for v1)
- Occasion-specific themes
- Scheduled delivery / countdown
- Recipient reply / creator notification
- Sound/music customization by Creator
- Custom sprite uploads
- Animations beyond idle + walk cycle

### 4.1 Minimum Viable Gift
The least a Creator must complete to publish:

| Field | Required | Notes |
|---|---|---|
| Recipient's name | ✅ | Names the player character in-game |
| Creator's name | ✅ | Signs the experience |
| Home title | ✅ | e.g. "A little something for you" |
| Intro message | ✅ | Voice OR text — at least one required |
| At least 1 Element | ✅ | Any type: NPC, Object, or Sign |
| At least 1 dialog/message | ✅ | The gift must have a voice |

Everything else (mini-games, multiple elements, unlocks) is optional enrichment.

---

## 5. Element Types

Each Element is placed on a tile and has a **type** that determines its appearance and behavior when the Recipient interacts with it.

### 5.1 NPC (Character)
A small animated character that stands in place.

**Creator configures:**
- Name (displayed above head)
- Sprite (choose from preset list)
- Dialog lines (1–3 lines, shown sequentially on repeat interact)
- Optional: mood (happy / sad / mysterious → affects sprite expression)

**Recipient experience:**
- NPC faces player when approached
- Tap NPC → dialog box with name + message
- Cycle through lines, loops on repeat

### 5.2 Object (Interactive prop)
A furniture or décor item that reacts when tapped.

**Creator configures:**
- Object type (bookshelf, chest, photo frame, plant, TV, record player…)
- Behavior on interact — one of:
  - **Show message** — display a custom text string
  - **Show image** — display a preset illustration or emoji art
  - **Toggle** — object changes sprite state (chest open/closed, lamp on/off)
  - **Trigger mini-game** — launches a mini-game (see §6)

**Recipient experience:**
- Sparkle indicator when in range
- Tap object → chosen behavior fires

### 5.3 Sign / Note
A pinned note, letter, or framed message.

**Creator configures:**
- Visual style (sticky note, letter, framed print, chalkboard)
- Text content (up to 200 characters)
- Optional: author name at bottom ("— from Alex")

**Recipient experience:**
- Tap sign → styled card overlay appears

---

## 6. Mini-Game Types (v1)

Mini-games attach to Objects or NPCs. Completing one triggers an unlock (§7). All are eventually completable — hints appear after 3 wrong attempts, no hard blocks.

### 6.1 Trivia — *"Things Only You Would Know"*
Creator writes relationship questions. Recipient answers.

**Creator configures:**
- Question text
- Correct answer
- 2–3 wrong answer options
- Optional: custom wrong-answer reaction message

**Recipient experience:**
- Multiple choice card appears
- Wrong → gentle reaction, try again (hint after 3 attempts)
- Correct → celebration → unlock fires

### 6.2 Hidden Object — *"Find the ___"*
Recipient must tap a specific Element in the room.

**Creator configures:**
- Prompt text (e.g. "Find the thing I always leave at your place")
- Which placed Element is the target

**Recipient experience:**
- Prompt appears over the room
- Wrong tap → gentle shake, try again
- Correct tap → unlock fires

---

## 7. Unlock System

Completing a mini-game triggers a layered unlock. The home fills up and comes alive as the Recipient plays.

| Unlock type | What happens |
|---|---|
| **Letter** | Styled card overlays the screen — creator's words, a personal story beat |
| **New decor** | A new object appears in the room (photo on wall, flowers bloom, item on shelf) |
| **Outfit change** | Recipient's character sprite updates — new accessory or clothing |
| **Closing scene** | Final unlock: ambient effect (stars, petals, light) + creator's closing message |
| **Room unlock** | Deferred to v2 (multi-floor) |

Creator configures which unlock fires after each mini-game and writes any letter content.

---

## 8. The Intro Experience

Plays on a title screen before the game world loads.

### Voice Intro (primary)
- Creator records up to 60 seconds via browser `MediaRecorder` API (no third party)
- Plays over the title screen with ambient background sound
- Displays: *"A home made for [Recipient name]"*
- Replayable via a small button during gameplay

### Text Intro (fallback)
- Creator writes up to 300 characters
- Animates in word by word over a styled card in a handwritten-style font
- Same screen layout as voice option

---

## 9. The Printable

A physical card the Creator downloads from the Builder and prints to hand to the Recipient.

### Contents
- Recipient's name large at top (*"For Jamie"*)
- Creator-written tagline (*"Something I made for you"*)
- Pixel art illustration auto-generated from home config (character, room silhouette, key objects)
- QR code linking to the game URL
- Creator's name at bottom
- *Unfold* wordmark

### Format (v1)
- Folded A5 card — print at home or at a print shop
- Generated as styled HTML/CSS → exported via browser print dialog to PDF
- Pixel art elements drawn programmatically from Home JSON (no image uploads needed)

---

## 10. Data Model

A **Home** is a single JSON config object — stored in the URL hash (v1) or Supabase (v2).

```json
{
  "meta": {
    "title": "A little home for you",
    "created_by": "Alex",
    "recipient_name": "Jamie",
    "character_sprite": "person_warm",
    "intro_type": "voice",
    "intro_audio_url": "...",
    "intro_text": null
  },
  "floors": [
    {
      "id": "ground",
      "label": "Ground Floor",
      "tilemap": "cottage_ground",
      "elements": [
        {
          "id": "npc_cat",
          "type": "npc",
          "tile_x": 5,
          "tile_y": 7,
          "sprite": "cat_orange",
          "name": "Biscuit",
          "dialog": ["Mrow!", "I've been waiting for you.", "..."]
        },
        {
          "id": "obj_chest",
          "type": "object",
          "tile_x": 10,
          "tile_y": 3,
          "sprite": "chest_wooden",
          "behavior": "minigame",
          "minigame": {
            "type": "trivia",
            "question": "What was the first movie we watched together?",
            "correct": "Spirited Away",
            "wrong": ["The Notebook", "Interstellar"],
            "wrong_reaction": "Haha, really?? Try again 😄"
          },
          "unlock": {
            "type": "letter",
            "content": "I still think about that night...",
            "author": "Alex"
          }
        },
        {
          "id": "sign_note",
          "type": "sign",
          "tile_x": 2,
          "tile_y": 2,
          "style": "letter",
          "content": "Dear Jamie, I made this for you...",
          "author": "Alex"
        }
      ]
    }
  ]
}
```

---

## 11. Builder Flow (Guided, Mobile-first)

A linear step-by-step wizard. Form fields only in v1 — no drag-and-drop canvas.

```
Step 1 — About this gift
  · Recipient's name
  · Your name
  · Home title / tagline

Step 2 — Say hello
  · Record voice intro (up to 60s) OR write text intro (up to 300 chars)

Step 3 — Build the home
  · Add Elements one at a time (type → configure → place)
  · Minimum: 1 element with 1 dialog/message to proceed
  · Each element shows a collapsed summary card when done

Step 4 — Add mini-games (optional)
  · Attach a mini-game to any Object element
  · Configure unlock type and content for each

Step 5 — Preview & Publish
  · Summary of everything built
  · [Preview] → opens game in new tab with current config
  · [Publish & Get Link] → generates URL hash + downloadable PDF printable
```

Draft progress saved to `localStorage` — no account needed to return on the same device.

---

## 12. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Game engine | **Phaser 3** | Tilemap, physics, sprites, camera, input |
| Map format | **Tiled (.tmj)** | Native Phaser support; tilesets embedded in .tmj |
| Pathfinding | **EasyStar.js** | A* pathfinding for click/tap-to-move |
| Builder UI | **React + Tailwind** | Guided form wizard, mobile-friendly |
| Voice recording | **Browser MediaRecorder API** | Native, no third party |
| Printable export | **CSS print styles → PDF** | Via browser print dialog, zero dependencies |
| Config storage v1 | **URL hash (JSON)** | Zero backend, instant shareable link |
| Config storage v2 | **Supabase** | Persistent links, draft saving, accounts (deferred) |
| Bundler | **Vite** | Fast dev server, clean Phaser integration |
| Deployment | **Vercel** | Auto-deploys from GitHub main branch |

---

## 13. Architecture Overview

```
┌──────────────────────────────────────┐
│         Builder UI (React)            │
│  - Step-by-step wizard (mobile-first) │
│  - Voice recorder (MediaRecorder)     │
│  - Element + mini-game config forms   │
│  - localStorage draft persistence     │
│  - Publish → Home JSON                │
│  - Printable PDF generator            │
└─────────────────┬────────────────────┘
                  │ Home JSON
                  ▼
┌──────────────────────────────────────┐
│         Config Layer                  │
│  URL hash (v1) → Supabase (v2)       │
└─────────────────┬────────────────────┘
                  │ JSON
                  ▼
┌──────────────────────────────────────┐
│         Game (Phaser 3)               │
│  BootScene → preloads all assets      │
│  IntroScene → voice/text message      │
│  WorldScene → tilemap, elements,      │
│    movement, mini-games, unlocks      │
│  UIScene → dialog box, indicators     │
└──────────────────────────────────────┘
                  ↑
         Physical printable
         (QR code → game URL)
```

---

## 14. Project Structure

```
unfold-pixel-game/
├── public/
│   └── assets/
│       ├── tilemaps/
│       │   ├── home.tmx          ← Tiled working file (for collaborators)
│       │   └── home.tmj          ← Phaser export (tilesets embedded)
│       ├── tilesets/
│       │   ├── *.png             ← only PNGs referenced by the map
│       │   └── *.tsj             ← Tiled tileset files (relative paths)
│       └── characters/
│           └── player.png        ← LimeZu premade character spritesheet
├── src/
│   ├── scenes/
│   │   ├── BootScene.js
│   │   ├── IntroScene.js
│   │   ├── WorldScene.js
│   │   └── UIScene.js
│   ├── entities/
│   │   ├── Player.js
│   │   └── NPC.js
│   ├── lib/
│   │   └── supabase.js           ← wired but unused until v2
│   └── main.js
├── index.html
├── vite.config.js
└── package.json
```

---

## 15. Tilemap Layer Setup

Tiled map layers in render order (bottom → top):

| Layer | Tiled Type | Phaser Depth | Purpose |
|---|---|---|---|
| `Floor` | Tile | 0 | Base floor tiles only |
| `Floor_Decor` | Tile | 1 | Rugs, mats, floor shadows |
| `Walls` | Tile | 2 | Wall bases, side walls, lower wall face |
| `Decor` | Tile | 3 | Low furniture, floor-level objects |
| `Decor_Mid` | Tile | 4 | Mid-height furniture |
| `Decor_High` | Tile | 5 | Tall freestanding items |
| *(Player sprite)* | — | 8 | Inserted by Phaser at runtime — currently above `Walls_Above`; revisit for behind-wall occlusion |
| `Walls_Above` | Tile | 7 | Top wall edge + tall furniture tops along top wall |
| `Collision` | Tile | — | Invisible — logic only |
| `Entities` | Object | — | Player spawn point, element anchors |

**Collision tile property:** `collides: true` — set per tile in Tiled tileset editor, read by Phaser via `setCollisionByProperty({ collides: true })`.

---

## 16. Character Spritesheet

**Source:** LimeZu Modern Interiors — Premade Character 32×32  
**File:** `public/assets/characters/player.png`  
**Sheet dimensions:** 1792 × 1312 px  
**Frame size:** 32 × 64 px — each character is **2 tile-rows tall**  
**Phaser slice:** `frameWidth: 32, frameHeight: 64` → **56 columns × 20 rows = 1120 frames**

> ⚠️ **Common mistake:** Loading with `frameHeight: 32` slices the sheet into 41 tile-rows instead of 20 character-rows. This makes the idle row (LimeZu row 1) fall at cols 0–3 only, leaving frame 74 (and all idle-down frames) transparent and invisible. Always use `frameHeight: 64`.

### Layout (official LimeZu row numbering, confirmed June 2026)

| LimeZu row | Phaser frames | Cols used | Content |
|---|---|---|---|
| 0 | 0–55 | 0–3 | 4 reference poses (one per direction) |
| 1 | 56–111 | 0–23 | Idle — 6 frames × 4 directions |
| 2 | 112–167 | 0–23 | Walk — 6 frames × 4 directions |

### Direction order (all rows)

Right = index 0 · Up = index 1 · Left = index 2 · **Down = index 3**  
Frame = `rowStart + dirIndex × 6 + frameWithinCycle`

### Frame index reference

| Animation | Frames | Formula |
|---|---|---|
| `idle-right` | 56–61 | row 1 + dir 0 |
| `idle-up` | 62–67 | row 1 + dir 1 |
| `idle-left` | 68–73 | row 1 + dir 2 |
| **`idle-down`** | **74–79** | row 1 + dir 3 — first frame = **74** |
| `walk-right` | 112–117 | row 2 + dir 0 |
| `walk-up` | 118–123 | row 2 + dir 1 |
| `walk-left` | 124–129 | row 2 + dir 2 |
| **`walk-down`** | **130–135** | row 2 + dir 3 |

### Physics body (32×64 sprite, origin 0.5 0.5)

Body is a slim foot-area box placed at the character's feet:  
`setSize(16, 8).setOffset(8, 52)` — 8px wide on each side, bottom 12px of the sprite.

---

## 17. Interaction Design

### Movement — All Platforms (Primary)
- Click or tap any walkable tile → character pathfinds and walks there via EasyStar.js A*
- Subtle ripple graphic fades at the destination on click/tap
- Click/tap an Element directly → character walks to adjacent tile + auto-triggers interaction
- New click/tap mid-walk cancels current path and reroutes

### Keyboard — Desktop Only (Secondary)
- WASD or arrow keys for direct tile-by-tile movement
- E / Space to interact with nearest Element when in range

### Proximity & Interact
- Elements show a bobbing sparkle indicator when player is within 1.5 tiles
- Tap Element (mobile) or press E/Space (keyboard) to trigger
- Dialog/mini-game UI slides up from bottom
- Dismiss by tapping outside or pressing Escape

### Mobile Layout
```
┌──────────────────────────┐
│                          │
│      Game World          │
│  (tap to move,           │
│   tap element to         │
│   interact)              │
│                          │
└──────────────────────────┘
```
Full-screen canvas on all platforms — no fixed UI chrome.

---

## 18. Visual Style

- **Name:** Unfold
- **Tile size:** 32×32px
- **Palette:** Warm, muted — wood floors, cream walls, soft amber lighting
- **Character:** LimeZu Modern Interiors premade character (front-facing, 32×32)
- **UI:** Rounded dialog boxes, handwritten-style font for notes/letters, clean sans for NPC speech
- **Printable:** Same pixel art aesthetic and warm palette as the game

**Asset sources:**
- Tileset + interior + characters: LimeZu [Modern Interiors](https://limezu.itch.io/moderninteriors) — paid pack, 32×32 versions
  - Active tilesets: `1_Generic_32x32`, `12_Kitchen_32x32`, `Generic_Home_1_Layer_1_32x32`, `Room_Builder_32x32`
- (ALT) Tileset: Penzilla [Top Down Retro Interior](https://penzilla.itch.io/top-down-retro-interior) (16×16)
- (ALT) Characters: shubibubi [Cozy People](https://shubibubi.itch.io/cozy-people) (32×32)
- (ALT) Food props: Ghostpixxells [Pixel Food](https://ghostpixxells.itch.io/pixelfood) (32×32)

---

## 19. Map Editing (Collaborator Guide)

- Working file: `public/assets/tilemaps/home.tmx` — open with [Tiled Map Editor](https://mapeditor.org)
- All tilesets in `public/assets/tilesets/` use **relative paths** — clone the repo and open from within the project folder
- After editing: **File → Export As → JSON (.tmj)** → overwrite `public/assets/tilemaps/home.tmj`
- Tilesets must remain **embedded** in the `.tmj` (not external) — Phaser cannot read external `.tsj` references

---

## 20. Milestones

| Milestone | Status | Deliverable |
|---|---|---|
| **M1 — Engine Proof** | 🟡 In progress | Phaser boots, tilemap renders, named player moves with collision |
| **M2 — Interaction System** | ⬜ | Element proximity detection + dialog box |
| **M3 — Element Types** | ⬜ | NPC, Object, Sign from hardcoded JSON |
| **M4 — Mini-Games** | ⬜ | Trivia + Hidden Object, unlock system wired |
| **M5 — Config-driven** | ⬜ | Game reads full Home JSON, all elements spawn correctly |
| **M6 — Intro Scene** | ⬜ | Voice playback + text fallback on title screen |
| **M7 — Builder UI** | ⬜ | Step-by-step form → valid Home JSON → preview |
| **M8 — Share Link** | ⬜ | Publish → URL hash → Recipient opens and plays |
| **M9 — Printable** | ⬜ | PDF card with QR code + pixel art from Builder |
| **M10 — Polish** | ⬜ | Closing scene, ambient sound, loading screen, fonts, mobile QA |
| **M-Avatar — Character Customization** | ⬜ | Recipients visit a wardrobe entity to personalize their avatar; CharacterScene overlay with live animated preview, Body/Eyes/Hair/Outfit category tabs, left/right cycling, color swatches, localStorage persistence |

---

*This document is the source of truth for v1. Anything not listed here is out of scope unless noted in open-items.md.*
