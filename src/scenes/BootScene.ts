import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    // Detect layout mode
    const isPortrait = window.innerHeight > window.innerWidth;
    this.registry.set('layoutMode', isPortrait ? 'portrait' : 'landscape');

    this.scene.start('MainMenuScene');
  }
}
