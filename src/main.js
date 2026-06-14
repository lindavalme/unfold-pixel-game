import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import IntroScene from './scenes/IntroScene.js';
import WorldScene from './scenes/WorldScene.js';
import BattleScene from './scenes/BattleScene.js';

new Phaser.Game({
  width: 640,
  height: 480,
  pixelArt: true,
  antialias: false,
  backgroundColor: '#2d2d2d',
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
  },
  scene: [BootScene, IntroScene, WorldScene, BattleScene],
});
