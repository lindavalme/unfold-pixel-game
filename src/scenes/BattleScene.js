import Phaser from 'phaser';

const PS2P    = '"Press Start 2P"';
const SILK    = 'Silkscreen';
const WARM    = 0xf7c948;
const WARM_S  = '#f7c948';
const WHITE   = '#ffffff';
const DIM     = '#aaaacc';
const HP_GREEN = 0x50c878;
const HP_YEL   = 0xf0c030;
const HP_RED   = 0xe03050;

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data) {
    this._config = data?.config ?? {
      opponent_name: 'Mystery',
      opponent_sprite: null,
      moves: [
        { name: 'Surprise Attack', flavor: 'You were caught off guard!' },
      ],
      outcome_message: 'You blacked out... overwhelmed with love.',
    };
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(0xffffff);

    // Flash in
    let f = 0;
    this.time.addEvent({
      delay: 70, repeat: 5,
      callback: () => {
        this.cameras.main.setBackgroundColor(++f % 2 === 0 ? 0xffffff : 0x000000);
        if (f >= 6) this._buildArena(width, height);
      },
    });
  }

  _buildArena(width, height) {
    const dialogH = 120;
    const arenaH  = height - dialogH;

    this.cameras.main.setBackgroundColor(0x0d0d1a);

    // ── Starfield (reuse game aesthetic) ────────────────────────────────
    const stars = this.add.graphics().setDepth(0);
    for (let i = 0; i < 60; i++) {
      stars.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.1, 0.5));
      stars.fillRect(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, arenaH),
        Phaser.Math.Between(1, 2), Phaser.Math.Between(1, 2)
      );
    }

    // ── Ground divider ───────────────────────────────────────────────────
    const ground = this.add.graphics().setDepth(1);
    ground.fillStyle(0x1a1a3a, 1);
    ground.fillRect(0, arenaH * 0.5, width, arenaH * 0.5);
    ground.lineStyle(2, WARM, 0.3);
    ground.lineBetween(0, arenaH * 0.5, width, arenaH * 0.5);

    // ── Opponent platform (top-right) ─────────────────────────────────
    const oppX = width * 0.68, oppPlatY = arenaH * 0.44;
    this._drawPlatform(oppX, oppPlatY, 110, 16, 0x2a2a5a);
    this._oppSprite = this._drawChar(oppX, oppPlatY - 56, 40, WARM);

    // ── Player platform (bottom-left) ────────────────────────────────
    const plrX = width * 0.28, plrPlatY = arenaH * 0.78;
    this._drawPlatform(plrX, plrPlatY, 130, 20, 0x1a3a2a);
    this._plrSprite = this._drawChar(plrX, plrPlatY - 68, 44, 0x5090e0);

    // ── HP panels ────────────────────────────────────────────────────
    this._oppHP = this._buildHPPanel(16,          arenaH * 0.06, 180, this._config.opponent_name);
    this._plrHP = this._buildHPPanel(width - 204, arenaH * 0.52, 188, 'YOU');

    // ── VS splash ─────────────────────────────────────────────────────
    const vs = this.add.text(width / 2, arenaH / 2, 'VS', {
      fontFamily: PS2P, fontSize: '36px', color: WARM_S,
      stroke: '#000000', strokeThickness: 6, resolution: 2,
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    this.tweens.add({
      targets: vs, alpha: 1, scale: 1.3,
      duration: 200, ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(400, () => {
          this.tweens.add({ targets: vs, alpha: 0, duration: 200 });
        });
      },
    });

    // ── Dialog box ────────────────────────────────────────────────────
    const dlgY = arenaH;
    const dlg  = this.add.graphics().setDepth(5);
    dlg.fillStyle(0x0d0d1a, 0.97);
    dlg.fillRect(0, dlgY, width, dialogH);
    dlg.lineStyle(3, WARM, 0.9);
    dlg.strokeRect(0, dlgY, width, dialogH);
    dlg.lineStyle(1, WARM, 0.2);
    dlg.strokeRect(5, dlgY + 5, width - 10, dialogH - 10);

    this._dialogText = this.add.text(20, dlgY + 18, '', {
      fontFamily: SILK, fontSize: '15px',
      color: WHITE, wordWrap: { width: width - 44 },
      lineSpacing: 6, resolution: 2,
    }).setDepth(10);

    this._prompt = this.add.text(width - 18, dlgY + dialogH - 16, '▶', {
      fontFamily: PS2P, fontSize: '15px', color: WARM_S, resolution: 2,
    }).setOrigin(1, 1).setDepth(10).setAlpha(0);

    // ── Start sequence ────────────────────────────────────────────────
    this._sequence = this._buildSequence();
    this._seqIndex = 0;
    this._waiting  = false;

    this.time.delayedCall(700, () => this._nextBeat());

    this.input.on('pointerdown', () => this._onAdvance());
    this.input.keyboard.on('keydown-SPACE', () => this._onAdvance());
    this.input.keyboard.on('keydown-ENTER', () => this._onAdvance());
  }

  // ── Sequence ─────────────────────────────────────────────────────────

  _resolve(str) {
    const { partner = 'Partner', distraction = 'TV' } = this._config;
    return str.replace(/{partner}/g, partner).replace(/{distraction}/g, distraction);
  }

  _buildSequence() {
    const { opponent_name, moves, outcome_message, player_moves = [] } = this._config;
    const beats = [];
    beats.push({ type: 'text', text: `A wild ${opponent_name} appeared!` });
    beats.push({ type: 'text', text: `Go! You!` });

    const step = 1 / moves.length;
    for (const move of moves) {
      beats.push({ type: 'text',        text: `${opponent_name} used\n${move.name}!` });
      beats.push({ type: 'text',        text: move.flavor });
      beats.push({ type: 'drain',       amount: step });
      if (player_moves.length > 0) {
        beats.push({ type: 'player-turn' });
      }
    }

    beats.push({ type: 'text',  text: `You fainted!` });
    beats.push({ type: 'shake' });
    beats.push({ type: 'text',  text: outcome_message });
    beats.push({ type: 'end' });
    return beats;
  }

  _nextBeat() {
    if (this._seqIndex >= this._sequence.length) return;
    const beat = this._sequence[this._seqIndex++];
    if      (beat.type === 'text')  this._showText(beat.text, () => this._waitForTap());
    else if (beat.type === 'drain')       this._drainHP(this._plrHP, beat.amount, () => this.time.delayedCall(300, () => this._nextBeat()));
    else if (beat.type === 'player-turn') this._showPlayerMoves();
    else if (beat.type === 'shake') { this.cameras.main.shake(500, 0.014); this.time.delayedCall(600, () => this._nextBeat()); }
    else if (beat.type === 'end')   this.time.delayedCall(700, () => this._endBattle());
  }

  _waitForTap() {
    this._waiting = true;
    this.tweens.add({ targets: this._prompt, alpha: 1, duration: 200 });
    // Pulse the prompt
    this.time.delayedCall(200, () => {
      if (this._waiting) {
        this.tweens.add({ targets: this._prompt, alpha: 0.3, duration: 400, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
      }
    });
  }

  _onAdvance() {
    if (!this._waiting) return;
    this._waiting = false;
    this.tweens.killTweensOf(this._prompt);
    this._prompt.setAlpha(0);
    this._nextBeat();
  }

  _showPlayerMoves() {
    const { width, height } = this.scale;
    const { player_moves = [] } = this._config;
    const dialogH = 120;
    const dlgY    = height - dialogH;

    this._dialogText.setText('What will you do?');
    this._prompt.setAlpha(0);

    const btnW   = width - 32;
    const btnH   = 34;
    const startY = dlgY + 16;
    const btns   = [];

    player_moves.forEach((move, i) => {
      const label = this._resolve(move.name);
      const by    = startY + i * (btnH + 6);

      const bg = this.add.graphics().setDepth(12);
      bg.fillStyle(0x1a1a3a, 1);
      bg.fillRect(16, by, btnW, btnH);
      bg.lineStyle(1, 0xf7c948, 0.5);
      bg.strokeRect(16, by, btnW, btnH);

      const txt = this.add.text(28, by + btnH / 2, `▸ ${label}`, {
        fontFamily: 'Silkscreen', fontSize: '15px',
        color: '#ffffff', resolution: 2,
      }).setOrigin(0, 0.5).setDepth(13).setInteractive({ useHandCursor: true });

      txt.on('pointerover', () => { txt.setColor('#f7c948'); bg.lineStyle(2, 0xf7c948, 1); bg.strokeRect(16, by, btnW, btnH); });
      txt.on('pointerout',  () => { txt.setColor('#ffffff'); bg.lineStyle(1, 0xf7c948, 0.5); bg.strokeRect(16, by, btnW, btnH); });
      txt.once('pointerdown', () => this._onPlayerMove(move, btns));

      btns.push(bg, txt);
    });
  }

  _onPlayerMove(move, btns) {
    // Destroy buttons
    btns.forEach(b => b.destroy());

    const flavor = this._resolve(move.flavor);
    this._showText(flavor, () => this._waitForTap());

    // Player does tiny damage to opponent (6-9% per move — never lethal)
    const dmg = Phaser.Math.FloatBetween(0.06, 0.09);
    this._drainHP(this._oppHP, dmg, () => {});
  }

  _endBattle() {
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('BattleScene');
      this.scene.resume('WorldScene');
    });
  }

  // ── Drawing helpers ───────────────────────────────────────────────────

  _showText(text, onDone) {
    this._dialogText.setText('');
    let i = 0;
    this.time.addEvent({
      delay: 28, repeat: text.length - 1,
      callback: () => {
        this._dialogText.setText(text.substring(0, ++i));
        if (i >= text.length && onDone) onDone();
      },
    });
  }

  _buildHPPanel(x, y, w, name) {
    const PAD_X   = 10;
    const PAD_Y   = 8;
    const LABEL_W = 32; // width reserved for "HP" label
    const BAR_H   = 10;
    const panelH  = PAD_Y + 20 + 6 + BAR_H + PAD_Y; // name row + gap + bar + padding

    const gfx = this.add.graphics().setDepth(4);
    gfx.fillStyle(0x0d0d1a, 0.9);
    gfx.fillRect(x, y, w, panelH);
    gfx.lineStyle(2, WARM, 0.6);
    gfx.strokeRect(x, y, w, panelH);

    // Name row
    this.add.text(x + PAD_X, y + PAD_Y, name, {
      fontFamily: PS2P, fontSize: '15px', color: WARM_S, resolution: 2,
    }).setDepth(5);

    // HP label + bar row
    const barRowY  = y + PAD_Y + 20 + 6;
    this.add.text(x + PAD_X, barRowY - 1, 'HP', {
      fontFamily: PS2P, fontSize: '15px', color: DIM, resolution: 2,
    }).setDepth(5);

    // Bar fills remaining width after "HP" label
    const trackX = x + PAD_X + LABEL_W + 6;
    const trackW = w - (PAD_X + LABEL_W + 6) - PAD_X;
    const trackY = barRowY;

    gfx.fillStyle(0x111122, 1);
    gfx.fillRect(trackX, trackY, trackW, BAR_H);

    const fill = this.add.graphics().setDepth(5);
    fill.fillStyle(HP_GREEN, 1);
    fill.fillRect(0, 0, trackW, BAR_H);
    fill.setPosition(trackX, trackY);

    return { fill, trackW, trackH: BAR_H, currentRatio: 1 };
  }

  _drainHP(bar, amount, onDone) {
    const target = Math.max(0, bar.currentRatio - amount);
    this.tweens.add({
      targets: bar, currentRatio: target,
      duration: 900, ease: 'Linear',
      onUpdate: () => {
        bar.fill.clear();
        const color = bar.currentRatio > 0.5 ? HP_GREEN : bar.currentRatio > 0.25 ? HP_YEL : HP_RED;
        bar.fill.fillStyle(color, 1);
        bar.fill.fillRect(0, 0, bar.trackW * bar.currentRatio, bar.trackH);
      },
      onComplete: onDone,
    });
  }

  _drawPlatform(cx, y, w, h, color) {
    const gfx = this.add.graphics().setDepth(2);
    gfx.fillStyle(color, 1);
    gfx.fillEllipse(cx, y, w, h);
    gfx.lineStyle(1, WARM, 0.2);
    gfx.strokeEllipse(cx, y, w, h);
  }

  _drawChar(cx, baseY, size, color) {
    const gfx = this.add.graphics().setDepth(3);
    const headR = size * 0.38;
    // Body
    gfx.fillStyle(color, 1);
    gfx.fillRect(cx - size / 2, baseY - size, size, size);
    // Head
    gfx.fillCircle(cx, baseY - size - headR, headR);
    // Subtle shading
    gfx.fillStyle(0x000000, 0.15);
    gfx.fillRect(cx + size / 4, baseY - size, size / 4, size);
    // Outline
    gfx.lineStyle(2, 0x000000, 0.5);
    gfx.strokeRect(cx - size / 2, baseY - size, size, size);
    gfx.strokeCircle(cx, baseY - size - headR, headR);
    return gfx;
  }
}
