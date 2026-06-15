import Phaser from 'phaser';
import manifest from '../data/avatar-manifest.json';
import {
  getAvatarLayers,
  preloadAvatar,
  buildAvatarDisplay,
  validateAvatarConfig,
  defaultAvatarConfig,
} from '../systems/AvatarCompositor.js';

// ── Layout constants ───────────────────────────────────────────────────────────
const PREVIEW_X     = 320;
const PREVIEW_Y     = 238;  // feet position (origin is bottom-center)
const PREVIEW_SCALE = 3;
const PREVIEW_FRAME = 74;   // idle-down start

const TABS       = ['body', 'eyes', 'hair', 'outfit'];
const TAB_LABELS = { body: 'BODY', eyes: 'EYES', hair: 'HAIR', outfit: 'OUTFIT' };

const IDLE_FRAMES = { 'idle-down': [74, 75, 76, 77, 78, 79] };

const ITEMS_PER_PAGE = 8;
const GRID_COLS      = 4;
const CELL_W         = 130;
const CELL_H         = 60;
const CELL_GAP_X     = 10;
const CELL_GAP_Y     = 10;
// 4 cols × 130 + 3 × 10 = 550 → left edge = (640-550)/2 = 45
const GRID_LEFT      = 45;
const GRID_TOP       = 284;
// Col x-centers: 45 + 65 = 110, +140 = 250, +140 = 390, +140 = 530
const COL_CX         = [110, 250, 390, 530];
// Row y-centers: 284 + 30 = 314, + 60 + 10 + 30 = 414... recalc to fit y=284-414
// Available height 284–414 = 130px → 2 rows × 60 + 1 gap × 10 = 130 ✓
const ROW_CY         = [314, 384];

const DOT_Y       = 258;
const DOT_RADIUS  = 10;
const DOT_SPACING = 26;

const TAB_BAR_Y = 422;
const TAB_W     = 160;
const TAB_H     = 58;
const TAB_CX    = [80, 240, 400, 560];

const MINI_SCALE = 1.0; // scale for grid cell avatars

