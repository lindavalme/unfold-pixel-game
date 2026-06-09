import Phaser from 'phaser';

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldScene' });
  }

  create() {
    console.log('World OK');
  }
}
