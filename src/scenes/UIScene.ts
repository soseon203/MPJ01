import Phaser from 'phaser';
import {
  GameEvent, TowerState, TargetingStrategy, ActiveSynergy, OwnedSkill,
} from '../utils/types';
import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, FONT_FAMILY, UI_PANEL_WIDTH,
  RARITY_COLORS, RARITY_COLOR_STRINGS, TOWER_MAX_LEVEL, EXP_TABLE,
  MAX_ENEMIES_ON_SCREEN,
} from '../utils/constants';
import { SKILLS } from '../data/skillData';
import { EconomySystem } from '../systems/EconomySystem';
import { eventManager } from '../managers/EventManager';
import { soundManager } from '../managers/SoundManager';

interface UISceneData {
  economy: EconomySystem;
  getTowerState: () => TowerState;
  getWave: () => number;
  getEnemyCount: () => number;
  getMaxEnemies: () => number;
  getActiveSynergies: () => ActiveSynergy[];
  getShopAvailable: () => boolean;
  onShopOpen: () => void;
  onTargetChange: (s: TargetingStrategy) => void;
}

const PANEL_X = GAME_WIDTH - UI_PANEL_WIDTH;
const TARGETING_OPTIONS: TargetingStrategy[] = ['first', 'last', 'closest', 'strongest'];
const TARGETING_LABELS: Record<TargetingStrategy, string> = {
  first: '선두', last: '후미', closest: '최근접', strongest: '최강',
};

export class UIScene extends Phaser.Scene {
  private data_!: UISceneData;

  // UI elements
  private waveText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private expBarBg!: Phaser.GameObjects.Graphics;
  private expBarFill!: Phaser.GameObjects.Graphics;
  private expText!: Phaser.GameObjects.Text;
  private enemyCountText!: Phaser.GameObjects.Text;
  private skillContainer!: Phaser.GameObjects.Container;
  private synergyContainer!: Phaser.GameObjects.Container;
  private shopBtn!: Phaser.GameObjects.Container;
  private shopBtnVisible = false;
  private targetingText!: Phaser.GameObjects.Text;
  private currentTargetIdx = 0;

  constructor() {
    super({ key: 'UIScene' });
  }

  init(data: UISceneData): void {
    this.data_ = data;
  }

