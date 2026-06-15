import Phaser from 'phaser';
import manifest from '../data/avatar-manifest.json';
import {
  getAvatarLayers,
  preloadAvatar,
  buildAvatarDisplay,
  validateAvatarConfig,
  defaultAvatarConfig,
} from '../systems/AvatarCompositor.js';

const TABS        = ['body', 'eyes', 'hair', 'outfit'];
const TAB_LABELS  = { body: 'BODY', eyes: 'EYES', hair: 'HAIR', outfit: 'OUTFIT' };
const IDLE_FRAMES = { 'idle-down': [74, 75, 76, 77, 78, 79] };
const PREVIEW_FRAME = 74;
const ITEMS_PER_PAGE = 8;

const BODY_TINT_MAP = { '10': 0x6B4C35 };
const HAIR_TINT_MAP = { '07': 0x3A3A3A };

export default class CharacterScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharacterScene' });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  init(data) {
    this._draft           = { ...(data.avatarConfig ?? defaultAvatarConfig()) };
    this._activeTab       = 'body';
    this._currentPage     = 0;
    this._previewSprites  = [];
    this._dotZones        = [];
    this._dotGfx          = null;
    this._gridObjects     = [];
    this._pageNavObjects  = [];
    this._staticObjects   = [];
    this._tabGfx          = null;
    this._tabTextObjs     = {};
    this._loadPending     = false;
    this._gridLoadPending = false;
    this._layout          = null;
  }

  preload() {
    preloadAvatar(this, this._draft);
  }

  create() {
    this._layout = this._getLayout();
    this._buildAll();
    this.scale.on('resize', this._onResize, this);
    this.input.keyboard.on('keydown-ESC', () => this._cancel());
  }

  shutdown() {
    this.scale.off('resize', this._onResize, this);
  }

  // ── Responsive layout ─────────────────────────────────────────────────────────

  _getLayout() {
    const W = this.scale.width;
    const H = this.scale.height;

    const HEADER_H = 44;
    const TAB_H    = 58;
    const COLS     = 4;
    const ROWS     = 2;
    const GAP      = 6;
    const MARGIN   = 8;

    // Avatar preview: large scale on wide screens, smaller on narrow phones
    const previewScale = W >= 480 ? 3 : 2;
    const avatarH      = 64 * previewScale;
    // Feet at whichever is smaller: 46% of H, or just below the header + avatar
    const previewY = Math.min(Math.round(H * 0.46), HEADER_H + avatarH + 10);
    const previewX = Math.round(W / 2);

    // Separators and dots
    const sep1Y      = previewY + 6;
    const DOT_R      = 9;
    const dotsY      = sep1Y + 20;
    const DOT_SPACING = Math.min(26, Math.max(18, Math.floor((W - 32) / 12)));
    const sep2Y      = dotsY + DOT_R + 8;

    // Grid zone
    const tabBarY = H - TAB_H;
    const navY    = tabBarY - 18;
    const gridBot = navY - 4;
    const gridTop = sep2Y + 8;

    // Cell sizing: fill available width with 4 cols
    const cellW    = Math.max(60, Math.floor((W - 2 * MARGIN - (COLS - 1) * GAP) / COLS));
    const cellH    = Math.max(46, Math.floor((gridBot - gridTop - GAP) / ROWS));
    const miniScale = Math.min(1.0, Math.max(0.65, (cellH - 4) / 64));

    const colCX = Array.from({ length: COLS }, (_, i) =>
      MARGIN + Math.round(cellW / 2) + i * (cellW + GAP));
    const rowCY = [
      gridTop + Math.round(cellH / 2),
      gridTop + cellH + GAP + Math.round(cellH / 2),
    ];

    // Tab bar: 4 equal sections
    const tabW  = Math.floor(W / 4);
    const tabCX = Array.from({ length: 4 }, (_, i) => Math.round(tabW / 2) + i * tabW);

    return {
      W, H, HEADER_H, TAB_H, COLS, ROWS, GAP, MARGIN,
      previewX, previewY, previewScale,
      sep1Y, dotsY, DOT_R, DOT_SPACING, sep2Y,
      tabBarY, navY, gridTop, gridBot,
      cellW, cellH, miniScale, colCX, rowCY,
      tabW, tabCX,
    };
  }

  _onResize() {
    this._layout = this._getLayout();
    this._destroyAll();
    this._buildAll();
  }

  _destroyAll() {
    for (const o of this._staticObjects) o.destroy();
    this._staticObjects = [];

    if (this._dotGfx) { this._dotGfx.destroy(); this._dotGfx = null; }
    for (const z of this._dotZones) z.destroy();
    this._dotZones = [];

    this._destroyGrid();

    for (const spr of this._previewSprites) {
      this.tweens.killTweensOf(spr);
      spr.anims.stop();
      spr.destroy();
    }
    this._previewSprites = [];

    this._tabGfx     = null;
    this._tabTextObjs = {};
  }

  _buildAll() {
    this._buildBackground();
    this._buildHeader();
    this._buildDotLayer();
    this._buildTabBar();
    this._refreshPreview();
    this._refreshUI();
  }

  // ── Background ────────────────────────────────────────────────────────────────

  _buildBackground() {
    const { W, H, sep1Y, sep2Y, tabBarY } = this._layout;
    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x08081a, 0.97).setDepth(0);
    this._staticObjects.push(bg);

    const g = this.add.graphics().setDepth(1);
    g.lineStyle(1, 0x1e1e48, 1);
    g.lineBetween(0, sep1Y, W, sep1Y);
    g.lineBetween(0, sep2Y, W, sep2Y);
    g.lineBetween(0, tabBarY, W, tabBarY);
    this._staticObjects.push(g);
  }

  // ── Header ────────────────────────────────────────────────────────────────────

  _buildHeader() {
    const { W, HEADER_H } = this._layout;
    const headerBg = this.add.rectangle(W / 2, HEADER_H / 2, W, HEADER_H, 0x0d0d1a, 1).setDepth(1);
    this._staticObjects.push(headerBg);

    const xBtn = this.add.text(24, HEADER_H / 2, '✕', {
      fontFamily: 'Silkscreen', fontSize: '14px',
      color: '#555577', resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(4).setInteractive()
      .on('pointerover',  function () { this.setColor('#aaaacc'); })
      .on('pointerout',   function () { this.setColor('#555577'); })
      .on('pointerdown',  () => this._cancel());
    this._staticObjects.push(xBtn);

    const title = this.add.text(W / 2, HEADER_H / 2, 'YOUR LOOK', {
      fontFamily: 'Silkscreen', fontSize: '13px',
      color: '#f7c948', resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(4);
    this._staticObjects.push(title);

    const saveBtn = this.add.text(W - 24, HEADER_H / 2, 'SAVE', {
      fontFamily: 'Silkscreen', fontSize: '13px',
      color: '#88ee88', resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(4).setInteractive()
      .on('pointerover',  function () { this.setColor('#bbffbb'); })
      .on('pointerout',   function () { this.setColor('#88ee88'); })
      .on('pointerdown',  () => this._confirm());
    this._staticObjects.push(saveBtn);
  }

  // ── Color dot layer ───────────────────────────────────────────────────────────

  _buildDotLayer() {
    this._dotGfx = this.add.graphics().setDepth(3);
    this._refreshColorDots();
  }

  _refreshColorDots() {
    for (const z of this._dotZones) z.destroy();
    this._dotZones = [];
    this._dotGfx.clear();

    const { colorKey, colorCount, colorVal } = this._getColorInfo();
    if (!colorKey || colorCount <= 1) return;

    const { W, dotsY, DOT_R, DOT_SPACING } = this._layout;
    const totalW = (colorCount - 1) * DOT_SPACING;
    const startX = W / 2 - totalW / 2;

    for (let i = 1; i <= colorCount; i++) {
      const cx     = startX + (i - 1) * DOT_SPACING;
      const padded = String(i).padStart(2, '0');
      const active = padded === colorVal;

      this._dotGfx.fillStyle(active ? 0xf7c948 : 0x2a2a52, 1);
      this._dotGfx.fillCircle(cx, dotsY, DOT_R);
      this._dotGfx.lineStyle(active ? 2 : 1, active ? 0xffffff : 0x333370, 1);
      this._dotGfx.strokeCircle(cx, dotsY, DOT_R);

      const zone = this.add.zone(cx, dotsY, DOT_R * 2 + 8, DOT_R * 2 + 8)
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
    const { COLS, colCX, rowCY, cellW, cellH, miniScale } = this._layout;

    const total     = this._getTotalOptions();
    const pageStart = this._currentPage * ITEMS_PER_PAGE;
    const pageEnd   = Math.min(pageStart + ITEMS_PER_PAGE, total);

    // Batch-load any missing textures for this page
    const needed = [];
    for (let i = pageStart; i < pageEnd; i++) {
      const optVal = this._getOptionVal(i);
      const draft  = { ...this._draft, [this._activeTab]: optVal };
      for (const { key, path } of getAvatarLayers(draft)) {
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

    for (let i = pageStart; i < pageEnd; i++) {
      const slotIdx = i - pageStart;
      const col     = slotIdx % COLS;
      const row     = Math.floor(slotIdx / COLS);
      const cx      = colCX[col];
      const cy      = rowCY[row];
      const optVal  = this._getOptionVal(i);
      const active  = optVal === this._getDraftVal();

      const bg = this.add.graphics().setDepth(2);
      bg.fillStyle(active ? 0x1a1a3e : 0x10102a, 1);
      bg.fillRect(cx - cellW / 2, cy - cellH / 2, cellW, cellH);
      bg.lineStyle(active ? 2 : 1, active ? 0xf7c948 : 0x222244, 1);
      bg.strokeRect(cx - cellW / 2, cy - cellH / 2, cellW, cellH);
      this._gridObjects.push(bg);

      if (this._activeTab === 'hair' && optVal === '00') {
        const t = this.add.text(cx, cy, 'BALD', {
          fontFamily: 'Silkscreen', fontSize: '10px',
          color: active ? '#f7c948' : '#666688', resolution: 2,
        }).setOrigin(0.5, 0.5).setDepth(3);
        this._gridObjects.push(t);
      } else {
        const cellCfg = { ...this._draft, [this._activeTab]: optVal };
        const layers  = getAvatarLayers(cellCfg);
        if (layers.every(({ key }) => this.textures.exists(key))) {
          this._renderCellStack(cx, cy, cellCfg, layers, cellH, miniScale);
        }
      }

      const zone = this.add.zone(cx, cy, cellW, cellH)
        .setOrigin(0.5, 0.5).setDepth(5).setInteractive()
        .on('pointerdown', () => this._selectOption(optVal));
      this._gridObjects.push(zone);
    }

    if (total > ITEMS_PER_PAGE) this._buildPageNav(total);
  }

  _renderCellStack(cx, cy, cellConfig, layers, cellH, miniScale) {
    const feetY = cy + cellH / 2 - 2;
    layers.forEach(({ key }, i) => {
      const spr = this.add.sprite(cx, feetY, key, PREVIEW_FRAME)
        .setOrigin(0.5, 1).setScale(miniScale).setDepth(3 + i * 0.1);
      this._gridObjects.push(spr);
    });

    const sprs = this._gridObjects.slice(this._gridObjects.length - layers.length);
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
    const { W, navY } = this._layout;
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

    const counter = this.add.text(W / 2, navY, `${this._currentPage + 1} / ${totalPages}`, {
      fontFamily: 'Silkscreen', fontSize: '11px',
      color: '#8888aa', resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(3);
    this._pageNavObjects.push(counter);

    if (this._currentPage > 0)
      this._makeMiniBtn(W / 2 - 44, navY, '◀', () => { this._currentPage--; this._rebuildGrid(); });

    if (this._currentPage < totalPages - 1)
      this._makeMiniBtn(W / 2 + 44, navY, '▶', () => { this._currentPage++; this._rebuildGrid(); });
  }

  _makeMiniBtn(cx, cy, label, onClick) {
    const BW = 28; const BH = 22;
    const gfx = this.add.graphics().setDepth(3);
    gfx.fillStyle(0x1a1a3e, 1);
    gfx.fillRect(cx - BW / 2, cy - BH / 2, BW, BH);
    gfx.lineStyle(1, 0x333366, 1);
    gfx.strokeRect(cx - BW / 2, cy - BH / 2, BW, BH);
    this._pageNavObjects.push(gfx);

    const txt = this.add.text(cx, cy, label, {
      fontFamily: 'Silkscreen', fontSize: '11px',
      color: '#aaaadd', resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(4);
    this._pageNavObjects.push(txt);

    const zone = this.add.zone(cx, cy, BW + 8, BH + 8)
      .setOrigin(0.5, 0.5).setDepth(5).setInteractive()
      .on('pointerdown', onClick);
    this._pageNavObjects.push(zone);
  }

  // ── Tab bar ───────────────────────────────────────────────────────────────────

  _buildTabBar() {
    this._tabGfx = this.add.graphics().setDepth(2);
    this._staticObjects.push(this._tabGfx);

    const { tabCX, tabW, tabBarY, TAB_H } = this._layout;

    TABS.forEach((tab, i) => {
      const cx = tabCX[i];
      const cy = tabBarY + TAB_H / 2;

      const txt = this.add.text(cx, cy, TAB_LABELS[tab], {
        fontFamily: 'Silkscreen', fontSize: '12px',
        color: '#6666aa', resolution: 2,
      }).setOrigin(0.5, 0.5).setDepth(4);
      this._staticObjects.push(txt);
      this._tabTextObjs[tab] = txt;

      const zone = this.add.zone(cx, cy, tabW, TAB_H)
        .setOrigin(0.5, 0.5).setDepth(5).setInteractive()
        .on('pointerdown', () => this._setTab(tab));
      this._staticObjects.push(zone);
    });

    this._drawTabBar();
  }

  _drawTabBar() {
    const { W, tabCX, tabW, tabBarY, TAB_H } = this._layout;
    const g = this._tabGfx;
    g.clear();

    TABS.forEach((tab, i) => {
      const x      = tabCX[i] - tabW / 2;
      const active = tab === this._activeTab;
      g.fillStyle(active ? 0xf7c948 : 0x141428, 1);
      g.fillRect(x, tabBarY, tabW, TAB_H);
      g.lineStyle(1, active ? 0xf7c948 : 0x222244, 1);
      g.strokeRect(x, tabBarY, tabW, TAB_H);
      this._tabTextObjs[tab].setColor(active ? '#0d0d1a' : '#6666aa');
    });
  }

  _setTab(tab) {
    this._activeTab   = tab;
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
      case 'hair':   return m.hair.count + 1;
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

  _getDraftVal() { return this._draft[this._activeTab]; }

  _getOptionVal(idx) {
    if (this._activeTab === 'hair') return idx === 0 ? '00' : String(idx).padStart(2, '0');
    return String(idx + 1).padStart(2, '0');
  }

  _selectOption(optionVal) {
    this._draft[this._activeTab] = optionVal;

    const k = this._draft.kids ? 'kids' : 'adult';
    const m = manifest[k];

    if (this._activeTab === 'hair' && optionVal !== '00') {
      const max = m.hair.exceptions?.[optionVal] ?? m.hair.colors;
      if (parseInt(this._draft.hair_color, 10) > max)
        this._draft.hair_color = String(max).padStart(2, '0');
    }
    if (this._activeTab === 'outfit' && !this._draft.kids) {
      const max = m.outfit.colors[optionVal] ?? 1;
      if (parseInt(this._draft.outfit_color, 10) > max)
        this._draft.outfit_color = '01';
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
    if (missing.length > 0) { this._loadAndRefresh(layerDefs); return; }

    const { previewX, previewY, previewScale } = this._layout;
    this._previewSprites = buildAvatarDisplay(
      this, this._draft, previewX, previewY, PREVIEW_FRAME, previewScale, 10
    );

    const layerKeys = layerDefs.map(l => l.key);
    for (const texKey of layerKeys) {
      for (const [animKey, frames] of Object.entries(IDLE_FRAMES)) {
        const fullKey = `${animKey}__${texKey}`;
        if (!this.anims.exists(fullKey)) {
          this.anims.create({
            key: fullKey,
            frames: frames.map(f => ({ key: texKey, frame: f })),
            frameRate: 4, repeat: -1,
          });
        }
      }
    }
    this._previewSprites.forEach((spr, i) => spr.play(`idle-down__${layerKeys[i]}`));
  }

  _loadAndRefresh(layerDefs) {
    if (this._loadPending) return;
    this._loadPending = true;
    for (const { key, path } of layerDefs.filter(({ key }) => !this.textures.exists(key))) {
      this.load.spritesheet(key, path, { frameWidth: 32, frameHeight: 64 });
    }
    this.load.once('complete', () => { this._loadPending = false; this._refreshPreview(); });
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
