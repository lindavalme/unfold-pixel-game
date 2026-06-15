import manifest from '../data/avatar-manifest.json';

const BASE = 'assets/characters';

// Tinted body variants: body numbers beyond the kit's base count reuse a base
// sheet with a Phaser tint applied to the body and eyes sprites. Tinting works
// by multiplying RGB channels, so a light base sheet is required.
// The tint is also applied to the eyes layer since it contains skin pixels.
const BODY_TINT_MAP = {
  '10': { baseBody: '02', tint: 0x6B4C35 }, // rich brown / melanated
};

// Hair color tints: applied when the source sheet reads as the wrong hue.
// Color '07' ships as dark blue-gray — tint to neutral near-black instead.
const HAIR_TINT_MAP = {
  '07': 0x3A3A3A,
};

/**
 * Returns the texture keys and load paths for each avatar layer.
 */
export function getAvatarLayers(config) {
  const prefix = config.kids ? '_kids' : '';

  // Tinted variants reuse a base body sheet — resolve the actual sheet number
  const bodySheetNum = BODY_TINT_MAP[config.body]?.baseBody ?? config.body;
  const bodyKey   = `avatar_body${prefix}_${bodySheetNum}`;
  const eyesKey   = `avatar_eyes${prefix}_${config.eyes}`;
  const outfitKey = config.kids
    ? `avatar_outfit_kids_${config.outfit}`
    : `avatar_outfit_${config.outfit}_${config.outfit_color}`;

  const layers = [
    { key: bodyKey,   path: `${BASE}/bodies/${bodyKey}.png` },
    { key: eyesKey,   path: `${BASE}/eyes/${eyesKey}.png` },
  ];

  // hair '00' = bald — omit the hair layer entirely
  if (config.hair !== '00') {
    const hairKey = `avatar_hair${prefix}_${config.hair}_${config.hair_color}`;
    layers.push({ key: hairKey, path: `${BASE}/hair/${hairKey}.png` });
  }

  layers.push({ key: outfitKey, path: `${BASE}/outfits/${outfitKey}.png` });

  return layers;
}

/**
 * Preloads all avatar layer spritesheets in a Phaser scene's preload().
 */
export function preloadAvatar(scene, config) {
  const layers = getAvatarLayers(config);
  for (const { key, path } of layers) {
    if (!scene.textures.exists(key)) {
      scene.load.spritesheet(key, path, {
        frameWidth: 32,
        frameHeight: 64,
      });
    }
  }
}

// Overlay sheets are 1792px wide = 56 cols × 32px.
// The body sheet is 1854px wide = 57 cols (extra col holds prop sprites).
// Re-registering body frames to the 56-col overlay layout keeps all layers
// frame-aligned so idle/walk indices match across body and overlays.
const OVERLAY_COLS = 56;
const OVERLAY_ROWS = 20;
const FRAME_W = 32;
const FRAME_H = 64;

function normaliseBodyFrames(scene, bodyKey) {
  const tex = scene.textures.get(bodyKey);
  // tex.add() is a no-op if a frame already exists. Instead, get each
  // auto-registered frame and update its cut coordinates in-place so that
  // frame i maps to the same visual position as the 56-col overlay sheets.
  for (let i = 0; i < OVERLAY_COLS * OVERLAY_ROWS; i++) {
    const col = i % OVERLAY_COLS;
    const row = Math.floor(i / OVERLAY_COLS);
    if (tex.has(i)) {
      tex.get(i).setSize(FRAME_W, FRAME_H, col * FRAME_W, row * FRAME_H);
    }
  }
}

/**
 * Creates a layered avatar as stacked sprites (body → eyes → hair → outfit).
 * All layers share position and animations — no RenderTexture needed.
 *
 * Returns { sprite, layers } where:
 *   sprite — the body sprite with physics (use this as `this.player`)
 *   layers — all 4 sprites for animation sync and cleanup
 */
