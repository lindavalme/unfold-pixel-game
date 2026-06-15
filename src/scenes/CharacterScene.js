import Phaser from 'phaser';
import manifest from '../data/avatar-manifest.json';
import {
  getAvatarLayers,
  preloadAvatar,
  buildAvatarDisplay,
  validateAvatarConfig,
  defaultAvatarConfig,
} from '../systems/AvatarCompositor.js';

const PREVIEW_X     = 100;
const PREVIEW_Y     = 405; // feet position (origin is bottom-center for buildAvatarDisplay)
const PREVIEW_SCALE = 3;
const PREVIEW_FRAME = 74;  // idle-down start frame

const TABS       = ['body', 'eyes', 'hair', 'outfit'];
const TAB_LABELS = { body: 'BODY', eyes: 'EYES', hair: 'HAIR', outfit: 'OUTFIT' };

// Only idle-down needed for the static preview
const IDLE_FRAMES = {
  'idle-down': [74, 75, 76, 77, 78, 79],
};

const SWATCH_SIZE = 26;
const SWATCH_GAP  = 5;

// Tab geometry (right panel starts at x=200, 440px wide → 4 tabs × 110px each)
const TAB_W = 109;
const TAB_H = 34;
const TAB_Y = 56;
const TAB_X_START = 202;

