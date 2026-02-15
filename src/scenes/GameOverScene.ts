import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONT_FAMILY, RARITY_COLORS } from '../utils/constants';
import { OwnedSkill } from '../utils/types';
import { SKILLS } from '../data/skillData';

interface GameOverData {
  wave: number;
  kills: number;
  level: number;
  skills: OwnedSkill[];
  gold: number;
}

export class GameOverScene extends Phaser.Scene {
  private data_!: GameOverData;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: GameOverData): void {
    this.data_ = data;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0a0a1a);

    // Dark overlay effect
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);

    // Title
    this.add.text(GAME_WIDTH / 2, 80, '게임 오버', {
      fontSize: '48px', fontFamily: FONT_FAMILY, color: '#ff4444',
    }).setOrigin(0.5);

    // Stats
    const statsY = 170;
    const stats = [
      { label: '도달 웨이브', value: `${this.data_.wave}`, color: '#88aaff' },
      { label: '총 처치', value: `${this.data_.kills}`, color: '#ff8888' },
      { label: '타워 레벨', value: `Lv.${this.data_.level}`, color: '#ffdd44' },
      { label: '최종 골드', value: `${this.data_.gold}G`, color: '#ffd700' },
    ];

    stats.forEach((stat, i) => {
      const y = statsY + i * 45;
      this.add.text(GAME_WIDTH / 2 - 100, y, stat.label, {
        fontSize: '18px', fontFamily: FONT_FAMILY, color: '#aaaacc',
      }).setOrigin(0, 0.5);
      this.add.text(GAME_WIDTH / 2 + 100, y, stat.value, {
        fontSize: '22px', fontFamily: FONT_FAMILY, color: stat.color,
      }).setOrigin(1, 0.5);
    });

    // Skills list
    const skillsY = statsY + stats.length * 45 + 30;
    this.add.text(GAME_WIDTH / 2, skillsY, '보유 스킬', {
      fontSize: '18px', fontFamily: FONT_FAMILY, color: '#ccccee',
    }).setOrigin(0.5);

    const skills = this.data_.skills || [];
    const cols = 4;
    const startX = GAME_WIDTH / 2 - (cols * 140) / 2 + 70;
    skills.forEach((owned, i) => {
      const skillData = SKILLS[owned.id];
      if (!skillData) return;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * 140;
      const y = skillsY + 35 + row * 30;
      const colorStr = '#' + (RARITY_COLORS[skillData.rarity] || 0xcccccc).toString(16).padStart(6, '0');
      this.add.text(x, y, `${skillData.name} Lv.${owned.level}`, {
        fontSize: '13px', fontFamily: FONT_FAMILY, color: colorStr,
      }).setOrigin(0.5);
    });

    // Buttons
    const btnY = GAME_HEIGHT - 120;
    this.createButton(GAME_WIDTH / 2 - 120, btnY, '다시 시작', () => {
      this.scene.stop('UIScene');
      this.scene.start('GameScene');
    });
    this.createButton(GAME_WIDTH / 2 + 120, btnY, '메인 메뉴', () => {
      this.scene.stop('UIScene');
      this.scene.start('MainMenuScene');
    });
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    const w = 180, h = 50;
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.BUTTON, 1);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    bg.lineStyle(2, 0x6688cc);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);

    this.add.text(x, y, label, {
      fontSize: '18px', fontFamily: FONT_FAMILY, color: '#ffffff',
    }).setOrigin(0.5);

    const hit = this.add.rectangle(x, y, w, h).setInteractive({ useHandCursor: true }).setAlpha(0.001);
    hit.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(COLORS.BUTTON_HOVER, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      bg.lineStyle(2, 0x88aaee);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    });
    hit.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(COLORS.BUTTON, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      bg.lineStyle(2, 0x6688cc);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    });
    hit.on('pointerdown', onClick);
  }
}
