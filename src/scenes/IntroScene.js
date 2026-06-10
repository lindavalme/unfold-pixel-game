import Phaser from 'phaser';
import HOME from '../data/home.json';

const WARM  = '#f7c948';
const WHITE = '#ffffff';
const DIM   = '#666688';
const PS2P  = '"Press Start 2P"';
const VT    = 'VT323';

export default class IntroScene extends Phaser.Scene {
  constructor() {
    super({ key: 'IntroScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.cameras.main.setBackgroundColor(0x0a0a1a);
    this._phase = 'title';

    this._buildStarfield(width, height);
    this._buildTitlePhase(cx, cy, width, height);
  }

  // ── Phase 1: Title screen ────────────────────────────────────────────────

  _buildStarfield(width, height) {
    const gfx = this.add.graphics().setDepth(0);
    this._stars = [];

    for (let i = 0; i < 80; i++) {
      const x    = Phaser.Math.Between(0, width);
      const y    = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(1, 2);
      const spd  = size === 1 ? 0.1 : 0.2;
      this._stars.push({ x, y, size, spd });
    }

    this._starGfx = gfx;
  }

  _buildTitlePhase(cx, cy, width, height) {
    // Home title — bounces in
    const titleText = this.add.text(cx, cy - 60, HOME.title.toUpperCase(), {
      fontFamily: PS2P, fontSize: '20px',
      color: WARM, resolution: 2,
      wordWrap: { width: width - 80 }, align: 'center',
    }).setOrigin(0.5).setScale(0.3).setAlpha(0).setDepth(2);

    this.tweens.add({
      targets: titleText,
      scale: 1, alpha: 1,
      duration: 500, delay: 200,
      ease: 'Back.easeOut',
    });

    // "for [recipient]" — fades in after title
    const forText = this.add.text(cx, cy + 10, `for ${HOME.recipient}`, {
      fontFamily: PS2P, fontSize: '9px',
      color: DIM, resolution: 2,
    }).setOrigin(0.5).setAlpha(0).setDepth(2);

    this.tweens.add({
      targets: forText,
      alpha: 1, duration: 400, delay: 800, ease: 'Linear',
    });

    // Blinking PRESS START
    this._pressStart = this.add.text(cx, height - 60, 'PRESS START', {
      fontFamily: PS2P, fontSize: '10px',
      color: WHITE, resolution: 2,
    }).setOrigin(0.5).setAlpha(0).setDepth(2);

    this.time.delayedCall(1200, () => {
      this._pressStart.setAlpha(1);
      this._startBlink();
    });

    // Input
    this.input.once('pointerdown', () => this._toLetterPhase(cx, cy, width, height));
    this.input.keyboard.once('keydown-SPACE', () => this._toLetterPhase(cx, cy, width, height));
    this.input.keyboard.once('keydown-ENTER', () => this._toLetterPhase(cx, cy, width, height));
  }

  _startBlink() {
    this._blinkTimer = this.time.addEvent({
      delay: 500, loop: true,
      callback: () => {
        if (this._pressStart) {
          this._pressStart.setAlpha(this._pressStart.alpha > 0 ? 0 : 1);
        }
      },
    });
  }

  // ── Phase 2: Letter screen ───────────────────────────────────────────────

  _toLetterPhase(cx, cy, width, height) {
    if (this._phase !== 'title') return;
    this._phase = 'letter';

    if (this._blinkTimer) this._blinkTimer.remove();

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this._clearScene();
      this._buildLetterPhase(cx, cy, width, height);
      this.cameras.main.fadeIn(400, 0, 0, 0);
    });
  }

  _clearScene() {
    this.children.list
      .filter(c => c !== this._starGfx)
      .forEach(c => c.destroy());
  }

  _buildLetterPhase(cx, cy, width, height) {
    // Envelope icon (simple pixel art drawn with graphics)
    const env = this.add.graphics().setDepth(2);
    const ex = cx - 16, ey = cy - 110;
    env.lineStyle(2, 0xf7c948, 1);
    env.fillStyle(0x1a1a2e, 1);
    env.fillRect(ex, ey, 32, 22);
    env.strokeRect(ex, ey, 32, 22);
    env.lineBetween(ex, ey, cx, ey + 11);
    env.lineBetween(ex + 32, ey, cx, ey + 11);
    env.setAlpha(0);
    this.tweens.add({ targets: env, alpha: 1, duration: 300, ease: 'Linear' });

    // Intro message
    const msg = this.add.text(cx, cy - 72, HOME.intro_text ?? '', {
      fontFamily: VT, fontSize: '22px',
      color: WHITE, resolution: 2,
      wordWrap: { width: width - 100 }, align: 'center', lineSpacing: 6,
    }).setOrigin(0.5, 0).setAlpha(0).setDepth(2);

    this.tweens.add({ targets: msg, alpha: 1, duration: 600, delay: 200, ease: 'Linear' });

    // "tap to enter" prompt
    const prompt = this.add.text(cx, height - 50, '▶  tap to enter', {
      fontFamily: PS2P, fontSize: '9px',
      color: WARM, resolution: 2,
    }).setOrigin(0.5).setAlpha(0).setDepth(2);

    this.time.delayedCall(900, () => {
      this.tweens.add({
        targets: prompt, alpha: 1, duration: 300, ease: 'Linear',
        onComplete: () => {
          this.tweens.add({
            targets: prompt, alpha: 0.3, duration: 700,
            ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
          });
        },
      });
    });

    this.time.delayedCall(800, () => {
      this.input.once('pointerdown', () => this._startGame());
      this.input.keyboard.once('keydown-SPACE', () => this._startGame());
      this.input.keyboard.once('keydown-ENTER', () => this._startGame());
    });
  }

  // ── Shared ───────────────────────────────────────────────────────────────

  _startGame() {
    if (this._phase === 'done') return;
    this._phase = 'done';
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('WorldScene');
    });
  }

  update() {
    if (!this._starGfx) return;
    const { width, height } = this.scale;
    this._starGfx.clear();

    for (const s of this._stars) {
      s.y += s.spd;
      if (s.y > height) { s.y = 0; s.x = Phaser.Math.Between(0, width); }
      this._starGfx.fillStyle(0xffffff, s.size === 1 ? 0.3 : 0.6);
      this._starGfx.fillRect(s.x, s.y, s.size, s.size);
    }
  }
}