export default class CharacterScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharacterScene' });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  init(data) {
    this._draft         = { ...(data.avatarConfig ?? defaultAvatarConfig()) };
    this._activeTab     = 'body';
    this._previewSprites = [];
    this._swatchObjects  = [];
    this._loadPending    = false;
  }

  preload() {
    // Current config is already cached by WorldScene — this is a no-op.
    // CharacterScene loads neighbour textures lazily in _loadAndRefresh.
    preloadAvatar(this, this._draft);
  }

  create() {
    this._buildBackground();
    this._buildPreviewFrame();
    this._buildTabs();
    this._buildOptionSelector();
    this._buildColorSection();
    this._buildDoneButton();
    this._buildCloseButton();

    this._refreshPreview();
    this._refreshUI();

    this.input.keyboard.on('keydown-ESC', () => this._cancel());
  }

  // ── Background & chrome ───────────────────────────────────────────────────────

  _buildBackground() {
    this.add.rectangle(320, 240, 640, 480, 0x08081a, 0.93).setDepth(0);
    this.add.rectangle(100, 240, 200, 480, 0x10103a, 0.6).setDepth(1);

    const div = this.add.graphics().setDepth(1);
    div.lineStyle(1, 0x2a2a5a, 1);
    div.lineBetween(200, 0, 200, 480);

    this.add.text(100, 26, 'PREVIEW', {
      fontFamily: 'Silkscreen', fontSize: '12px',
      color: '#6666aa', resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(2);

    this.add.text(420, 26, 'CUSTOMIZE YOUR LOOK', {
      fontFamily: 'Silkscreen', fontSize: '13px',
      color: '#f7c948', resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(2);
  }

  _buildPreviewFrame() {
    const gfx = this.add.graphics().setDepth(1);
    gfx.lineStyle(1, 0x2a2a5a, 0.8);
    gfx.strokeRect(18, 46, 164, 390);
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────────

  _buildTabs() {
    this._tabGfx = this.add.graphics().setDepth(2);

    TABS.forEach((tab, i) => {
      const tx = TAB_X_START + i * (TAB_W + 1);

      const text = this.add.text(tx + TAB_W / 2, TAB_Y + TAB_H / 2, TAB_LABELS[tab], {
        fontFamily: 'Silkscreen', fontSize: '12px',
        color: '#ffffff', resolution: 2,
      }).setOrigin(0.5, 0.5).setDepth(4);

      this.add.zone(tx + TAB_W / 2, TAB_Y + TAB_H / 2, TAB_W, TAB_H)
        .setOrigin(0.5, 0.5).setDepth(5).setInteractive()
        .on('pointerdown', () => this._setTab(tab));

      // Store text ref for colour updates
      if (!this._tabTextMap) this._tabTextMap = {};
      this._tabTextMap[tab] = { text, tx };
    });

    this._drawTabs();
  }

  _drawTabs() {
    const gfx = this._tabGfx;
    gfx.clear();

    TABS.forEach((tab, i) => {
      const tx = TAB_X_START + i * (TAB_W + 1);
      const isActive = tab === this._activeTab;

      gfx.fillStyle(isActive ? 0xf7c948 : 0x181838, 1);
      gfx.fillRect(tx, TAB_Y, TAB_W, TAB_H);
      gfx.lineStyle(1, isActive ? 0xf7c948 : 0x333366, 1);
      gfx.strokeRect(tx, TAB_Y, TAB_W, TAB_H);

      this._tabTextMap[tab].text.setColor(isActive ? '#08081a' : '#8888bb');
    });
  }

  _setTab(tab) {
    this._activeTab = tab;
    this._drawTabs();
    this._refreshUI();
  }

  // ── Option selector ───────────────────────────────────────────────────────────

  _buildOptionSelector() {
    const arrowY = 158;

    this._sectionLabel = this.add.text(420, 112, '', {
      fontFamily: 'Silkscreen', fontSize: '13px',
      color: '#ccccee', resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(2);

    this._counterText = this.add.text(420, arrowY, '', {
      fontFamily: 'Silkscreen', fontSize: '14px',
      color: '#ffffff', resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(2);

    this._makeArrowButton(228, arrowY, '◀', () => this._stepOption(-1));
    this._makeArrowButton(612, arrowY, '▶', () => this._stepOption(+1));

    // Separator below tabs
    const sep = this.add.graphics().setDepth(1);
    sep.lineStyle(1, 0x1e1e48, 1);
    sep.lineBetween(200, 96, 640, 96);
  }

  _makeArrowButton(cx, cy, label, onClick) {
    const W = 34; const H = 34;
    const gfx = this.add.graphics().setDepth(3);

    const draw = (hovered) => {
      gfx.clear();
      gfx.fillStyle(hovered ? 0x2a2a6a : 0x141432, 1);
      gfx.fillRect(cx - W / 2, cy - H / 2, W, H);
      gfx.lineStyle(1, hovered ? 0x8888cc : 0x333366, 1);
      gfx.strokeRect(cx - W / 2, cy - H / 2, W, H);
    };

    draw(false);

    this.add.text(cx, cy, label, {
      fontFamily: 'Silkscreen', fontSize: '13px',
      color: '#aaaadd', resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(4);

    this.add.zone(cx, cy, W, H).setOrigin(0.5, 0.5).setDepth(5).setInteractive()
      .on('pointerover', () => draw(true))
      .on('pointerout',  () => draw(false))
      .on('pointerdown', onClick);
  }

  // ── Color swatches ────────────────────────────────────────────────────────────

  _buildColorSection() {
    this._colorLabel = this.add.text(420, 200, 'COLOR', {
      fontFamily: 'Silkscreen', fontSize: '12px',
      color: '#7777aa', resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(2).setVisible(false);
  }

  _refreshColorSwatches() {
    for (const obj of this._swatchObjects) obj.destroy();
    this._swatchObjects = [];

    const { colorKey, colorCount, colorVal } = this._getColorInfo();

    if (!colorKey || colorCount <= 1) {
      this._colorLabel.setVisible(false);
      return;
    }

    this._colorLabel.setVisible(true);

    const swatchY  = 232;
    const totalW   = colorCount * (SWATCH_SIZE + SWATCH_GAP) - SWATCH_GAP;
    const startX   = Math.max(212, 420 - totalW / 2);

    for (let i = 1; i <= colorCount; i++) {
      const cx     = startX + (i - 1) * (SWATCH_SIZE + SWATCH_GAP) + SWATCH_SIZE / 2;
      const padded = String(i).padStart(2, '0');
      const active = padded === colorVal;

      const gfx = this.add.graphics().setDepth(3);
      gfx.fillStyle(active ? 0xf7c948 : 0x1e1e48, 1);
      gfx.fillRect(cx - SWATCH_SIZE / 2, swatchY - SWATCH_SIZE / 2, SWATCH_SIZE, SWATCH_SIZE);
      gfx.lineStyle(1, active ? 0xf7c948 : 0x3a3a6a, 1);
      gfx.strokeRect(cx - SWATCH_SIZE / 2, swatchY - SWATCH_SIZE / 2, SWATCH_SIZE, SWATCH_SIZE);

      const numText = this.add.text(cx, swatchY, String(i), {
        fontFamily: 'Silkscreen', fontSize: '10px',
        color: active ? '#08081a' : '#8888aa',
        resolution: 2,
      }).setOrigin(0.5, 0.5).setDepth(4);

      const zone = this.add.zone(cx, swatchY, SWATCH_SIZE, SWATCH_SIZE)
        .setOrigin(0.5, 0.5).setDepth(5).setInteractive()
        .on('pointerdown', () => this._setColor(colorKey, padded));

      this._swatchObjects.push(gfx, numText, zone);
    }
  }

  _getColorInfo() {
    const k = this._draft.kids ? 'kids' : 'adult';
    const m = manifest[k];

    if (this._activeTab === 'hair' && this._draft.hair !== '00') {
      const max = m.hair.exceptions?.[this._draft.hair] ?? m.hair.colors;
      return { colorKey: 'hair_color', colorCount: max, colorVal: this._draft.hair_color };
    }
    if (this._activeTab === 'outfit' && !this._draft.kids) {
      const max = m.outfit.colors[this._draft.outfit] ?? 1;
      return { colorKey: 'outfit_color', colorCount: max, colorVal: this._draft.outfit_color };
    }
    return {};
  }

  _setColor(colorKey, padded) {
    this._draft[colorKey] = padded;
    this._refreshColorSwatches();
    this._refreshPreview();
  }

  // ── Option stepping ───────────────────────────────────────────────────────────

  _stepOption(dir) {
    const k = this._draft.kids ? 'kids' : 'adult';
    const m = manifest[k];

    const wrap = (cur, max) => ((cur - 1 + dir + max) % max) + 1;

    switch (this._activeTab) {
      case 'body': {
        const next = wrap(parseInt(this._draft.body, 10), m.body.count);
        this._draft.body = String(next).padStart(2, '0');
        break;
      }
      case 'eyes': {
        const next = wrap(parseInt(this._draft.eyes, 10), m.eyes.count);
        this._draft.eyes = String(next).padStart(2, '0');
        break;
      }
      case 'hair': {
        // 0 = bald, 1..count = styled — total options = count + 1
        const cur   = this._draft.hair === '00' ? 0 : parseInt(this._draft.hair, 10);
        const total = m.hair.count + 1;
        const next  = (cur + dir + total) % total;
        this._draft.hair = next === 0 ? '00' : String(next).padStart(2, '0');
        // Clamp hair_color to new style's max
        if (this._draft.hair !== '00') {
          const newMax = m.hair.exceptions?.[this._draft.hair] ?? m.hair.colors;
          if (parseInt(this._draft.hair_color, 10) > newMax) {
            this._draft.hair_color = String(newMax).padStart(2, '0');
          }
        }
        break;
      }
      case 'outfit': {
        const next = wrap(parseInt(this._draft.outfit, 10), m.outfit.count);
        this._draft.outfit = String(next).padStart(2, '0');
        if (!this._draft.kids) {
          const newMax = m.outfit.colors[this._draft.outfit] ?? 1;
          if (parseInt(this._draft.outfit_color, 10) > newMax) {
            this._draft.outfit_color = '01';
          }
        }
        break;
      }
    }

    this._refreshUI();
    this._refreshPreview();
  }

  // ── UI text refresh ───────────────────────────────────────────────────────────

  _refreshUI() {
    const k = this._draft.kids ? 'kids' : 'adult';
    const m = manifest[k];

    let label = TAB_LABELS[this._activeTab];
    let counter = '';

    switch (this._activeTab) {
      case 'body':
        counter = `${parseInt(this._draft.body, 10)}  /  ${m.body.count}`;
        break;
      case 'eyes':
        counter = `${parseInt(this._draft.eyes, 10)}  /  ${m.eyes.count}`;
        break;
      case 'hair':
        counter = this._draft.hair === '00'
          ? `BALD  /  ${m.hair.count + 1}`
          : `${parseInt(this._draft.hair, 10)}  /  ${m.hair.count + 1}`;
        break;
      case 'outfit':
        counter = `${parseInt(this._draft.outfit, 10)}  /  ${m.outfit.count}`;
        break;
    }

    this._sectionLabel.setText(label);
    this._counterText.setText(counter);
    this._refreshColorSwatches();
  }

  // ── Avatar preview ────────────────────────────────────────────────────────────

  _refreshPreview() {
    for (const spr of this._previewSprites) {
      this.tweens.killTweensOf(spr);
      spr.anims.stop();
      spr.destroy();
    }
    this._previewSprites = [];

    const layerDefs = getAvatarLayers(this._draft);
    const missing   = layerDefs.filter(({ key }) => !this.textures.exists(key));

    if (missing.length > 0) {
      this._loadAndRefresh(layerDefs);
      return;
    }

    this._previewSprites = buildAvatarDisplay(
      this, this._draft, PREVIEW_X, PREVIEW_Y, PREVIEW_FRAME, PREVIEW_SCALE, 10
    );

    const layerKeys = layerDefs.map(l => l.key);
    for (const texKey of layerKeys) {
      for (const [animKey, frames] of Object.entries(IDLE_FRAMES)) {
        const fullKey = `${animKey}__${texKey}`;
        if (!this.anims.exists(fullKey)) {
          this.anims.create({
            key: fullKey,
            frames: frames.map(f => ({ key: texKey, frame: f })),
            frameRate: 4,
            repeat: -1,
          });
        }
      }
    }

    this._previewSprites.forEach((spr, i) => spr.play(`idle-down__${layerKeys[i]}`));
  }

  _loadAndRefresh(layerDefs) {
    if (this._loadPending) return;
    this._loadPending = true;

    const toLoad = layerDefs.filter(({ key }) => !this.textures.exists(key));
    for (const { key, path } of toLoad) {
      this.load.spritesheet(key, path, { frameWidth: 32, frameHeight: 64 });
    }
    this.load.once('complete', () => {
      this._loadPending = false;
      this._refreshPreview();
    });
    this.load.start();
  }

  // ── Done / Cancel buttons ─────────────────────────────────────────────────────

  _buildDoneButton() {
    const bx = 420; const by = 438;
    const bw = 180; const bh = 34;

    const gfx = this.add.graphics().setDepth(2);
    gfx.fillStyle(0x1a4a1a, 1);
    gfx.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
    gfx.lineStyle(2, 0x44bb44, 1);
    gfx.strokeRect(bx - bw / 2, by - bh / 2, bw, bh);

    this.add.text(bx, by, 'DONE', {
      fontFamily: 'Silkscreen', fontSize: '15px',
      color: '#88ee88', resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(3);

    this.add.zone(bx, by, bw, bh).setOrigin(0.5, 0.5).setDepth(5).setInteractive()
      .on('pointerdown', () => this._confirm());

    this.add.text(420, 463, 'ESC to cancel', {
      fontFamily: 'Silkscreen', fontSize: '10px',
      color: '#444466', resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(2);
  }

  _buildCloseButton() {
    this.add.text(624, 22, '✕', {
      fontFamily: 'Silkscreen', fontSize: '14px',
      color: '#555577', resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(4).setInteractive()
      .on('pointerover', function () { this.setColor('#aaaacc'); })
      .on('pointerout',  function () { this.setColor('#555577'); })
      .on('pointerdown', () => this._cancel());
  }

  // ── Confirm / Cancel ──────────────────────────────────────────────────────────

  _confirm() {
    localStorage.setItem('unfold_avatar_config', JSON.stringify(this._draft));
    const worldScene = this.scene.get('WorldScene');
    if (worldScene) worldScene.events.emit('avatarUpdated', this._draft);
    this.scene.stop();
    this.scene.resume('WorldScene');
  }

  _cancel() {
    this.scene.stop();
    this.scene.resume('WorldScene');
  }
}
