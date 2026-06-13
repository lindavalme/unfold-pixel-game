const DEPTH = 500;

export default class OnboardingOverlay {
  constructor(scene) {
    const { width, height } = scene.scale;
    const cx = width / 2;
    const cy = height / 2;
    const isTouch = scene.sys.game.device.input.touch;

    // Dim background
    this._bg = scene.add.rectangle(0, 0, width, height, 0x000000, 0.55)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH).setInteractive();

    this._extras = [];
    this._animTimer = null;

    if (isTouch) {
      this._buildJoystick(scene, cx, cy);
    } else {
      this._buildArrowKeys(scene, cx, cy);
    }

    const dismissLabel = isTouch
      ? 'tap anywhere to continue'
      : 'click or press any key';
    this._hint = scene.add.text(cx, height - 48, dismissLabel, {
      fontFamily: 'Silkscreen', fontSize: '15px',
      color: '#aaaacc', resolution: 2,
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(DEPTH + 1).setAlpha(0);

    // Fade in hint after 1s
    scene.time.delayedCall(1000, () => {
      scene.tweens.add({ targets: this._hint, alpha: 1, duration: 400 });
      scene.time.delayedCall(400, () => {
        scene.tweens.add({
          targets: this._hint, alpha: 0.4, duration: 700,
          ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
        });
      });
    });

    this._bg.once('pointerdown', () => this._dismiss(scene));
    if (isTouch) {
      scene.input.keyboard.once('keydown-SPACE', () => this._dismiss(scene));
      scene.input.keyboard.once('keydown-ENTER', () => this._dismiss(scene));
    } else {
      scene.input.keyboard.once('keydown', () => this._dismiss(scene));
    }
  }

  _buildJoystick(scene, cx, cy) {
    const BASE_R  = 44;
    const THUMB_R = 20;
    const jy = cy - 20;

    this._joystickGfx = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    this._drawBase(this._joystickGfx, cx, jy, BASE_R);

    this._thumb = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 2);
    this._drawThumb(this._thumb, cx, jy, THUMB_R);

    this._label = scene.add.text(cx, jy + BASE_R + 24, 'drag to move', {
      fontFamily: '"Press Start 2P"', fontSize: '15px',
      color: '#f7c948', resolution: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 1);

    this._extras.push(this._joystickGfx, this._thumb, this._label);

    this._angle = 0;
    this._cx = cx;
    this._cy = jy;
    this._baseR = BASE_R;
    this._thumbR = THUMB_R;
    this._animTimer = scene.time.addEvent({
      delay: 16, loop: true, callback: () => this._animateThumb(),
    });
  }

  _buildArrowKeys(scene, cx, cy) {
    const KEY_W = 38;
    const KEY_H = 38;
    const GAP   = 6;
    const iy = cy - 20;

    const gfx = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    this._extras.push(gfx);

    // Positions: up, left, down, right
    const keys = [
      { label: '▲', dx: 0,           dy: -(KEY_H + GAP) },
      { label: '◀', dx: -(KEY_W + GAP), dy: 0 },
      { label: '▼', dx: 0,           dy: 0 },
      { label: '▶', dx: (KEY_W + GAP),  dy: 0 },
    ];

    for (const k of keys) {
      const kx = cx + k.dx;
      const ky = iy + k.dy;

      gfx.fillStyle(0xffffff, 0.12);
      gfx.fillRoundedRect(kx - KEY_W / 2, ky - KEY_H / 2, KEY_W, KEY_H, 6);
      gfx.lineStyle(2, 0xffffff, 0.45);
      gfx.strokeRoundedRect(kx - KEY_W / 2, ky - KEY_H / 2, KEY_W, KEY_H, 6);

      const t = scene.add.text(kx, ky, k.label, {
        fontFamily: '"Press Start 2P"', fontSize: '14px',
        color: '#ffffff', resolution: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
      this._extras.push(t);
    }

    // Animate each arrow key in sequence — pulse up, left, down, right
    this._arrowPulseTimer = scene.time.addEvent({
      delay: 400, loop: true,
      callback: () => this._pulseNextArrow(scene, cx, iy, KEY_W, KEY_H, GAP),
    });
    this._pulseIndex = 0;
    this._arrowGfx = gfx;
    this._arrowKeys = keys.map((k, i) => ({ ...k, index: i }));
    this._arrowCx = cx;
    this._arrowIy = iy;
    this._KEY_W = KEY_W;
    this._KEY_H = KEY_H;
    this._KEY_GAP = GAP;

    const label = scene.add.text(cx, iy + KEY_H + GAP + 20, 'arrow keys to move', {
      fontFamily: '"Press Start 2P"', fontSize: '13px',
      color: '#f7c948', resolution: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 1);
    this._extras.push(label);
    this._animTimer = this._arrowPulseTimer;
  }

  _pulseNextArrow(scene, cx, iy, KEY_W, KEY_H, GAP) {
    const order = [0, 1, 2, 3]; // up, left, down, right
    const idx = order[this._pulseIndex % 4];
    this._pulseIndex++;

    const k = this._arrowKeys[idx];
    const kx = cx + k.dx;
    const ky = iy + k.dy;

    // Flash the key background bright then fade
    const flash = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    flash.fillStyle(0xf7c948, 0.35);
    flash.fillRoundedRect(kx - KEY_W / 2, ky - KEY_H / 2, KEY_W, KEY_H, 6);
    scene.tweens.add({
      targets: flash, alpha: 0, duration: 350, ease: 'Linear',
      onComplete: () => flash.destroy(),
    });
  }

  _animateThumb() {
    this._angle += 0.04;
    const r  = this._baseR * 0.55;
    const tx = this._cx + Math.cos(this._angle) * r;
    const ty = this._cy + Math.sin(this._angle) * r;
    this._drawThumb(this._thumb, tx, ty, this._thumbR);
  }

  _drawBase(gfx, cx, cy, r) {
    gfx.clear();
    gfx.fillStyle(0xffffff, 0.15);
    gfx.fillCircle(cx, cy, r);
    gfx.lineStyle(2, 0xffffff, 0.5);
    gfx.strokeCircle(cx, cy, r);
  }

  _drawThumb(gfx, cx, cy, r) {
    gfx.clear();
    gfx.fillStyle(0xffffff, 0.6);
    gfx.fillCircle(cx, cy, r);
  }

  _dismiss(scene) {
    if (this._animTimer) this._animTimer.remove();
    const targets = [this._bg, this._hint, ...this._extras];
    scene.tweens.killTweensOf(this._hint);
    scene.tweens.add({
      targets, alpha: 0, duration: 250, ease: 'Linear',
      onComplete: () => targets.forEach(t => t.destroy()),
    });
  }
}