export default class CharacterScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharacterScene' });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  init(data) {
    this._draft          = { ...(data.avatarConfig ?? defaultAvatarConfig()) };
    this._activeTab      = 'body';
    this._currentPage    = 0;
    this._previewSprites = [];
    this._dotZones       = [];
    this._dotGfx         = null;
    this._gridObjects    = [];
    this._pageNavObjects = [];
    this._tabGfx         = null;
    this._tabTextObjs    = {};
    this._loadPending    = false;
    this._gridLoadPending = false;
  }

  preload() {
    preloadAvatar(this, this._draft);
  }

  create() {
    this._buildBackground();
    this._buildHeader();
    this._buildDotLayer();
    this._buildTabBar();

    this._refreshPreview();
    this._refreshUI();

    this.input.keyboard.on('keydown-ESC', () => this._cancel());
  }

  // ── Background ────────────────────────────────────────────────────────────────

  _buildBackground() {
    this.add.rectangle(320, 240, 640, 480, 0x08081a, 0.97).setDepth(0);

    // Separator lines
    const g = this.add.graphics().setDepth(1);
    g.lineStyle(1, 0x1e1e48, 1);
    g.lineBetween(0, 244, 640, 244);  // below avatar
    g.lineBetween(0, 276, 640, 276);  // below dots
    g.lineBetween(0, TAB_BAR_Y, 640, TAB_BAR_Y); // above tab bar
  }

  // ── Header ────────────────────────────────────────────────────────────────────

  _buildHeader() {
    this.add.rectangle(320, 22, 640, 44, 0x0d0d1a, 1).setDepth(1);

    const xBtn = this.add.text(24, 22, '✕', {
      fontFamily: 'Silkscreen', fontSize: '14px',
      color: '#555577', resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(4).setInteractive()
      .on('pointerover',  function () { this.setColor('#aaaacc'); })
      .on('pointerout',   function () { this.setColor('#555577'); })
      .on('pointerdown',  () => this._cancel());

    this.add.text(320, 22, 'YOUR LOOK', {
      fontFamily: 'Silkscreen', fontSize: '13px',
      color: '#f7c948', resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(4);

    this.add.text(616, 22, 'SAVE', {
      fontFamily: 'Silkscreen', fontSize: '13px',
      color: '#88ee88', resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(4).setInteractive()
      .on('pointerover',  function () { this.setColor('#bbffbb'); })
      .on('pointerout',   function () { this.setColor('#88ee88'); })
      .on('pointerdown',  () => this._confirm());
  }

  // ── Color dot layer ───────────────────────────────────────────────────────────

  _buildDotLayer() {
    this._dotGfx = this.add.graphics().setDepth(3);
    this._refreshColorDots();
  }

  _refreshColorDots() {
    // Destroy old interactive zones
    for (const z of this._dotZones) z.destroy();
    this._dotZones = [];
    this._dotGfx.clear();

    const { colorKey, colorCount, colorVal } = this._getColorInfo();

    // Hide dot row when there's no color choice
    if (!colorKey || colorCount <= 1) return;

    const totalW  = (colorCount - 1) * DOT_SPACING;
    const startX  = 320 - totalW / 2;

    for (let i = 1; i <= colorCount; i++) {
      const cx     = startX + (i - 1) * DOT_SPACING;
      const padded = String(i).padStart(2, '0');
      const active = padded === colorVal;

      this._dotGfx.fillStyle(active ? 0xf7c948 : 0x2a2a52, 1);
      this._dotGfx.fillCircle(cx, DOT_Y, DOT_RADIUS);
      this._dotGfx.lineStyle(active ? 2 : 1, active ? 0xffffff : 0x333370, 1);
      this._dotGfx.strokeCircle(cx, DOT_Y, DOT_RADIUS);

      const zone = this.add.zone(cx, DOT_Y, DOT_RADIUS * 2 + 6, DOT_RADIUS * 2 + 6)
        .setOrigin(0.5, 0.5).setDepth(5).setInteractive()
        .on('pointerdown', () => this._setColor(colorKey, padded));

      this._dotZones.push(zone);
    }
  }

  // ── Option grid ───────────────────────────────────────────────────────────────

  _destroyGrid() {
    for (const obj of this._gridObjects) obj.destroy();
    this._gridObjects = [];
    for (const obj of this._pageNavObjects) obj.destroy();
    this._pageNavObjects = [];
  }

  _rebuildGrid() {
    this._destroyGrid();

    const total     = this._getTotalOptions();
    const pageStart = this._currentPage * ITEMS_PER_PAGE;
    const pageEnd   = Math.min(pageStart + ITEMS_PER_PAGE, total);

    // Gather textures needed for this page and load any missing ones
    const needed = [];
    for (let i = pageStart; i < pageEnd; i++) {
      const optVal = this._getOptionVal(i);
      const draft  = { ...this._draft, [this._activeTab]: optVal };
      const layers = getAvatarLayers(draft);
      for (const { key, path } of layers) {
        if (!this.textures.exists(key)) needed.push({ key, path });
      }
    }

    if (needed.length > 0 && !this._gridLoadPending) {
      this._gridLoadPending = true;
      for (const { key, path } of needed) {
        this.load.spritesheet(key, path, { frameWidth: 32, frameHeight: 64 });
      }
      this.load.once('complete', () => {
        this._gridLoadPending = false;
        this._rebuildGrid();
      });
      this.load.start();
      return;
    }

    if (this._gridLoadPending) return;

    // Draw cells
    for (let i = pageStart; i < pageEnd; i++) {
      const slotIdx = i - pageStart;
      const col     = slotIdx % GRID_COLS;
      const row     = Math.floor(slotIdx / GRID_COLS);
      const cx      = COL_CX[col];
      const cy      = ROW_CY[row];

      const optVal  = this._getOptionVal(i);
      const active  = optVal === this._getDraftVal();

      // Cell background
      const bg = this.add.graphics().setDepth(2);
      bg.fillStyle(active ? 0x1a1a3e : 0x10102a, 1);
      bg.fillRect(cx - CELL_W / 2, cy - CELL_H / 2, CELL_W, CELL_H);
      bg.lineStyle(active ? 2 : 1, active ? 0xf7c948 : 0x222244, 1);
      bg.strokeRect(cx - CELL_W / 2, cy - CELL_H / 2, CELL_W, CELL_H);
      this._gridObjects.push(bg);

      // Mini avatar or bald placeholder
      if (this._activeTab === 'hair' && optVal === '00') {
        const t = this.add.text(cx, cy, 'BALD', {
          fontFamily: 'Silkscreen', fontSize: '11px',
          color: active ? '#f7c948' : '#666688', resolution: 2,
        }).setOrigin(0.5, 0.5).setDepth(3);
        this._gridObjects.push(t);
      } else {
        const cellConfig = { ...this._draft, [this._activeTab]: optVal };
        const layers     = getAvatarLayers(cellConfig);
        const allLoaded  = layers.every(({ key }) => this.textures.exists(key));

        if (allLoaded) {
          this._renderCellStack(cx, cy, cellConfig, layers);
        }
      }

      // Tap zone
      const zone = this.add.zone(cx, cy, CELL_W, CELL_H)
        .setOrigin(0.5, 0.5).setDepth(5).setInteractive()
        .on('pointerdown', () => {
          this._selectOption(optVal);
        });
      this._gridObjects.push(zone);
    }

    // Page navigation
    if (total > ITEMS_PER_PAGE) {
      this._buildPageNav(total);
    }
  }

  _renderCellStack(cx, cy, cellConfig, layers) {
    // Feet pinned at cy + CELL_H/2 - 2, scale=MINI_SCALE
    const feetY = cy + CELL_H / 2 - 2;

    layers.forEach(({ key }, i) => {
      const spr = this.add.sprite(cx, feetY, key, PREVIEW_FRAME)
        .setOrigin(0.5, 1)
        .setScale(MINI_SCALE)
        .setDepth(3 + i * 0.1);
      this._gridObjects.push(spr);
    });

    // Apply tints (same logic as AvatarCompositor)
    const sprs = this._gridObjects.slice(this._gridObjects.length - layers.length);
    const { body, body: _b, ...rest } = cellConfig;

    const BODY_TINT_MAP = { '10': 0x6B4C35 };
    const HAIR_TINT_MAP = { '07': 0x3A3A3A };

    const bodyTint = BODY_TINT_MAP[cellConfig.body];
    if (bodyTint) {
      sprs[0].setTint(bodyTint);
      if (sprs[1]) sprs[1].setTint(bodyTint);
    }
    if (cellConfig.hair !== '00' && sprs[2]) {
      const hairTint = HAIR_TINT_MAP[cellConfig.hair_color];
      if (hairTint) sprs[2].setTint(hairTint);
    }
  }

  _buildPageNav(total) {
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    const navY = 413;

    const counter = this.add.text(320, navY, `${this._currentPage + 1} / ${totalPages}`, {
      fontFamily: 'Silkscreen', fontSize: '11px',
      color: '#8888aa', resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(3);
    this._pageNavObjects.push(counter);

    if (this._currentPage > 0) {
      this._makeMiniBtn(280, navY, '◀', () => {
        this._currentPage--;
        this._rebuildGrid();
      });
    }

    if (this._currentPage < totalPages - 1) {
      this._makeMiniBtn(360, navY, '▶', () => {
        this._currentPage++;
        this._rebuildGrid();
      });
    }
  }

  _makeMiniBtn(cx, cy, label, onClick) {
    const W = 28; const H = 22;
    const gfx = this.add.graphics().setDepth(3);
    gfx.fillStyle(0x1a1a3e, 1);
    gfx.fillRect(cx - W / 2, cy - H / 2, W, H);
    gfx.lineStyle(1, 0x333366, 1);
    gfx.strokeRect(cx - W / 2, cy - H / 2, W, H);
    this._pageNavObjects.push(gfx);

    const txt = this.add.text(cx, cy, label, {
      fontFamily: 'Silkscreen', fontSize: '11px',
      color: '#aaaadd', resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(4);
    this._pageNavObjects.push(txt);

    const zone = this.add.zone(cx, cy, W + 8, H + 8)
      .setOrigin(0.5, 0.5).setDepth(5).setInteractive()
      .on('pointerdown', onClick);
    this._pageNavObjects.push(zone);
  }

  // ── Tab bar ───────────────────────────────────────────────────────────────────

  _buildTabBar() {
    this._tabGfx = this.add.graphics().setDepth(2);

    TABS.forEach((tab, i) => {
      const cx = TAB_CX[i];
      const cy = TAB_BAR_Y + TAB_H / 2;

      const txt = this.add.text(cx, cy, TAB_LABELS[tab], {
        fontFamily: 'Silkscreen', fontSize: '12px',
        color: '#6666aa', resolution: 2,
      }).setOrigin(0.5, 0.5).setDepth(4);

      this._tabTextObjs[tab] = txt;

      this.add.zone(cx, cy, TAB_W, TAB_H)
        .setOrigin(0.5, 0.5).setDepth(5).setInteractive()
        .on('pointerdown', () => this._setTab(tab));
    });

    this._drawTabBar();
  }

  _drawTabBar() {
    const g = this._tabGfx;
    g.clear();

    TABS.forEach((tab, i) => {
      const x      = TAB_CX[i] - TAB_W / 2;
      const active = tab === this._activeTab;

      g.fillStyle(active ? 0xf7c948 : 0x141428, 1);
      g.fillRect(x, TAB_BAR_Y, TAB_W, TAB_H);
      g.lineStyle(1, active ? 0xf7c948 : 0x222244, 1);
      g.strokeRect(x, TAB_BAR_Y, TAB_W, TAB_H);

      this._tabTextObjs[tab].setColor(active ? '#0d0d1a' : '#6666aa');
    });
  }

  _setTab(tab) {
    this._activeTab  = tab;
    this._currentPage = 0;
    this._snapPage();
    this._refreshUI();
  }

  // ── Option helpers ────────────────────────────────────────────────────────────

  _getTotalOptions() {
    const k = this._draft.kids ? 'kids' : 'adult';
    const m = manifest[k];
    switch (this._activeTab) {
      case 'body':   return m.body.count;
      case 'eyes':   return m.eyes.count;
      case 'hair':   return m.hair.count + 1; // +1 for bald
      case 'outfit': return m.outfit.count;
    }
  }

  _getSelectedIdx() {
    switch (this._activeTab) {
      case 'body':   return parseInt(this._draft.body,   10) - 1;
      case 'eyes':   return parseInt(this._draft.eyes,   10) - 1;
      case 'hair':   return this._draft.hair === '00' ? 0 : parseInt(this._draft.hair, 10);
      case 'outfit': return parseInt(this._draft.outfit, 10) - 1;
    }
  }

  _getDraftVal() {
    return this._draft[this._activeTab];
  }

  _getOptionVal(idx) {
    if (this._activeTab === 'hair') {
      // index 0 = bald, 1..count = styled
      return idx === 0 ? '00' : String(idx).padStart(2, '0');
    }
    return String(idx + 1).padStart(2, '0');
  }

  _selectOption(optionVal) {
    this._draft[this._activeTab] = optionVal;

    // Clamp colors when option changes
    const k = this._draft.kids ? 'kids' : 'adult';
    const m = manifest[k];

    if (this._activeTab === 'hair' && optionVal !== '00') {
      const max = m.hair.exceptions?.[optionVal] ?? m.hair.colors;
      if (parseInt(this._draft.hair_color, 10) > max) {
        this._draft.hair_color = String(max).padStart(2, '0');
      }
    }
    if (this._activeTab === 'outfit' && !this._draft.kids) {
      const max = m.outfit.colors[optionVal] ?? 1;
      if (parseInt(this._draft.outfit_color, 10) > max) {
        this._draft.outfit_color = '01';
      }
    }

    this._refreshPreview();
    this._refreshUI();
  }

  _snapPage() {
    this._currentPage = Math.floor(this._getSelectedIdx() / ITEMS_PER_PAGE);
  }

  _refreshUI() {
    this._drawTabBar();
    this._refreshColorDots();
    this._rebuildGrid();
  }

  // ── Color helpers ─────────────────────────────────────────────────────────────

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
    this._refreshColorDots();
    this._refreshPreview();
    this._rebuildGrid();
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
