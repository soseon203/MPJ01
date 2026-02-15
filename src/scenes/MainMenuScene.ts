import Phaser from 'phaser';
import { COLORS, FONT_FAMILY } from '../utils/constants';
import type { GameLayout } from '../utils/types';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG);

    const layout = this.registry.get('gameLayout') as GameLayout;
    const W = layout.gameWidth;
    const H = layout.gameHeight;

    // Background particles
    this.createBackgroundParticles(W, H);

    // Title
    const titleY = H / 3 - 20;
    const titleGlow = this.add.text(W / 2, titleY, '라스트타워', {
      fontSize: '56px',
      fontFamily: FONT_FAMILY,
      color: '#ffd700',
      align: 'center',
    }).setOrigin(0.5).setAlpha(0.3).setScale(1.05);

    this.add.text(W / 2, titleY, '라스트타워', {
      fontSize: '56px',
      fontFamily: FONT_FAMILY,
      color: '#ffeedd',
      align: 'center',
    }).setOrigin(0.5);

    // Title glow pulse
    this.tweens.add({
      targets: titleGlow,
      alpha: { from: 0.2, to: 0.5 },
      scale: { from: 1.03, to: 1.08 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
    });

    // Subtitle
    this.add.text(W / 2, titleY + 50, 'LAST TOWER', {
      fontSize: '18px',
      fontFamily: FONT_FAMILY,
      color: '#888899',
    }).setOrigin(0.5);

    // Start button
    this.createButton(W / 2, H / 2 + 60, '게임 시작', 260, 55, () => {
      this.scene.start('GameScene');
    });

    // Description
    this.add.text(W / 2, H - 100,
      '타워를 키우고, 스킬을 조합하고, 끝없는 웨이브에 맞서세요!', {
      fontSize: '14px',
      fontFamily: FONT_FAMILY,
      color: '#8888aa',
    }).setOrigin(0.5);

    this.add.text(W / 2, H - 70,
      '모바일 & 데스크톱 지원  |  터치 & 클릭', {
      fontSize: '12px',
      fontFamily: FONT_FAMILY,
      color: '#666688',
    }).setOrigin(0.5);
  }

  private createButton(x: number, y: number, label: string, w: number, h: number, onClick: () => void): void {
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.BUTTON, 1);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    bg.lineStyle(2, 0x6688cc);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);

    this.add.text(x, y, label, {
      fontSize: '22px',
      fontFamily: FONT_FAMILY,
      color: '#ffffff',
    }).setOrigin(0.5);

    const hitArea = this.add.rectangle(x, y, w, h).setInteractive({ useHandCursor: true }).setAlpha(0.001);

    hitArea.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(COLORS.BUTTON_HOVER, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      bg.lineStyle(2, 0x88aaee);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    });

    hitArea.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(COLORS.BUTTON, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      bg.lineStyle(2, 0x6688cc);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    });

    hitArea.on('pointerdown', onClick);
  }

  private createBackgroundParticles(W: number, H: number): void {
    for (let i = 0; i < 30; i++) {
      const star = this.add.graphics();
      const size = Phaser.Math.Between(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.1, 0.4);
      star.fillStyle(0xffffff, alpha);
      star.fillCircle(0, 0, size);
      star.setPosition(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H)
      );

      this.tweens.add({
        targets: star,
        alpha: { from: alpha * 0.5, to: alpha },
        duration: Phaser.Math.Between(1500, 3000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }
}
