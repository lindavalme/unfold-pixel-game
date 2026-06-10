const DEPTH = 500;

export default class OnboardingOverlay {
  constructor(scene) {
    const { width, height } = scene.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Dim background
    this._bg = scene.add.rectangle(0, 0, width, height, 0x000000, 0.55)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH).setInteractive();

    // Joystick base
    const BASE_R  = 44;
    const THUMB_R = 20;
    const jy = cy - 20;

    this._joystickGfx = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    this._drawBase(this._joystickGfx, cx, jy, BASE_R);

    // Thumb — animated
    this._thumb = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 2);
    this._thumbX = cx;
    this._thumbY = jy;
    this._thumbR = THUMB_R;
    this._drawThumb(this._thumb, cx, jy, THUMB_R);

    // Label
    this._label = scene.add.text(cx, jy + BASE_R + 24, 'drag to move', {
      fontFamily: '"Press Start 2P"', fontSize: '15px',
      color: '#f7c948', resolution: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 1);

    // Tap to dismiss hint
    this._hint = scene.add.text(cx, height - 48, 'tap anywhere to continue', {
      fontFamily: 'Silkscreen', fontSize: '15px',
      color: '#aaaacc', resolution: 2,
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(DEPTH + 1).setAlpha(0);

    // Animate thumb in a circular path
    this._angle = 0;
    this._cx = cx;
    this._cy = jy;
    this._baseR = BASE_R;
    this._animTimer = scene.time.addEvent({
      delay: 16, loop: true, callback: () => this._animateThumb(scene),
    });

    // Fade in hint after 1s
    scene.time.delayedCall(1000, () => {
      scene.tweens.add({ targets: this._hint, alpha: 1, duration: 400 });
      // Pulse hint
      scene.time.delayedCall(400, () => {
        scene.tweens.add({
          targets: this._hint, alpha: 0.4, duration: 700,
          ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
        });
      });
    });

    // Dismiss on tap
    this._bg.once('pointerdown', () => this._dismiss(scene));
    scene.input.keyboard.once('keydown-SPACE', () => this._dismiss(scene));
    scene.input.keyboard.once('keydown-ENTER', () => this._dismiss(scene));
  }

  _animateThumb(scene) {
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
    this._animTimer.remove();
    const targets = [this._bg, this._joystickGfx, this._thumb, this._label, this._hint];
    scene.tweens.killTweensOf(this._hint);
    scene.tweens.add({
      targets, alpha: 0, duration: 250, ease: 'Linear',
      onComplete: () => targets.forEach(t => t.destroy()),
    });
  }
}
