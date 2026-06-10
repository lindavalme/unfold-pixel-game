const PAD        = 16;
const BOX_HEIGHT = 96;
const BORDER     = 3;
const DEPTH      = 200;

export default class DialogBox {
  constructor(scene) {
    this.scene   = scene;
    this.visible = false;

    const { width, height } = scene.scale;

    // Background panel
    this._bg = scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setAlpha(0);

    // Speaker name (small, accent colour)
    this._nameText = scene.add.text(
      PAD + BORDER + 8,
      height - BOX_HEIGHT - 14,
      '',
      { fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#f7c948', resolution: 2 }
    ).setScrollFactor(0).setDepth(DEPTH + 1).setAlpha(0);

    // Body message
    this._bodyText = scene.add.text(
      PAD + BORDER + 8,
      height - BOX_HEIGHT + PAD,
      '',
      {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        color: '#ffffff',
        wordWrap: { width: width - (PAD + BORDER + 8) * 2 },
        lineSpacing: 8,
        resolution: 2,
      }
    ).setScrollFactor(0).setDepth(DEPTH + 1).setAlpha(0);

    this._width  = width;
    this._height = height;
  }

  show(entity) {
    if (this.visible) this.hide(false);

    const { _bg: bg, _nameText: name, _bodyText: body } = this;
    const w = this._width;
    const h = this._height;
    const bx = PAD;
    const by = h - BOX_HEIGHT - PAD;
    const bw = w - PAD * 2;

    bg.clear();
    // Drop shadow
    bg.fillStyle(0x000000, 0.4);
    bg.fillRect(bx + 4, by + 4, bw, BOX_HEIGHT);
    // Box fill
    bg.fillStyle(0x1a1a2e, 0.92);
    bg.fillRect(bx, by, bw, BOX_HEIGHT);
    // Border
    bg.lineStyle(BORDER, 0xf7c948, 1);
    bg.strokeRect(bx, by, bw, BOX_HEIGHT);

    const message = entity.properties?.message
      ?? entity.properties?.dialog
      ?? '...';

    name.setText(entity.name).setPosition(bx + BORDER + 8, by - 14);
    body.setText(message).setPosition(bx + BORDER + 8, by + PAD);

    this.scene.tweens.add({ targets: [bg, name, body], alpha: 1, duration: 120, ease: 'Linear' });
    this.visible = true;
  }

  hide(animate = true) {
    if (!this.visible) return;
    const targets = [this._bg, this._nameText, this._bodyText];
    if (animate) {
      this.scene.tweens.add({ targets, alpha: 0, duration: 100, ease: 'Linear' });
    } else {
      targets.forEach(t => t.setAlpha(0));
    }
    this.visible = false;
  }
}
