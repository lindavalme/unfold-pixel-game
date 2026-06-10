import Phaser from 'phaser';

const PS2P     = '"Press Start 2P"';
const SILK     = 'Silkscreen';
const BG_LIGHT = 0xf0e8c8;
const BG_DARK  = 0x2a2a1a;
const HP_GREEN = 0x50c878;
const HP_RED   = 0xe03030;
const DIALOG_BG = 0xf0e8c8;
const TEXT_DARK = '#1a1a1a';

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data) {
    this._config = data?.config ?? {
      opponent_name: 'Mystery',
      opponent_sprite: null,
      moves: [
        { name: 'Surprise Attack',   flavor: 'You were caught off guard!' },
        { name: 'Charm',             flavor: "It's super effective!" },
      ],
      outcome_message: 'You blacked out... but you\'re smiling.',
    };
  }

  create() {
    const { width, height } = this.scale;

    // ── Flash transition in ──────────────────────────────────────────────
    this.cameras.main.setBackgroundColor(0xffffff);
    let flashes = 0;
    const flash = this.time.addEvent({
      delay: 80, repeat: 5,
      callback: () => {
        flashes++;
        this.cameras.main.setBackgroundColor(flashes % 2 === 0 ? 0xffffff : BG_LIGHT);
        if (flashes >= 6) this._buildArena(width, height);
      },
    });
  }

  _buildArena(width, height) {
    this.cameras.main.setBackgroundColor(BG_LIGHT);
    const dialogH = 110;
    const arenaH  = height - dialogH;

    // ── Background stripes (classic Pokémon grass/platform feel) ────────
    const bg = this.add.graphics();
    bg.fillStyle(0xe8ddb8, 1);
    bg.fillRect(0, 0, width, arenaH);
    // Ground lines
    bg.lineStyle(2, 0xc8b888, 0.6);
    for (let y = arenaH * 0.55; y < arenaH; y += 8) bg.lineBetween(0, y, width, y);

    // ── Opponent platform (top-right) ────────────────────────────────────
    const oppPlatX = width * 0.62, oppPlatY = arenaH * 0.38;
    this._drawPlatform(oppPlatX, oppPlatY, 120, 18, 0xb8a870);

    // Opponent sprite placeholder
    this._oppSprite = this._drawCharPlaceholder(oppPlatX, oppPlatY - 52, 48, 0xe05050);

    // Opponent name + HP
    this._oppHPBar = this._buildHPBar(width * 0.04, arenaH * 0.08, 180, this._config.opponent_name, true);

    // ── Player platform (bottom-left) ────────────────────────────────────
    const plrPlatX = width * 0.28, plrPlatY = arenaH * 0.72;
    this._drawPlatform(plrPlatX, plrPlatY, 140, 22, 0x908050);

    // Player sprite placeholder
    this._plrSprite = this._drawCharPlaceholder(plrPlatX, plrPlatY - 64, 48, 0x5090e0);

    // Player name + HP
    this._plrHPBar = this._buildHPBar(width * 0.52, arenaH * 0.58, 200, 'YOU', false);

    // ── Dialog box ───────────────────────────────────────────────────────
    const dlgY = arenaH;
    const dlg  = this.add.graphics();
    dlg.fillStyle(DIALOG_BG, 1);
    dlg.fillRect(0, dlgY, width, dialogH);
    dlg.lineStyle(3, 0x1a1a1a, 1);
    dlg.strokeRect(0, dlgY, width, dialogH);
    // Inner border
    dlg.lineStyle(1, 0x888870, 0.5);
    dlg.strokeRect(6, dlgY + 6, width - 12, dialogH - 12);

    this._dialogText = this.add.text(20, dlgY + 18, '', {
      fontFamily: SILK, fontSize: '13px',
      color: TEXT_DARK, wordWrap: { width: width - 40 },
      lineSpacing: 6, resolution: 2,
    }).setDepth(10);

    this._promptText = this.add.text(width - 20, dlgY + dialogH - 20, '▶', {
      fontFamily: PS2P, fontSize: '8px', color: TEXT_DARK, resolution: 2,
    }).setOrigin(1, 1).setDepth(10).setAlpha(0);

    // ── Start sequence ───────────────────────────────────────────────────
    this._sequence = this._buildSequence();
    this._seqIndex = 0;
    this._waiting  = false;

    this.time.delayedCall(300, () => this._nextBeat());

    this.input.on('pointerdown', () => this._onAdvance());
    this.input.keyboard.on('keydown-SPACE', () => this._onAdvance());
    this.input.keyboard.on('keydown-ENTER', () => this._onAdvance());
  }

  // ── Sequence builder ──────────────────────────────────────────────────

  _buildSequence() {
    const { opponent_name, moves, outcome_message } = this._config;
    const beats = [];

    beats.push({ type: 'text', text: `A wild ${opponent_name} appeared!` });
    beats.push({ type: 'text', text: `Go! You!` });

    for (const move of moves) {
      beats.push({ type: 'text',   text: `${opponent_name} used ${move.name}!` });
      beats.push({ type: 'text',   text: move.flavor });
      beats.push({ type: 'drain',  target: 'player' });
    }

    beats.push({ type: 'text',  text: 'You fainted!' });
    beats.push({ type: 'shake', target: 'player' });
    beats.push({ type: 'text',  text: outcome_message });
    beats.push({ type: 'end' });

    return beats;
  }

  _nextBeat() {
    if (this._seqIndex >= this._sequence.length) return;
    const beat = this._sequence[this._seqIndex++];

    if (beat.type === 'text') {
      this._showText(beat.text, () => this._waitForTap());

    } else if (beat.type === 'drain') {
      this._drainHP(this._plrHPBar, () => {
        this.time.delayedCall(300, () => this._nextBeat());
      });

    } else if (beat.type === 'shake') {
      this.cameras.main.shake(400, 0.012);
      this.time.delayedCall(500, () => this._nextBeat());

    } else if (beat.type === 'end') {
      this.time.delayedCall(800, () => this._endBattle());
    }
  }

  _waitForTap() {
    this._waiting = true;
    this.tweens.add({
      targets: this._promptText, alpha: 1, duration: 200,
    });
  }

  _onAdvance() {
    if (!this._waiting) return;
    this._waiting = false;
    this._promptText.setAlpha(0);
    this._nextBeat();
  }

  _endBattle() {
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('BattleScene');
      this.scene.resume('WorldScene');
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  _showText(text, onDone) {
    this._dialogText.setText('');
    let i = 0;
    this.time.addEvent({
      delay: 30, repeat: text.length - 1,
      callback: () => {
        i++;
        this._dialogText.setText(text.substring(0, i));
        if (i >= text.length && onDone) onDone();
      },
    });
  }

  _buildHPBar(x, y, barWidth, name, isOpponent) {
    const panel = this.add.graphics();
    // Panel background
    panel.fillStyle(0xd8d0a8, 1);
    panel.fillRect(x, y, barWidth, 42);
    panel.lineStyle(2, 0x1a1a1a, 1);
    panel.strokeRect(x, y, barWidth, 42);

    this.add.text(x + 8, y + 6, name, {
      fontFamily: PS2P, fontSize: '7px', color: TEXT_DARK, resolution: 2,
    });

    this.add.text(x + 8, y + 22, 'HP', {
      fontFamily: PS2P, fontSize: '6px', color: '#555533', resolution: 2,
    });

    // HP bar track
    const trackX = x + 28, trackY = y + 24, trackW = barWidth - 36, trackH = 8;
    panel.fillStyle(0x303020, 1);
    panel.fillRect(trackX, trackY, trackW, trackH);

    // HP bar fill (stored for tween)
    const fill = this.add.graphics();
    fill.fillStyle(HP_GREEN, 1);
    fill.fillRect(0, 0, trackW, trackH);
    fill.setPosition(trackX, trackY);

    return { fill, trackW, trackH, trackX, trackY, currentRatio: 1 };
  }

  _drainHP(bar, onDone) {
    const targetRatio = 0;
    this.tweens.add({
      targets: bar,
      currentRatio: targetRatio,
      duration: 800,
      ease: 'Linear',
      onUpdate: () => {
        bar.fill.clear();
        const color = bar.currentRatio > 0.5 ? HP_GREEN
          : bar.currentRatio > 0.25 ? 0xf0c030 : HP_RED;
        bar.fill.fillStyle(color, 1);
        bar.fill.fillRect(0, 0, bar.trackW * bar.currentRatio, bar.trackH);
      },
      onComplete: onDone,
    });
  }

  _drawPlatform(cx, y, w, h, color) {
    const gfx = this.add.graphics();
    gfx.fillStyle(color, 1);
    gfx.fillEllipse(cx, y, w, h);
    gfx.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(20).color, 1);
    gfx.fillEllipse(cx, y + 4, w, h * 0.5);
  }

  _drawCharPlaceholder(cx, y, size, color) {
    const gfx = this.add.graphics();
    // Body
    gfx.fillStyle(color, 1);
    gfx.fillRect(cx - size / 2, y - size, size, size);
    // Head
    gfx.fillCircle(cx, y - size - size * 0.4, size * 0.4);
    // Simple outline
    gfx.lineStyle(2, 0x000000, 0.4);
    gfx.strokeRect(cx - size / 2, y - size, size, size);
    gfx.strokeCircle(cx, y - size - size * 0.4, size * 0.4);
    return gfx;
  }
}
