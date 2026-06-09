import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import WorldScene from './scenes/WorldScene.js';

new Phaser.Game({
  width: 640,
  height: 480,
  pixelArt: true,
  antialias: false,
  backgroundColor: '#2d2d2d',
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, WorldScene],
});
