const DEPTH = 300;

export default class ToastMessage {
  constructor(scene) {
    this.scene = scene;
    const { width } = scene.scale;

    this._text = scene.add.text(width - 12, 12, '', {
      fontFamily: 'Silkscreen', fontSize: '15px',
      color: '#f7c948',
      backgroundColor: '#000000cc',
      padding: { x: 8, y: 5 },
      resolution: 2,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH).setAlpha(0);
  }

  show(message, duration = 1800) {
    this.scene.tweens.killTweensOf(this._text);
    this._text.setText(message).setAlpha(1);

    this.scene.tweens.add({
      targets: this._text,
      alpha: 0,
      delay: duration,
      duration: 400,
      ease: 'Linear',
    });
  }
}
