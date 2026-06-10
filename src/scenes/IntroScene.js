import Phaser from 'phaser';
import HOME from '../data/home.json';

const BG_COLOR  = 0x1a1a2e;
const WARM      = '#f7c948';
const WHITE     = '#ffffff';
const DIM       = '#888888';

export default class IntroScene extends Phaser.Scene {
  constructor() {
    super({ key: 'IntroScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    // Background
    this.cameras.main.setBackgroundColor(BG_COLOR);

    // Subtle pixel-grid overlay
    const grid = this.add.graphics();
    grid.lineStyle(1, 0xffffff, 0.03);
    for (let x = 0; x < width; x += 32)  grid.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 32) grid.lineBetween(0, y, width, y);

    // "for [recipient]" label
    this.add.text(cx, 60, `for ${HOME.recipient}`, {
      fontFamily: '"Press Start 2P"', fontSize: '8px',
      color: DIM, resolution: 2,
    }).setOrigin(0.5);

    // Title
    this.add.text(cx, 100, HOME.title, {
      fontFamily: '"Press Start 2P"', fontSize: '12px',
      color: WARM, resolution: 2,
      wordWrap: { width: width - 64 }, align: 'center',
    }).setOrigin(0.5, 0);

    // Divider
    const div = this.add.graphics();
    div.lineStyle(1, 0xf7c948, 0.4);
    div.lineBetween(cx - 80, 148, cx + 80, 148);

    // Typewriter text
    this._fullText  = HOME.intro_text ?? '';
    this._charIndex = 0;
    this._textObj   = this.add.text(cx, 172, '', {
      fontFamily: '"Press Start 2P"', fontSize: '7px',
      color: WHITE, resolution: 2,
      wordWrap: { width: width - 80 }, align: 'center', lineSpacing: 10,
    }).setOrigin(0.5, 0);

    this._typeTimer = this.time.addEvent({
      delay: 40,
      repeat: this._fullText.length - 1,
      callback: this._typeNextChar,
      callbackScope: this,
    });

    // "Tap to begin" prompt — hidden until typing finishes
    this._prompt = this.add.text(cx, height - 40, '▶  tap to begin', {
      fontFamily: '"Press Start 2P"', fontSize: '8px',
      color: WARM, resolution: 2,
    }).setOrigin(0.5).setAlpha(0);

    // Input: tap or key skips typing / starts game
    this.input.once('pointerdown', () => this._advance());
    this.input.keyboard.once('keydown-SPACE', () => this._advance());
    this.input.keyboard.once('keydown-ENTER', () => this._advance());
  }

  _typeNextChar() {
    this._charIndex++;
    this._textObj.setText(this._fullText.substring(0, this._charIndex));

    if (this._charIndex >= this._fullText.length) {
      this._showPrompt();
    }
  }

  _showPrompt() {
    this.tweens.add({
      targets: this._prompt,
      alpha: 1,
      duration: 300,
      onComplete: () => this._pulsePrompt(),
    });
  }

  _pulsePrompt() {
    this.tweens.add({
      targets: this._prompt,
      alpha: 0.3,
      duration: 600,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  _advance() {
    if (this._charIndex < this._fullText.length) {
      // Skip typing — show full text immediately
      this._typeTimer.remove();
      this._charIndex = this._fullText.length;
      this._textObj.setText(this._fullText);
      this._showPrompt();

      // Re-register input for actual transition
      this.input.once('pointerdown', () => this._startGame());
      this.input.keyboard.once('keydown-SPACE', () => this._startGame());
      this.input.keyboard.once('keydown-ENTER', () => this._startGame());
    } else {
      this._startGame();
    }
  }

  _startGame() {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('WorldScene');
    });
  }
}
