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
      frameHeight: 32,
    });
  }

  create() {
    const map = this.make.tilemap({ key: 'map' });

    console.log('[WorldScene] Tileset names found in map data:', map.tilesets.map(ts => ts.name));

    // Log Generic_Home dimensions — its height (428px) is not a multiple of 32 (428 % 32 = 12
    // trailing px of padding after 13 complete rows). Phaser rounds correctly to 13 rows so the
    // warning is harmless, but we record the exact dimensions here for auditing.
    const genericHomeSrc = this.textures.get('Generic_Home_1_Layer_1_32x32').getSourceImage();
    console.log(
      `[WorldScene] Generic_Home_1_Layer_1_32x32.png: ${genericHomeSrc.width}x${genericHomeSrc.height}px` +
      ` — width % 32 = ${genericHomeSrc.width % 32}, height % 32 = ${genericHomeSrc.height % 32}` +
      ` (${Math.floor(genericHomeSrc.height / 32)} complete rows, ${genericHomeSrc.height % 32}px trailing gap)`
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

    const player = this.physics.add.sprite(playerX, playerY, 'player');
    player.setDepth(6);
    player.setScale(1);
    player.body.setCollideWorldBounds(true);

    console.log(
      `[WorldScene] Player — world (${player.x}, ${player.y}),` +
      ` frame ${player.frame.name},` +
      ` displaySize ${player.displayWidth}x${player.displayHeight}px,` +
      ` depth ${player.depth}`
    );

    // Physics world bounds match map pixel dimensions
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // Camera follows player, bounded to map; roundPixels keeps pixel art crisp
    this.cameras.main
      .setBounds(0, 0, map.widthInPixels, map.heightInPixels)
      .startFollow(player, true, 1, 1);
  }
}
