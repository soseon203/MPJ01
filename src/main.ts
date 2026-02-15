import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';
import { PORTRAIT_WIDTH, PORTRAIT_HEIGHT } from './utils/constants';

const isPortrait = window.innerHeight > window.innerWidth;
if (isPortrait) {
  gameConfig.width = PORTRAIT_WIDTH;
  gameConfig.height = PORTRAIT_HEIGHT;
}

new Phaser.Game(gameConfig);
