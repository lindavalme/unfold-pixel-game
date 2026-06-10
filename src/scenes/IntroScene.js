import Phaser from 'phaser';
import HOME from '../data/home.json';

const WARM = '#f7c948';
const DIM  = '#666688';
const PS2P = '"Press Start 2P"';

export default class IntroScene extends Phaser.Scene {
  constructor() {
    super({ key: 'IntroScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.cameras.main.setBackgroundColor(0x0a0a1a);

    // Starfield
    this._starGfx = this.add.graphics().setDepth(0);
    this._stars   = Array.from({ length: 80 }, () => ({
      x:   Phaser.Math.Between(0, width),
      y:   Phaser.Math.Between(0, height),
      size: Phaser.Math.Between(1, 2),
      spd:  Phaser.Math.Between(1, 2) === 1 ? 0.1 : 0.2,
    }));

    // Title — bounces in
    this.add.text(cx, cy - 40, HOME.title.toUpperCase(), {
      fontFamily: PS2P, fontSize: '20px',
      color: WARM, resolution: 2,
      wordWrap: { width: width - 80 }, align: 'center',
    }).setOrigin(0.5).setScale(0.3).setAlpha(0).setDepth(2);

    // Animate title in
    const titleObj = this.children.list[this.children.list.length - 1];
    this.tweens.add({
      targets: titleObj, scale: 1, alpha: 1,
      duration: 500, delay: 200, ease: 'Back.easeOut',
    });

    // Tagline
    const tagline = this.add.text(cx, cy + 14, `for ${HOME.recipient}`, {
      fontFamily: PS2P, fontSize: '9px',
      color: DIM, resolution: 2,
    }).setOrigin(0.5).setAlpha(0).setDepth(2);

    this.tweens.add({ targets: tagline, alpha: 1, duration: 400, delay: 800 });

    // Blinking PRESS START
    this._prompt = this.add.text(cx, height - 60, 'PRESS START', {
      fontFamily: PS2P, fontSize: '10px',
      color: WARM, resolution: 2,
    }).setOrigin(0.5).setAlpha(0).setDepth(2);

    this.time.delayedCall(1200, () => {
      this._prompt.setAlpha(1);
      this.time.addEvent({
        delay: 500, loop: true,
        callback: () => this._prompt?.setAlpha(this._prompt.alpha > 0 ? 0 : 1),
      });
    });

    // Input
    this.input.once('pointerdown', () => this._start());
    this.input.keyboard.once('keydown-SPACE', () => this._start());
    this.input.keyboard.once('keydown-ENTER', () => this._start());
  }

  _start() {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('WorldScene'));
  }

  update() {
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
