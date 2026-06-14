const DEPTH = 500;

export default class OnboardingOverlay {
  constructor(scene) {
    const { width, height } = scene.scale;
    const cx = width / 2;
    const cy = height / 2;
    const isTouch = scene.sys.game.device.input.touch;

    this._dismissed = false;

    this._bg = scene.add.rectangle(0, 0, width, height, 0x000000, 0.55)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH).setInteractive();

    this._extras = [];
    this._animTimer = null;
    this._dpadPulseTimer = null;

    if (isTouch) {
      this._buildMobile(scene, cx, cy);
    } else {
      this._buildDesktop(scene, cx, cy);
    }

    const dismissLabel = isTouch ? 'press any button or tap' : 'click or press any key';
    this._hint = scene.add.text(cx, height - 48, dismissLabel, {
      fontFamily: 'Silkscreen', fontSize: '15px',
      color: '#aaaacc', resolution: 2,
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(DEPTH + 1).setAlpha(0);

    scene.time.delayedCall(1000, () => {
      scene.tweens.add({ targets: this._hint, alpha: 1, duration: 400 });
      scene.time.delayedCall(400, () => {
        scene.tweens.add({
          targets: this._hint, alpha: 0.4, duration: 700,
          ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
        });
      });
    });

    const dismiss = () => this._dismiss(scene);
    this._bg.once('pointerdown', dismiss);

    if (isTouch) {
      ['keydown-SPACE', 'keydown-ENTER',
       'keydown-UP', 'keydown-DOWN', 'keydown-LEFT', 'keydown-RIGHT']
        .forEach(ev => scene.input.keyboard.once(ev, dismiss));
    } else {
      scene.input.keyboard.once('keydown', dismiss);
    }
  }

  // ── Mobile: D-pad (left) + drag joystick (right) ─────────────────────────
  _buildMobile(scene, cx, cy) {
    const PANEL  = Math.min(85, cx * 0.44); // adapt to narrow screens
    const BTN    = 28;
    const BASE_R = 30;
    const THUMB_R = 14;
    const iy = cy - 30;

    const dpadX = cx - PANEL;
    const joyX  = cx + PANEL;

    // Left panel — D-pad cross
    const dpadGfx = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    this._extras.push(dpadGfx);

    this._dpadArms = [
      { label: '▲', dx: 0,    dy: -BTN },
      { label: '◀', dx: -BTN, dy: 0    },
      { label: '▶', dx: BTN,  dy: 0    },
      { label: '▼', dx: 0,    dy: BTN  },
    ];

    for (const arm of this._dpadArms) {
      const ax = dpadX + arm.dx;
      const ay = iy    + arm.dy;
      dpadGfx.fillStyle(0x2e2e44, 0.9);
      dpadGfx.fillRoundedRect(ax - BTN / 2, ay - BTN / 2, BTN, BTN, 4);
      dpadGfx.lineStyle(1, 0xffffff, 0.3);
      dpadGfx.strokeRoundedRect(ax - BTN / 2, ay - BTN / 2, BTN, BTN, 4);
      const t = scene.add.text(ax, ay, arm.label, {
        fontFamily: '"Press Start 2P"', fontSize: '10px',
        color: '#5a5a78', resolution: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
      this._extras.push(t);
    }
    dpadGfx.fillStyle(0x252538, 0.8);
    dpadGfx.fillCircle(dpadX, iy, BTN * 0.38);

    this._extras.push(
      scene.add.text(dpadX, iy + BTN + 16, 'buttons', {
        fontFamily: 'Silkscreen', fontSize: '13px', color: '#aaaacc', resolution: 2,
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 1)
    );

    // Center — "or" divider
    this._extras.push(
      scene.add.text(cx, iy, 'or', {
        fontFamily: 'Silkscreen', fontSize: '13px', color: '#555577', resolution: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1)
    );

    // Right panel — drag joystick
    this._joystickGfx = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    this._drawBase(this._joystickGfx, joyX, iy, BASE_R);

    this._thumb = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 2);
    this._drawThumb(this._thumb, joyX, iy, THUMB_R);

    this._extras.push(
      this._joystickGfx,
      this._thumb,
      scene.add.text(joyX, iy + BASE_R + 16, 'drag screen', {
        fontFamily: 'Silkscreen', fontSize: '13px', color: '#aaaacc', resolution: 2,
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 1)
    );

    // Shared label
    this._extras.push(
      scene.add.text(cx, iy + Math.max(BTN, BASE_R) + 38, 'to move', {
        fontFamily: '"Press Start 2P"', fontSize: '13px',
        color: '#f7c948', resolution: 2,
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 1)
    );

    // Animations
    this._angle  = 0;
    this._joyX   = joyX;
    this._joyY   = iy;
    this._baseR  = BASE_R;
    this._thumbR = THUMB_R;
    this._dpadX  = dpadX;
    this._dpadIy = iy;
    this._dpadBTN = BTN;
    this._pulseIndex = 0;

    // Orbiting thumb
    this._animTimer = scene.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        this._angle += 0.04;
        const r = this._baseR * 0.55;
        this._drawThumb(
          this._thumb,
          this._joyX + Math.cos(this._angle) * r,
          this._joyY + Math.sin(this._angle) * r,
          this._thumbR
        );
      },
    });

    // D-pad arm cycle
    this._dpadPulseTimer = scene.time.addEvent({
      delay: 400, loop: true,
      callback: () => this._pulseDpadArm(scene),
    });
  }

  _pulseDpadArm(scene) {
    const order = [0, 1, 3, 2]; // up, left, down, right
    const arm   = this._dpadArms[order[this._pulseIndex % 4]];
    this._pulseIndex++;
    const BTN = this._dpadBTN;
    const ax  = this._dpadX + arm.dx;
    const ay  = this._dpadIy + arm.dy;
    const flash = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    flash.fillStyle(0xf7c948, 0.35);
    flash.fillRoundedRect(ax - BTN / 2, ay - BTN / 2, BTN, BTN, 4);
    scene.tweens.add({
      targets: flash, alpha: 0, duration: 350, ease: 'Linear',
      onComplete: () => flash.destroy(),
    });
  }

  // ── Desktop: WASD (left) + arrow keys (right) ────────────────────────────
  _buildDesktop(scene, cx, cy) {
    const KEY_W = 38;
    const KEY_H = 38;
    const GAP   = 6;
    const PANEL = Math.min(88, cx * 0.36);
    const iy = cy - 20;

    const wasdX  = cx - PANEL;
    const arrowX = cx + PANEL;

    const gfx = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    this._extras.push(gfx);

    this._wasdKeys = [
      { label: 'W', dx: 0,              dy: -(KEY_H + GAP) },
      { label: 'A', dx: -(KEY_W + GAP), dy: 0 },
      { label: 'S', dx: 0,              dy: 0 },
      { label: 'D', dx: (KEY_W + GAP),  dy: 0 },
    ];

    this._arrowKeys = [
      { label: '▲', dx: 0,              dy: -(KEY_H + GAP) },
      { label: '◀', dx: -(KEY_W + GAP), dy: 0 },
      { label: '▼', dx: 0,              dy: 0 },
      { label: '▶', dx: (KEY_W + GAP),  dy: 0 },
    ];

    for (const [keys, ox] of [[this._wasdKeys, wasdX], [this._arrowKeys, arrowX]]) {
      for (const k of keys) {
        const kx = ox + k.dx;
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
    }

    this._extras.push(
      scene.add.text(cx, iy, 'or', {
        fontFamily: 'Silkscreen', fontSize: '13px', color: '#555577', resolution: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1),

      scene.add.text(cx, iy + KEY_H + GAP + 20, 'to move', {
        fontFamily: '"Press Start 2P"', fontSize: '13px',
        color: '#f7c948', resolution: 2,
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 1)
    );

    this._wasdX     = wasdX;
    this._arrowX    = arrowX;
    this._desktopIy = iy;
    this._KEY_W     = KEY_W;
    this._KEY_H     = KEY_H;
    this._KEY_GAP   = GAP;
    this._pulseIndex = 0;

    this._animTimer = scene.time.addEvent({
      delay: 400, loop: true,
      callback: () => this._pulseNextDesktop(scene),
    });
  }

  _pulseNextDesktop(scene) {
    // Cycle through WASD then arrows, 4 keys each
    const useWasd = (Math.floor(this._pulseIndex / 4) % 2 === 0);
    const keys = useWasd ? this._wasdKeys  : this._arrowKeys;
    const ox   = useWasd ? this._wasdX     : this._arrowX;
    const k    = keys[this._pulseIndex % 4];
    this._pulseIndex++;

    const kx = ox + k.dx;
    const ky = this._desktopIy + k.dy;
    const flash = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    flash.fillStyle(0xf7c948, 0.35);
    flash.fillRoundedRect(kx - this._KEY_W / 2, ky - this._KEY_H / 2, this._KEY_W, this._KEY_H, 6);
    scene.tweens.add({
      targets: flash, alpha: 0, duration: 350, ease: 'Linear',
      onComplete: () => flash.destroy(),
    });
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
    if (this._dismissed) return;
    this._dismissed = true;
    if (this._animTimer)      this._animTimer.remove();
    if (this._dpadPulseTimer) this._dpadPulseTimer.remove();
    const targets = [this._bg, this._hint, ...this._extras];
    scene.tweens.killTweensOf(this._hint);
    scene.tweens.add({
      targets, alpha: 0, duration: 250, ease: 'Linear',
      onComplete: () => targets.forEach(t => t?.destroy()),
    });
  }
}
