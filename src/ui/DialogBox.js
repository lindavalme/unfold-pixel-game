const PAD        = 16;
const BOX_HEIGHT = 96;
const BORDER     = 3;
const DEPTH      = 200;

const TYPE_STYLE = {
  sign:   { border: 0xf7c948, label: '[ Sign ]',   action: null },
  npc:    { border: 0x44ccff, label: null,          action: null },
  object: { border: 0xff9944, label: '[ Object ]',  action: '[ E ] / Tap to interact' },
};
const DEFAULT_STYLE = { border: 0xffffff, label: null, action: null };

export default class DialogBox {
  constructor(scene) {
    this.scene   = scene;
    this.visible = false;

    const { width, height } = scene.scale;
    this._w = width;
    this._h = height;

    this._bg = scene.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH).setAlpha(0);

    // Portrait placeholder (NPC only)
    this._portrait = scene.add.graphics()
      .setScrollFactor(0).setDepth(DEPTH + 1).setAlpha(0);

    this._nameText = scene.add.text(0, 0, '', {
      fontFamily: 'Silkscreen', fontSize: '12px',
      color: '#ffffff', resolution: 2,
    }).setScrollFactor(0).setDepth(DEPTH + 1).setAlpha(0);

    this._bodyText = scene.add.text(0, 0, '', {
      fontFamily: 'Silkscreen', fontSize: '11px',
      color: '#ffffff', wordWrap: { width: width - (PAD + BORDER + 8) * 2 },
      lineSpacing: 6, resolution: 2,
    }).setScrollFactor(0).setDepth(DEPTH + 1).setAlpha(0);

    this._actionText = scene.add.text(0, 0, '', {
      fontFamily: 'Silkscreen', fontSize: '10px',
      color: '#aaaaaa', resolution: 2,
    }).setScrollFactor(0).setDepth(DEPTH + 1).setAlpha(0);
  }

  show(entity) {
    if (this.visible) this.hide(false);

    const style  = TYPE_STYLE[entity.type] ?? DEFAULT_STYLE;
    const w      = this._w;
    const h      = this._h;
    const bx     = PAD;
    const by     = h - BOX_HEIGHT - PAD;
    const bw     = w - PAD * 2;
    const isNPC  = entity.type === 'npc';
    const portraitSize = 48;
    const textOffsetX  = isNPC ? PAD + BORDER + 8 + portraitSize + 8 : PAD + BORDER + 8;
    const hexColor     = '#' + style.border.toString(16).padStart(6, '0');

    // Background
    const bg = this._bg;
    bg.clear();
    bg.fillStyle(0x000000, 0.4);
    bg.fillRect(bx + 4, by + 4, bw, BOX_HEIGHT);
    bg.fillStyle(0x1a1a2e, 0.92);
    bg.fillRect(bx, by, bw, BOX_HEIGHT);
    bg.lineStyle(BORDER, style.border, 1);
    bg.strokeRect(bx, by, bw, BOX_HEIGHT);

    // NPC portrait placeholder
    const portrait = this._portrait;
    portrait.clear();
    if (isNPC) {
      portrait.lineStyle(2, style.border, 0.8);
      portrait.fillStyle(0x2a2a3e, 1);
      portrait.fillRect(bx + BORDER + 8, by + (BOX_HEIGHT - portraitSize) / 2, portraitSize, portraitSize);
      portrait.strokeRect(bx + BORDER + 8, by + (BOX_HEIGHT - portraitSize) / 2, portraitSize, portraitSize);
      // Placeholder person silhouette
      portrait.fillStyle(style.border, 0.4);
      portrait.fillCircle(bx + BORDER + 8 + portraitSize / 2, by + (BOX_HEIGHT - portraitSize) / 2 + 14, 8);
      portrait.fillRect(bx + BORDER + 8 + portraitSize / 2 - 8, by + (BOX_HEIGHT - portraitSize) / 2 + 24, 16, 18);
    }

    // Name
    const nameLabel = isNPC ? entity.name : (style.label ?? entity.name);
    this._nameText
      .setText(nameLabel)
      .setPosition(textOffsetX, by - 14)
      .setColor(hexColor);

    // Body
    const message = entity.dialog ?? entity.message ?? '...';
    this._bodyText
      .setText(message)
      .setPosition(textOffsetX, by + PAD)
      .setWordWrapWidth(w - textOffsetX - PAD - BORDER);

    // Action prompt
    const actionLabel = style.action ?? '';
    this._actionText
      .setText(actionLabel)
      .setPosition(bx + BORDER + 8, by + BOX_HEIGHT - 16);

    const targets = [bg, this._nameText, this._bodyText, this._actionText, portrait];
    this.scene.tweens.add({ targets, alpha: 1, duration: 120, ease: 'Linear' });
    this.visible = true;
  }

  hide(animate = true) {
    if (!this.visible) return;
    const targets = [this._bg, this._nameText, this._bodyText, this._actionText, this._portrait];
    if (animate) {
      this.scene.tweens.add({ targets, alpha: 0, duration: 100, ease: 'Linear' });
    } else {
      targets.forEach(t => t.setAlpha(0));
    }
    this.visible = false;
  }
}
