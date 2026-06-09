import Phaser from 'phaser';

const TILESET_NAMES = [
  'Generic_Home_1_Layer_1_32x32',
  'Room_Builder_32x32',
  '1_Generic_32x32',
  '12_Kitchen_32x32',
];

// These tilesets have tile-level property data in their .tsj files (e.g. collides: true).
// We load the .tsj as JSON and inject into Tileset.tileData before createLayer so that
// setCollisionByProperty can read tile.properties correctly.
const TILESETS_WITH_PROPS = new Set([
  'Generic_Home_1_Layer_1_32x32',
  'Room_Builder_32x32',
]);

const VISUAL_LAYERS = [
  { name: 'Floor',       depth: 0 },
  { name: 'Floor_Decor', depth: 1 },
  { name: 'Walls',       depth: 2 },
  { name: 'Decor',       depth: 3 },
  { name: 'Decor_Mid',   depth: 4 },
  { name: 'Decor_High',  depth: 5 },
  { name: 'Walls_Above', depth: 7 },
];

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldScene' });
  }

  preload() {
    this.load.tilemapTiledJSON('map', 'assets/tilemaps/home.tmj');

    for (const name of TILESET_NAMES) {
      this.load.image(name, `assets/tilesets/${name}.png`);
      if (TILESETS_WITH_PROPS.has(name)) {
        this.load.json(`tsj_${name}`, `assets/tilesets/${name}.tsj`);
      }
    }

    this.load.spritesheet('player', 'assets/characters/player.png', {
      frameWidth: 32,
      frameHeight: 64, // each character is 2 tile-rows tall (32×64px)
    });
  }

  create() {
    const map = this.make.tilemap({ key: 'map' });

    console.log('[WorldScene] Tileset names found in map data:', map.tilesets.map(ts => ts.name));

    const genericHomeSrc = this.textures.get('Generic_Home_1_Layer_1_32x32').getSourceImage();
    console.log(
      `[WorldScene] Generic_Home_1_Layer_1_32x32.png: ${genericHomeSrc.width}x${genericHomeSrc.height}px` +
      ` — width % 32 = ${genericHomeSrc.width % 32}, height % 32 = ${genericHomeSrc.height % 32}` +
      ` (${Math.floor(genericHomeSrc.height / 32)} complete rows)`
    );

    // Add tilesets and inject external tile property data before any layer is created.
    // Phaser populates tile.properties from Tileset.tileData at createLayer time, so
    // injection must happen here — not after — for setCollisionByProperty to work.
    // Explicit tileWidth/tileHeight/margin/spacing=0 are passed so parameters are
    // not left implicit, matching the values declared in each .tsj file.
    const tilesets = [];
    for (const name of TILESET_NAMES) {
      const ts = map.addTilesetImage(name, name, 32, 32, 0, 0);
      if (!ts) {
        console.warn(`[WorldScene] Tileset mismatch — addTilesetImage returned null for: "${name}"`);
        continue;
      }
      tilesets.push(ts);

      if (TILESETS_WITH_PROPS.has(name)) {
        const tsjData = this.cache.json.get(`tsj_${name}`);
        if (tsjData && Array.isArray(tsjData.tiles)) {
          for (const tile of tsjData.tiles) {
            if (tile.properties) {
              if (!ts.tileData[tile.id]) ts.tileData[tile.id] = {};
              ts.tileData[tile.id].properties = tile.properties;
            }
          }
        } else {
          console.warn(`[WorldScene] Could not load tile property data for tileset: "${name}"`);
        }
      }
    }

    // Visual layers
    for (const { name, depth } of VISUAL_LAYERS) {
      const layer = map.createLayer(name, tilesets, 0, 0);
      if (layer) {
        layer.setDepth(depth);
      } else {
        console.warn(`[WorldScene] Layer not found in map: "${name}"`);
      }
    }

    // Collision layer — invisible, tile property collision enabled
    const collisionLayer = map.createLayer('Collision', tilesets, 0, 0);
    if (collisionLayer) {
      collisionLayer.setVisible(false);
      collisionLayer.setCollisionByProperty({ collides: true });
    } else {
      console.warn('[WorldScene] Collision layer not found in map');
    }

    // Player at tile (10, 7) — world origin is the tile's top-left corner; add half a tile
    // to place the sprite's centre-anchor at the tile centre.
    const playerX = 10 * map.tileWidth + map.tileWidth / 2;
    const playerY = 7 * map.tileHeight + map.tileHeight / 2;

    // LimeZu sheet: 1792×1312px, frameWidth=32, frameHeight=64 → 56 cols × 20 rows.
    // Each character sprite is 32×64px (spans 2 tile-rows in 32px grid).
    // With frameHeight=64, Phaser slices into 56×20=1120 frames and the
    // official LimeZu row numbering maps directly:
    //
    //   Row 0 (frames   0– 55): 4 reference poses — cols 0–3  (right, up, left, down)
    //   Row 1 (frames  56–111): idle  — 6 frames × 4 directions, cols 0–23
    //   Row 2 (frames 112–167): walk  — 6 frames × 4 directions, cols 0–23
    //
    // Direction index within each row: right=0, up=1, left=2, down=3
    // Frame = rowStart + dirIndex*6 + frameWithinCycle (0–5)

    const FRAME_RANGES = {
      'idle-right': [56, 57, 58, 59, 60, 61],
      'idle-up':    [62, 63, 64, 65, 66, 67],
      'idle-left':  [68, 69, 70, 71, 72, 73],
      'idle-down':  [74, 75, 76, 77, 78, 79],  // row 1, cols 18–23
      'walk-right': [112, 113, 114, 115, 116, 117],
      'walk-up':    [118, 119, 120, 121, 122, 123],
      'walk-left':  [124, 125, 126, 127, 128, 129],
      'walk-down':  [130, 131, 132, 133, 134, 135], // row 2, cols 18–23
    };

    // --- Spritesheet diagnostic ---
    const playerTex = this.textures.get('player');
    const playerSrc = playerTex.getSourceImage();
    console.log(`[WorldScene] Player spritesheet: ${playerSrc.width}x${playerSrc.height}px → ${playerSrc.width/32} cols × ${playerSrc.height/64} rows (frameHeight=64)`);
    console.log(`[WorldScene] Texture frame count: ${playerTex.frameTotal}  (expected: 1120)`);
    console.log(`[WorldScene] Frame 74 exists: ${playerTex.has('74') || playerTex.has(74)}`);
    for (const [key, frames] of Object.entries(FRAME_RANGES)) {
      console.log(`  ${key}: frames ${frames[0]}–${frames[frames.length - 1]}`);
    }

    for (const [key, frames] of Object.entries(FRAME_RANGES)) {
      this.anims.create({
        key,
        frames: frames.map(f => ({ key: 'player', frame: f })),
        frameRate: key.startsWith('walk') ? 8 : 4,
        repeat: -1,
      });
    }

    const IDLE_DOWN_START = 74; // row 1, col 18 — first frame of idle-down (LimeZu confirmed)
    console.log(`[WorldScene] Setting idle frame to idle-down: ${IDLE_DOWN_START}`);

    this.player = this.physics.add.sprite(playerX, playerY, 'player', IDLE_DOWN_START);
    this.player.setOrigin(0.5, 0.5);
    this.player.setDepth(8);
    this.player.setScale(1);
    // Sprite is 32×64px. With origin(0.5,0.5), feet sit at +32px below centre.
    // Physics body is a slim foot-area box: 16×8px, offset so it sits at the feet.
    // offsetX = (32-16)/2 = 8;  offsetY = (64-8)/2 = 28 (centre of 64 + 24 = bottom quarter)
    this.player.body.setSize(16, 8).setOffset(8, 52);
    this.player.body.setCollideWorldBounds(true);
    this.player.play('idle-down');

    this.cursors = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.UP,
      down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
      left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w:     Phaser.Input.Keyboard.KeyCodes.W,
      s:     Phaser.Input.Keyboard.KeyCodes.S,
      a:     Phaser.Input.Keyboard.KeyCodes.A,
      d:     Phaser.Input.Keyboard.KeyCodes.D,
    });

    // --- Player diagnostic ---
    console.log('[WorldScene] ── Player diagnostics ──────────────────────');
    console.log(`  world position : (${this.player.x}, ${this.player.y})`);
    console.log(`  origin         : (${this.player.originX}, ${this.player.originY})`);
    console.log(`  depth          : ${this.player.depth}  (Decor_High=5, Walls_Above=7, player=8)`);
    console.log(`  visible        : ${this.player.visible},  alpha: ${this.player.alpha}`);
    console.log(`  active frame   : ${this.player.frame.name}  (expected: 74)`);
    console.log(`  displaySize    : ${this.player.displayWidth}x${this.player.displayHeight}px  (expected: 32x64)`);
    const _ptex = this.textures.get('player');
    console.log(`  frame in tex   : has('74')=${_ptex.has('74')}, has(74)=${_ptex.has(74)}, frameTotal=${_ptex.frameTotal}`);
    console.log('[WorldScene] ── Camera diagnostics ─────────────────────');
    console.log(`  scroll         : (${this.cameras.main.scrollX.toFixed(1)}, ${this.cameras.main.scrollY.toFixed(1)})`);
    console.log(`  midPoint       : (${this.cameras.main.midPoint.x.toFixed(1)}, ${this.cameras.main.midPoint.y.toFixed(1)})`);
    console.log(`  followTarget   : player at (${this.player.x}, ${this.player.y})`);
    console.log('[WorldScene] ────────────────────────────────────────────');

    // Inset the top bound by the body's Y offset so the sprite's visual top (which
    // sits offsetY pixels above the body) can never extend above y=0 when clamped.
    // Sprite is 32×64, origin (0.5, 0.5): sprite top = player.y - 32.
    // Body offset Y = 52 → body top = player.y - 32 + 52 = player.y + 20.
    // Inset the world top bound so the sprite head never clips above y=0:
    // minimum player.y = 32 (so sprite top = 0), giving world inset = 32.
    this.physics.world.setBounds(
      0, 32,
      map.widthInPixels, map.heightInPixels - 32
    );

    if (collisionLayer) {
      this.physics.add.collider(this.player, collisionLayer);
    }

    // Camera follows player, bounded to map; roundPixels keeps pixel art crisp
    this.cameras.main
      .setBounds(0, 0, map.widthInPixels, map.heightInPixels)
      .startFollow(this.player, true, 1, 1);
  }

  update() {
    const { up, down, left, right, w, s, a, d } = this.cursors;
    const SPEED = 120;

    const goUp    = up.isDown    || w.isDown;
    const goDown  = down.isDown  || s.isDown;
    const goLeft  = left.isDown  || a.isDown;
    const goRight = right.isDown || d.isDown;

    let vx = 0;
    let vy = 0;
    if (goLeft)  vx -= SPEED;
    if (goRight) vx += SPEED;
    if (goUp)    vy -= SPEED;
    if (goDown)  vy += SPEED;

    // Normalize diagonal so speed stays constant in all directions
    if (vx !== 0 && vy !== 0) {
      vx /= Math.SQRT2;
      vy /= Math.SQRT2;
    }

    this.player.body.setVelocity(vx, vy);

    const moving = vx !== 0 || vy !== 0;
    let dir = this._lastDir || 'down';

    if (goLeft)       dir = 'left';
    else if (goRight) dir = 'right';
    else if (goUp)    dir = 'up';
    else if (goDown)  dir = 'down';

    const animKey = `${moving ? 'walk' : 'idle'}-${dir}`;
    if (this.player.anims.currentAnim?.key !== animKey) {
      this.player.play(animKey);
    }

    this._lastDir = dir;
  }
}