  create(): void {
    // Panel background
    const panelBg = this.add.graphics();
    panelBg.fillStyle(COLORS.UI_BG, 0.95);
    panelBg.fillRect(PANEL_X, 0, UI_PANEL_WIDTH, GAME_HEIGHT);
    panelBg.lineStyle(2, COLORS.UI_BORDER);
    panelBg.lineBetween(PANEL_X, 0, PANEL_X, GAME_HEIGHT);

    let y = 15;
    const cx = PANEL_X + UI_PANEL_WIDTH / 2;
    const leftX = PANEL_X + 12;
    const rightX = GAME_WIDTH - 12;

    // ---- WAVE ----
    this.add.text(cx, y, '웨이브', {
      fontSize: '12px', fontFamily: FONT_FAMILY, color: '#888899',
    }).setOrigin(0.5);
    y += 18;
    this.waveText = this.add.text(cx, y, '0', {
      fontSize: '28px', fontFamily: FONT_FAMILY, color: '#88aaff',
    }).setOrigin(0.5);
    y += 35;

    // ---- GOLD ----
    this.goldText = this.add.text(cx, y, '0G', {
      fontSize: '20px', fontFamily: FONT_FAMILY, color: '#ffd700',
    }).setOrigin(0.5);
    y += 30;

    // ---- ENEMY COUNT ----
    this.enemyCountText = this.add.text(cx, y, '적: 0/50', {
      fontSize: '14px', fontFamily: FONT_FAMILY, color: '#ff8888',
    }).setOrigin(0.5);
    y += 25;

    // ---- DIVIDER ----
    this.drawDivider(y);
    y += 10;

    // ---- TOWER LEVEL ----
    this.add.text(cx, y, '타워', {
      fontSize: '12px', fontFamily: FONT_FAMILY, color: '#888899',
    }).setOrigin(0.5);
    y += 18;
    this.levelText = this.add.text(cx, y, 'Lv.1', {
      fontSize: '22px', fontFamily: FONT_FAMILY, color: '#ffdd44',
    }).setOrigin(0.5);
    y += 28;

    // EXP bar
    const barW = UI_PANEL_WIDTH - 24;
    this.expBarBg = this.add.graphics();
    this.expBarBg.fillStyle(COLORS.EXP_BAR_BG, 1);
    this.expBarBg.fillRoundedRect(leftX, y, barW, 12, 3);
    this.expBarFill = this.add.graphics();
    this.expText = this.add.text(cx, y + 6, '0/200', {
      fontSize: '9px', fontFamily: FONT_FAMILY, color: '#aaaadd',
    }).setOrigin(0.5);
    y += 22;

    // ---- TARGETING ----
    this.add.text(cx, y, '타겟팅', {
      fontSize: '11px', fontFamily: FONT_FAMILY, color: '#888899',
    }).setOrigin(0.5);
    y += 16;

    const targetBg = this.add.graphics();
    targetBg.fillStyle(0x333355, 1);
    targetBg.fillRoundedRect(leftX, y - 2, barW, 24, 4);
    this.targetingText = this.add.text(cx, y + 10, TARGETING_LABELS['first'], {
      fontSize: '14px', fontFamily: FONT_FAMILY, color: '#88ddff',
    }).setOrigin(0.5);

    const targetHit = this.add.rectangle(cx, y + 10, barW, 24).setInteractive({ useHandCursor: true }).setAlpha(0.001);
    targetHit.on('pointerdown', () => {
      this.currentTargetIdx = (this.currentTargetIdx + 1) % TARGETING_OPTIONS.length;
      const strat = TARGETING_OPTIONS[this.currentTargetIdx];
      this.targetingText.setText(TARGETING_LABELS[strat]);
      this.data_.onTargetChange(strat);
      soundManager.buttonClick();
    });
    y += 32;

    // ---- DIVIDER ----
    this.drawDivider(y);
    y += 10;

    // ---- SKILLS LIST ----
    this.add.text(cx, y, '보유 스킬', {
      fontSize: '12px', fontFamily: FONT_FAMILY, color: '#888899',
    }).setOrigin(0.5);
    y += 16;
    this.skillContainer = this.add.container(0, y);
    y += 200; // reserve space

    // ---- DIVIDER ----
    this.drawDivider(y);
    y += 10;

    // ---- SYNERGIES ----
    this.add.text(cx, y, '시너지', {
      fontSize: '12px', fontFamily: FONT_FAMILY, color: '#888899',
    }).setOrigin(0.5);
    y += 16;
    this.synergyContainer = this.add.container(0, y);

    // ---- SHOP BUTTON (bottom) ----
    this.shopBtn = this.add.container(cx, GAME_HEIGHT - 45);
    const shopBg = this.add.graphics();
    shopBg.fillStyle(0x446644, 1);
    shopBg.fillRoundedRect(-90, -20, 180, 40, 8);
    shopBg.lineStyle(2, 0x88ff88);
    shopBg.strokeRoundedRect(-90, -20, 180, 40, 8);
    this.shopBtn.add(shopBg);

    const shopText = this.add.text(0, 0, '상점 열기', {
      fontSize: '16px', fontFamily: FONT_FAMILY, color: '#ffffff',
    }).setOrigin(0.5);
    this.shopBtn.add(shopText);

    const shopHit = this.add.rectangle(0, 0, 180, 40).setInteractive({ useHandCursor: true }).setAlpha(0.001);
    this.shopBtn.add(shopHit);
    shopHit.on('pointerdown', () => {
      soundManager.buttonClick();
      this.data_.onShopOpen();
    });

    this.shopBtn.setVisible(false);

    // Glow animation for shop button
    this.tweens.add({
      targets: shopBg,
      alpha: { from: 0.8, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  update(): void {
    if (!this.data_) return;

    const towerState = this.data_.getTowerState();
    const wave = this.data_.getWave();
    const enemyCount = this.data_.getEnemyCount();
    const maxEnemies = this.data_.getMaxEnemies();
    const gold = this.data_.economy.getGold();
    const shopAvail = this.data_.getShopAvailable();
    const synergies = this.data_.getActiveSynergies();

    // Update text
    this.waveText.setText(`${wave}`);
    this.goldText.setText(`${gold}G`);
    this.levelText.setText(`Lv.${towerState.level}`);

    // Enemy count with color warning
    const ratio = enemyCount / maxEnemies;
    let enemyColor = '#88ff88';
    if (ratio > 0.8) enemyColor = '#ff4444';
    else if (ratio > 0.6) enemyColor = '#ffaa44';
    else if (ratio > 0.4) enemyColor = '#ffff44';
    this.enemyCountText.setText(`적: ${enemyCount}/${maxEnemies}`);
    this.enemyCountText.setColor(enemyColor);

    // EXP bar
    if (towerState.level < TOWER_MAX_LEVEL) {
      const expNeeded = EXP_TABLE[towerState.level] || 99999;
      const pct = Math.min(1, towerState.exp / expNeeded);
      const barW = UI_PANEL_WIDTH - 24;
      this.expBarFill.clear();
      this.expBarFill.fillStyle(0x8888ff, 1);
      this.expBarFill.fillRoundedRect(PANEL_X + 12, this.expBarBg.y || 0, barW * pct, 12, 3);
      this.expText.setText(`${towerState.exp}/${expNeeded}`);
    } else {
      this.expText.setText('MAX');
    }

    // Shop button
    if (shopAvail !== this.shopBtnVisible) {
      this.shopBtn.setVisible(shopAvail);
      this.shopBtnVisible = shopAvail;
    }

    // Update skills list
    this.updateSkillsList(towerState.skills);

    // Update synergies
    this.updateSynergiesList(synergies);
  }

  private updateSkillsList(skills: OwnedSkill[]): void {
    this.skillContainer.removeAll(true);
    const leftX = PANEL_X + 12;

    skills.forEach((owned, i) => {
      const sd = SKILLS[owned.id];
      if (!sd) return;
      const y = i * 22;
      const colorStr = RARITY_COLOR_STRINGS[sd.rarity] || '#cccccc';

      // Colored dot
      const dot = this.add.graphics();
      dot.fillStyle(sd.color, 1);
      dot.fillCircle(leftX + 6, y + 6, 4);
      this.skillContainer.add(dot);

      // Name + level
      const label = i === 0 ? `${sd.name}` : `${sd.name} Lv.${owned.level}`;
      const text = this.add.text(leftX + 16, y, label, {
        fontSize: '12px', fontFamily: FONT_FAMILY, color: colorStr,
      });
      this.skillContainer.add(text);
    });
  }

  private updateSynergiesList(synergies: ActiveSynergy[]): void {
    this.synergyContainer.removeAll(true);
    const leftX = PANEL_X + 12;

    if (synergies.length === 0) {
      const text = this.add.text(leftX, 0, '(없음)', {
        fontSize: '11px', fontFamily: FONT_FAMILY, color: '#555566',
      });
      this.synergyContainer.add(text);
      return;
    }

    synergies.forEach((syn, i) => {
      const y = i * 20;
      const tierColors: Record<string, string> = {
        basic: '#88aaff', element: '#ff88ff', advanced: '#ffaa44',
      };
      const color = tierColors[syn.tier] || '#888888';

      const text = this.add.text(leftX, y, `${syn.name}`, {
        fontSize: '11px', fontFamily: FONT_FAMILY, color: color,
      });
      this.synergyContainer.add(text);
    });
  }

  private drawDivider(y: number): void {
    const g = this.add.graphics();
    g.lineStyle(1, COLORS.UI_BORDER, 0.5);
    g.lineBetween(PANEL_X + 10, y, GAME_WIDTH - 10, y);
  }
}