export function composeAvatar(scene, config, x, y, startFrame) {
  const layerDefs = getAvatarLayers(config);

  // Normalise body texture frame grid to match overlays before creating sprites
  normaliseBodyFrames(scene, layerDefs[0].key);

  const sprites = layerDefs.map(({ key }, i) => {
    const spr = scene.physics.add.sprite(x, y, key, startFrame);
    spr.setOrigin(0.5, 0.5);
    spr.setDepth(8 + i * 0.1); // body=8.0, eyes=8.1, hair=8.2, outfit=8.3
    spr.setScale(1);
    if (i > 0) {
      spr.body.setEnable(false);
    }
    return spr;
  });

  const [body] = sprites;
  body.body.setSize(16, 8).setOffset(8, 52);
  body.body.setCollideWorldBounds(true);

  // Apply skin tint to body (index 0) and eyes (index 1) for tinted body variants
  const tint = BODY_TINT_MAP[config.body]?.tint;
  if (tint) {
    sprites[0].setTint(tint);
    sprites[1].setTint(tint);
  }

  // Apply hair color correction tint — hair is at index 2 when present
  if (config.hair !== '00') {
    const hairTint = HAIR_TINT_MAP[config.hair_color];
    if (hairTint) sprites[2].setTint(hairTint);
  }

  return { sprite: body, layers: sprites };
}

/**
 * Creates display-only (non-physics) layered avatar sprites for UI/battle scenes.
 * Returns a flat sprites[] array with the body sprite at index 0.
 */
export function buildAvatarDisplay(scene, config, x, y, startFrame, scale = 2, baseDepth = 3) {
  const layerDefs = getAvatarLayers(config);
  normaliseBodyFrames(scene, layerDefs[0].key);

  const sprites = layerDefs.map(({ key }, i) =>
    scene.add.sprite(x, y, key, startFrame)
      .setOrigin(0.5, 1)
      .setScale(scale)
      .setDepth(baseDepth + i * 0.1)
  );

  const tint = BODY_TINT_MAP[config.body]?.tint;
  if (tint) { sprites[0].setTint(tint); sprites[1].setTint(tint); }

  if (config.hair !== '00') {
    const hairTint = HAIR_TINT_MAP[config.hair_color];
    if (hairTint) sprites[2].setTint(hairTint);
  }

  return sprites;
}

/**
 * Syncs overlay positions to match the body sprite. Call every update().
 */
export function syncAvatarLayers(avatar) {
  const { sprite, layers } = avatar;
  for (let i = 1; i < layers.length; i++) {
    // body.reset() moves both the physics body AND the sprite so Phaser's
    // arcade postUpdate pass doesn't clobber the position we just set.
    layers[i].body.reset(sprite.x, sprite.y);
    layers[i].setFlipX(sprite.flipX);
  }
}

/**
 * Plays an animation key on all avatar layers simultaneously.
 */
export function playAvatarAnim(avatar, animKey) {
  for (const spr of avatar.layers) {
    if (spr.anims.currentAnim?.key !== animKey) {
      spr.play(animKey);
    }
  }
}

/**
 * Returns the default avatar config.
 */
export function defaultAvatarConfig() {
  return {
    kids: false,
    body: '07',
    eyes: '01',
    hair: '26',
    hair_color: '07',
    outfit: '03',
    outfit_color: '01',
  };
}

/**
 * Validates an avatar config against the manifest, clamping out-of-range values.
 */
export function validateAvatarConfig(config) {
  const k = config.kids ? 'kids' : 'adult';
  const m = manifest[k];

  const clamp = (val, max) => {
    const n = parseInt(val, 10);
    return String(Math.min(Math.max(n, 1), max)).padStart(2, '0');
  };

  // '00' is the bald sentinel — skip clamping so it passes through unchanged
  const hair = config.hair === '00' ? '00' : clamp(config.hair, m.hair.count);
  const hairColorMax = hair === '00' ? 1 : (m.hair.exceptions?.[hair] ?? m.hair.colors);
  const outfit = clamp(config.outfit, m.outfit.count);
  const outfitColorMax = config.kids ? 1 : (m.outfit.colors[outfit] ?? 1);

  return {
    kids: !!config.kids,
    body: clamp(config.body, m.body.count),
    eyes: clamp(config.eyes, m.eyes.count),
    hair,
    hair_color: clamp(config.hair_color, hairColorMax),
    outfit,
    outfit_color: clamp(config.outfit_color, outfitColorMax),
  };
}
