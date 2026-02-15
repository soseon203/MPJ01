import Phaser from 'phaser';
import { computeGameLayout } from '../utils/constants';
import type { LayoutMode } from '../utils/types';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const isPortrait = window.innerHeight > window.innerWidth;
    const mode: LayoutMode = isPortrait ? 'portrait' : 'landscape';
    const layout = computeGameLayout(mode);

    this.registry.set('layoutMode', mode);
    this.registry.set('gameLayout', layout);

    this.scene.start('MainMenuScene');
  }
}
