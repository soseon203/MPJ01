import Phaser from 'phaser';
import {
  GameEvent, SkillId, OwnedSkill, ShopCard, EnemyState, TowerState,
  TargetingStrategy, ActiveSynergy, getSkillEffect, getSkillUpgradeCost, MAX_SKILL_SLOTS,
} from '../utils/types';
import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, FONT_FAMILY, UI_PANEL_WIDTH, PATH_MARGIN,
  MAX_ENEMIES_ON_SCREEN, STARTING_GOLD, EXP_TABLE, TOWER_LEVEL_STATS,
  TOWER_MAX_LEVEL, SHOP_CARD_COUNT, SHOP_UNLOCK_WAVES, SHOP_UNLOCK_KILLS,
  EXP_PURCHASE_OPTIONS, RARITY_COLORS, RARITY_COLOR_STRINGS, ORB_ORBIT_RADIUS,
} from '../utils/constants';
import { eventManager } from '../managers/EventManager';
import { SKILLS, SKILL_LIST } from '../data/skillData';
import { SYNERGIES } from '../data/synergyData';
import { ENEMY_DATA } from '../data/enemyData';
import { generateWave } from '../data/waveData';
import { SquarePathSystem } from '../systems/SquarePathSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { WaveSystem } from '../systems/WaveSystem';
import { ShopSystem } from '../systems/ShopSystem';
import { TowerCombatSystem, ComputedTowerStats } from '../systems/TowerCombatSystem';
import { VFXManager } from '../systems/VFXManager';
import { CenterTower } from '../entities/CenterTower';
import { SkillOrb } from '../entities/SkillOrb';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { soundManager } from '../managers/SoundManager';

export class GameScene extends Phaser.Scene {
  // Systems
  private pathSystem!: SquarePathSystem;
  private economy!: EconomySystem;
  private waveSystem!: WaveSystem;
  private shopSystem!: ShopSystem;
  private combat!: TowerCombatSystem;
  private vfx!: VFXManager;

  // Entities
  private tower!: CenterTower;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private orbs: SkillOrb[] = [];

  // Game state
  private towerFireCooldown = 0;
  private orbCooldowns: Map<string, number> = new Map();
  private gamePaused = false;
  private isGameOver = false;
  private shopAvailable = false;
  private lastShopWave = 0;
  private lastShopKills = 0;
  private initialSelectionRound = 0;
  private computedStats!: ComputedTowerStats;
  private activeSynergies: ActiveSynergy[] = [];
  private waveAutoStartTimer = 0;
  private currentWave = 0;
  private waveInProgress = false;

  // Tower position
  private towerX = 0;
  private towerY = 0;

  // UI containers
  private popupContainer: Phaser.GameObjects.Container | null = null;
  private pathGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG);
    this.isGameOver = false;
    this.gamePaused = true;
    this.currentWave = 0;
    this.enemies = [];
    this.projectiles = [];
    this.orbs = [];
    this.orbCooldowns.clear();
    this.activeSynergies = [];
    this.lastShopWave = 0;
    this.lastShopKills = 0;
    this.shopAvailable = false;
    this.waveInProgress = false;

    // Calculate layout
    const gameAreaW = GAME_WIDTH - UI_PANEL_WIDTH;
    this.towerX = gameAreaW / 2;
    this.towerY = GAME_HEIGHT / 2;

    // Init systems
    const pathRect = {
      x1: this.towerX - PATH_MARGIN, y1: this.towerY - PATH_MARGIN,
      x2: this.towerX + PATH_MARGIN, y2: this.towerY + PATH_MARGIN,
    };
    this.pathSystem = new SquarePathSystem(pathRect);
    this.economy = new EconomySystem();
    this.economy.addGold(STARTING_GOLD);
    this.waveSystem = new WaveSystem();
    this.shopSystem = new ShopSystem();
    this.combat = new TowerCombatSystem();
    this.vfx = new VFXManager(this);

    // Wave system spawn callback
    this.waveSystem.setSpawnCallback((type, hpMult, speedMult) => {
      this.spawnEnemy(type, hpMult, speedMult);
    });

    // Draw background & path
    this.drawPath();

    // Create tower (CenterTower adds itself to scene in constructor)
    this.tower = new CenterTower(this, this.towerX, this.towerY);

    // Compute initial stats
    this.recomputeStats();

    // Launch UI scene
    this.scene.launch('UIScene', {
      economy: this.economy,
      getTowerState: () => this.tower.towerState as TowerState,
      getWave: () => this.currentWave,
      getEnemyCount: () => this.enemies.length,
      getMaxEnemies: () => MAX_ENEMIES_ON_SCREEN + (this.computedStats?.maxEnemiesBonus || 0),
      getActiveSynergies: () => this.activeSynergies,
      getShopAvailable: () => this.shopAvailable,
      onShopOpen: () => this.showShopPopup(),
      onTargetChange: (s: TargetingStrategy) => {
        this.tower.towerState.targeting = s;
        eventManager.emit(GameEvent.TARGETING_CHANGED, s);
      },
    });

    // Event listeners
    this.setupEvents();

    // Start initial skill selection
    this.initialSelectionRound = 1;
    this.time.delayedCall(500, () => this.showInitialSelection(1));
  }

  private setupEvents(): void {
    eventManager.removeAllListeners();
  }

  private drawPath(): void {
    this.pathGraphics = this.add.graphics();
    const g = this.pathGraphics;
    const corners = this.pathSystem.getCorners();

    // Path background
    g.fillStyle(COLORS.PATH_COLOR, 0.4);
    g.lineStyle(3, COLORS.PATH_BORDER, 0.6);
    const pathWidth = 40;
    // Draw path as thick rectangle outline
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % corners.length];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len * pathWidth / 2;
      const ny = dx / len * pathWidth / 2;
      g.fillRect(
        Math.min(a.x, b.x) - Math.abs(nx),
        Math.min(a.y, b.y) - Math.abs(ny),
        Math.abs(b.x - a.x) + Math.abs(nx) * 2 || pathWidth,
        Math.abs(b.y - a.y) + Math.abs(ny) * 2 || pathWidth,
      );
    }

    // Corner markers
    corners.forEach(c => {
      g.fillStyle(COLORS.PATH_BORDER, 0.8);
      g.fillCircle(c.x, c.y, 6);
    });

    // Direction arrows along path
    for (let p = 0; p < 1; p += 0.05) {
      const pos = this.pathSystem.getPositionAt(p);
      const angle = this.pathSystem.getDirectionAt(p);
      const arrow = this.add.graphics();
      arrow.fillStyle(COLORS.PATH_BORDER, 0.3);
      arrow.fillTriangle(-4, -3, 6, 0, -4, 3);
      arrow.setPosition(pos.x, pos.y);
      arrow.setRotation(angle);
    }
  }

  // ---- INITIAL SELECTION ----
  private showInitialSelection(round: 1 | 2): void {
    this.gamePaused = true;
    const cards = this.shopSystem.generateInitialCards(round);
    const selected: Set<number> = new Set();

    const container = this.add.container(0, 0);
    this.popupContainer = container;

    // Overlay
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75);
    container.add(overlay);

    // Title
    const title = this.add.text(GAME_WIDTH / 2, 80,
      round === 1 ? '시작 스킬 선택 (1/2)' : '시작 스킬 선택 (2/2)', {
      fontSize: '28px', fontFamily: FONT_FAMILY, color: '#ffd700',
    }).setOrigin(0.5);
    container.add(title);

    const subtitle = this.add.text(GAME_WIDTH / 2, 115, '4장 중 2장을 선택하세요', {
      fontSize: '16px', fontFamily: FONT_FAMILY, color: '#aaaacc',
    }).setOrigin(0.5);
    container.add(subtitle);

    // Cards
    const cardWidth = 200;
    const cardHeight = 260;
    const gap = 20;
    const totalWidth = cards.length * cardWidth + (cards.length - 1) * gap;
    const startX = (GAME_WIDTH - totalWidth) / 2 + cardWidth / 2;
    const cardY = GAME_HEIGHT / 2 - 20;

    const cardContainers: Phaser.GameObjects.Container[] = [];
    const checkMarks: Phaser.GameObjects.Text[] = [];

    cards.forEach((card, i) => {
      const x = startX + i * (cardWidth + gap);
      const cc = this.createSkillCard(x, cardY, cardWidth, cardHeight, card, false);
      container.add(cc);
      cardContainers.push(cc);

      const check = this.add.text(x, cardY - cardHeight / 2 + 20, '', {
        fontSize: '24px', fontFamily: FONT_FAMILY, color: '#44ff44',
      }).setOrigin(0.5);
      container.add(check);
      checkMarks.push(check);

      const hitArea = this.add.rectangle(x, cardY, cardWidth, cardHeight).setInteractive({ useHandCursor: true }).setAlpha(0.001);
      container.add(hitArea);
      hitArea.on('pointerdown', () => {
        if (selected.has(i)) {
          selected.delete(i);
          checkMarks[i].setText('');
          cc.setAlpha(1);
        } else if (selected.size < 2) {
          selected.add(i);
          checkMarks[i].setText('[v]');
          cc.setAlpha(1);
        }
        confirmBtn.setAlpha(selected.size === 2 ? 1 : 0.4);
      });
    });

    // Confirm button
    const confirmBtn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 80);
    const btnBg = this.add.graphics();
    btnBg.fillStyle(COLORS.BUTTON, 1);
    btnBg.fillRoundedRect(-80, -22, 160, 44, 8);
    confirmBtn.add(btnBg);
    const btnText = this.add.text(0, 0, '확인', {
      fontSize: '20px', fontFamily: FONT_FAMILY, color: '#ffffff',
    }).setOrigin(0.5);
    confirmBtn.add(btnText);
    const btnHit = this.add.rectangle(0, 0, 160, 44).setInteractive({ useHandCursor: true }).setAlpha(0.001);
    confirmBtn.add(btnHit);
    confirmBtn.setAlpha(0.4);
    container.add(confirmBtn);

    btnHit.on('pointerdown', () => {
      if (selected.size !== 2) return;
      soundManager.skillPurchase();
      // Add selected skills
      selected.forEach(idx => {
        const card = cards[idx];
        this.tower.addSkill(card.skillId);
        this.addOrb(card.skillId);
      });

      container.destroy();
      this.popupContainer = null;

      if (round === 1) {
        this.initialSelectionRound = 2;
        this.time.delayedCall(300, () => this.showInitialSelection(2));
      } else {
        this.initialSelectionRound = 3;
        this.gamePaused = false;
        this.recomputeStats();
        this.updateSynergies();
        eventManager.emit(GameEvent.INITIAL_SELECTION_DONE);
        eventManager.emit(GameEvent.GAME_START);
        this.startNextWave();
      }
    });
  }

  // ---- SHOP POPUP ----
  showShopPopup(): void {
    if (this.popupContainer) return;
    this.gamePaused = true;
    this.shopAvailable = false;
    soundManager.shopOpen();
    eventManager.emit(GameEvent.SHOP_OPENED);

    const cards = this.shopSystem.generateCards(
      this.currentWave, this.tower.towerState.level, this.tower.towerState.skills
    );

    const container = this.add.container(0, 0);
    this.popupContainer = container;

    // Overlay
    container.add(this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7));

    // Title
    container.add(this.add.text(GAME_WIDTH / 2, 50, '스킬 상점', {
      fontSize: '28px', fontFamily: FONT_FAMILY, color: '#ffd700',
    }).setOrigin(0.5));

    container.add(this.add.text(GAME_WIDTH / 2, 80, `보유 골드: ${this.economy.getGold()}G`, {
      fontSize: '16px', fontFamily: FONT_FAMILY, color: '#ffd700',
    }).setOrigin(0.5));

    // Skill cards
    const cardW = 200, cardH = 280, gap = 15;
    const totalW = cards.length * cardW + (cards.length - 1) * gap;
    const startX = (GAME_WIDTH - totalW) / 2 + cardW / 2;
    const cardY = 240;

    cards.forEach((card, i) => {
      const x = startX + i * (cardW + gap);
      const cc = this.createSkillCard(x, cardY, cardW, cardH, card, true);
      container.add(cc);

      const buyHit = this.add.rectangle(x, cardY + cardH / 2 - 25, cardW - 20, 36)
        .setInteractive({ useHandCursor: true }).setAlpha(0.001);
      container.add(buyHit);
      buyHit.on('pointerdown', () => {
        this.purchaseSkill(card);
        // Refresh shop
        container.destroy();
        this.popupContainer = null;
        this.showShopPopup();
      });
    });

    // EXP purchase section
    const expY = cardY + cardH / 2 + 60;
    container.add(this.add.text(GAME_WIDTH / 2, expY, '경험치 구매', {
      fontSize: '18px', fontFamily: FONT_FAMILY, color: '#8888ff',
    }).setOrigin(0.5));

    const expOpts = EXP_PURCHASE_OPTIONS;
    const expStartX = GAME_WIDTH / 2 - (expOpts.length * 150) / 2 + 75;
    expOpts.forEach((opt, i) => {
      const x = expStartX + i * 150;
      const y = expY + 45;

      const bg = this.add.graphics();
      bg.fillStyle(0x222244, 1);
      bg.fillRoundedRect(x - 60, y - 20, 120, 40, 6);
      bg.lineStyle(1, 0x4444aa);
      bg.strokeRoundedRect(x - 60, y - 20, 120, 40, 6);
      container.add(bg);

      const canAfford = this.economy.canAfford(opt.cost);
      container.add(this.add.text(x, y - 5, opt.label, {
        fontSize: '14px', fontFamily: FONT_FAMILY, color: canAfford ? '#aaaaff' : '#555566',
      }).setOrigin(0.5));
      container.add(this.add.text(x, y + 10, `${opt.cost}G`, {
        fontSize: '12px', fontFamily: FONT_FAMILY, color: canAfford ? '#ffd700' : '#555566',
      }).setOrigin(0.5));

      if (canAfford) {
        const hit = this.add.rectangle(x, y, 120, 40).setInteractive({ useHandCursor: true }).setAlpha(0.001);
        container.add(hit);
        hit.on('pointerdown', () => {
          if (this.economy.spendGold(opt.cost)) {
            const leveled = this.tower.addExp(opt.exp);
            soundManager.expGained();
            eventManager.emit(GameEvent.EXP_GAINED, opt.exp);
            this.vfx.expText(this.towerX, this.towerY - 30, opt.exp);
            if (leveled) {
              soundManager.levelUp();
              this.vfx.levelUpEffect(this.towerX, this.towerY);
              this.recomputeStats();
              eventManager.emit(GameEvent.LEVEL_UP, this.tower.towerState.level);
            }
            // Refresh
            container.destroy();
            this.popupContainer = null;
            this.showShopPopup();
          }
        });
      }
    });

    // Close button
    const closeY = GAME_HEIGHT - 50;
    const closeBg = this.add.graphics();
    closeBg.fillStyle(0x664444, 1);
    closeBg.fillRoundedRect(GAME_WIDTH / 2 - 80, closeY - 20, 160, 40, 8);
    container.add(closeBg);
    container.add(this.add.text(GAME_WIDTH / 2, closeY, '닫기', {
      fontSize: '18px', fontFamily: FONT_FAMILY, color: '#ffffff',
    }).setOrigin(0.5));
    const closeHit = this.add.rectangle(GAME_WIDTH / 2, closeY, 160, 40)
      .setInteractive({ useHandCursor: true }).setAlpha(0.001);
    container.add(closeHit);
    closeHit.on('pointerdown', () => {
      soundManager.shopClose();
      eventManager.emit(GameEvent.SHOP_CLOSED);
      container.destroy();
      this.popupContainer = null;
      this.gamePaused = false;
    });
  }

  private purchaseSkill(card: ShopCard): void {
    if (!this.economy.canAfford(card.cost)) return;

    const skillData = SKILLS[card.skillId];
    if (!skillData) return;

    // Check if slot is available or need to replace
    if (card.isUpgrade) {
      // Upgrade existing skill
      this.economy.spendGold(card.cost);
      this.tower.upgradeSkill(card.skillId);
      soundManager.skillPurchase();
      this.vfx.skillPurchaseEffect(this.towerX, this.towerY, skillData.color);
      eventManager.emit(GameEvent.SKILL_UPGRADED, card.skillId);
    } else if (this.tower.getSkillCount() >= MAX_SKILL_SLOTS) {
      // Need to replace - show replacement popup
      this.showReplaceSkillPopup(card);
      return;
    } else {
      // New skill
      this.economy.spendGold(card.cost);
      this.tower.addSkill(card.skillId);
      this.addOrb(card.skillId);
      soundManager.skillPurchase();
      this.vfx.skillPurchaseEffect(this.towerX, this.towerY, skillData.color);
      eventManager.emit(GameEvent.SKILL_PURCHASED, card.skillId);
    }

    this.recomputeStats();
    this.updateSynergies();
  }

  private showReplaceSkillPopup(newCard: ShopCard): void {
    if (this.popupContainer) {
      this.popupContainer.destroy();
      this.popupContainer = null;
    }

    const container = this.add.container(0, 0);
    this.popupContainer = container;

    container.add(this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8));

    const newSkill = SKILLS[newCard.skillId];
    container.add(this.add.text(GAME_WIDTH / 2, 60, '스킬 슬롯이 가득 찼습니다!', {
      fontSize: '24px', fontFamily: FONT_FAMILY, color: '#ff8844',
    }).setOrigin(0.5));

    container.add(this.add.text(GAME_WIDTH / 2, 100, `구매할 스킬: ${newSkill.name} (${newCard.cost}G)`, {
      fontSize: '16px', fontFamily: FONT_FAMILY, color: '#ffd700',
    }).setOrigin(0.5));

    container.add(this.add.text(GAME_WIDTH / 2, 135, '교체할 스킬을 선택하세요:', {
      fontSize: '16px', fontFamily: FONT_FAMILY, color: '#ccccee',
    }).setOrigin(0.5));

    // List owned skills (skip basic attack at index 0)
    const skills = this.tower.towerState.skills;
    skills.forEach((owned, i) => {
      if (i === 0) return; // Can't remove basic attack
      const sd = SKILLS[owned.id];
      if (!sd) return;
      const y = 175 + (i - 1) * 40;
      const colorStr = RARITY_COLOR_STRINGS[sd.rarity] || '#cccccc';

      container.add(this.add.text(GAME_WIDTH / 2 - 150, y, `${sd.name} Lv.${owned.level}`, {
        fontSize: '16px', fontFamily: FONT_FAMILY, color: colorStr,
      }).setOrigin(0, 0.5));

      const replaceBtn = this.add.graphics();
      replaceBtn.fillStyle(0x884444, 1);
      replaceBtn.fillRoundedRect(GAME_WIDTH / 2 + 80, y - 14, 80, 28, 4);
      container.add(replaceBtn);
      container.add(this.add.text(GAME_WIDTH / 2 + 120, y, '교체', {
        fontSize: '14px', fontFamily: FONT_FAMILY, color: '#ffffff',
      }).setOrigin(0.5));

      const hit = this.add.rectangle(GAME_WIDTH / 2 + 120, y, 80, 28)
        .setInteractive({ useHandCursor: true }).setAlpha(0.001);
      container.add(hit);
      hit.on('pointerdown', () => {
        if (!this.economy.canAfford(newCard.cost)) return;
        this.economy.spendGold(newCard.cost);
        this.removeOrb(owned.id);
        eventManager.emit(GameEvent.SKILL_REMOVED, owned.id);
        this.tower.removeSkill(owned.id);
        this.tower.addSkill(newCard.skillId);
        this.addOrb(newCard.skillId);
        soundManager.skillPurchase();
        eventManager.emit(GameEvent.SKILL_REPLACED, newCard.skillId, owned.id);
        this.recomputeStats();
        this.updateSynergies();
        container.destroy();
        this.popupContainer = null;
        this.showShopPopup();
      });
    });

    // Cancel button
    const cancelY = GAME_HEIGHT - 60;
    const cancelBg = this.add.graphics();
    cancelBg.fillStyle(0x444466, 1);
    cancelBg.fillRoundedRect(GAME_WIDTH / 2 - 60, cancelY - 16, 120, 32, 6);
    container.add(cancelBg);
    container.add(this.add.text(GAME_WIDTH / 2, cancelY, '취소', {
      fontSize: '16px', fontFamily: FONT_FAMILY, color: '#aaaacc',
    }).setOrigin(0.5));
    const cancelHit = this.add.rectangle(GAME_WIDTH / 2, cancelY, 120, 32)
      .setInteractive({ useHandCursor: true }).setAlpha(0.001);
    container.add(cancelHit);
    cancelHit.on('pointerdown', () => {
      container.destroy();
      this.popupContainer = null;
      this.showShopPopup();
    });
  }

  private createSkillCard(x: number, y: number, w: number, h: number, card: ShopCard, showBuy: boolean): Phaser.GameObjects.Container {
    const cc = this.add.container(x, y);
    const skillData = SKILLS[card.skillId];
    if (!skillData) return cc;

    const rarityColor = RARITY_COLORS[skillData.rarity] || 0xcccccc;
    const rarityStr = RARITY_COLOR_STRINGS[skillData.rarity] || '#cccccc';

    // Card background
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.SHOP_CARD_BG, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.lineStyle(2, rarityColor);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    cc.add(bg);

    // Rarity label
    const rarityNames: Record<string, string> = {
      normal: '노말', magic: '매직', rare: '레어',
      unique: '유니크', mythic: '미스틱', legend: '레전드'
    };
    cc.add(this.add.text(0, -h / 2 + 18, rarityNames[skillData.rarity] || '', {
      fontSize: '11px', fontFamily: FONT_FAMILY, color: rarityStr,
    }).setOrigin(0.5));

    // Skill icon (colored circle)
    const icon = this.add.graphics();
    icon.fillStyle(skillData.color, 1);
    icon.fillCircle(0, -h / 2 + 60, 18);
    icon.lineStyle(2, rarityColor);
    icon.strokeCircle(0, -h / 2 + 60, 18);
    cc.add(icon);

    // Name
    cc.add(this.add.text(0, -h / 2 + 95, skillData.name, {
      fontSize: '16px', fontFamily: FONT_FAMILY, color: '#ffffff',
    }).setOrigin(0.5));

    // Level
    if (card.isUpgrade) {
      cc.add(this.add.text(0, -h / 2 + 115, `Lv.${card.currentLevel} -> ${card.currentLevel + 1}`, {
        fontSize: '12px', fontFamily: FONT_FAMILY, color: '#88ff88',
      }).setOrigin(0.5));
    }

    // Description
    cc.add(this.add.text(0, -h / 2 + 140, skillData.description, {
      fontSize: '11px', fontFamily: FONT_FAMILY, color: '#aaaacc',
      wordWrap: { width: w - 20 }, align: 'center',
    }).setOrigin(0.5, 0));

    // Tags
    const tagStr = skillData.tags.join(' ');
    cc.add(this.add.text(0, h / 2 - 65, tagStr, {
      fontSize: '9px', fontFamily: FONT_FAMILY, color: '#666688',
    }).setOrigin(0.5));

    // Buy button / cost
    if (showBuy) {
      const canAfford = this.economy.canAfford(card.cost);
      const buyBg = this.add.graphics();
      buyBg.fillStyle(canAfford ? 0x446644 : 0x444444, 1);
      buyBg.fillRoundedRect(-w / 2 + 10, h / 2 - 45, w - 20, 36, 6);
      cc.add(buyBg);

      const label = card.isUpgrade ? `강화 ${card.cost}G` : `구매 ${card.cost}G`;
      cc.add(this.add.text(0, h / 2 - 27, label, {
        fontSize: '14px', fontFamily: FONT_FAMILY, color: canAfford ? '#ffd700' : '#666666',
      }).setOrigin(0.5));
    }

    return cc;
  }

  // ---- ORB MANAGEMENT ----
  private addOrb(skillId: SkillId): void {
    const skillData = SKILLS[skillId];
    if (!skillData) return;
    const total = this.orbs.length + 1;
    const orb = new SkillOrb(this, this.towerX, this.towerY, skillId, skillData.color, this.orbs.length, total);
    this.orbs.push(orb);
    // Rebalance orbit positions
    this.orbs.forEach((o, i) => o.setOrbitPosition(i, total));
  }

  private removeOrb(skillId: SkillId): void {
    const idx = this.orbs.findIndex(o => o.skillId === skillId);
    if (idx >= 0) {
      this.orbs[idx].destroy();
      this.orbs.splice(idx, 1);
      // Rebalance
      this.orbs.forEach((o, i) => o.setOrbitPosition(i, this.orbs.length));
    }
    this.orbCooldowns.delete(skillId);
  }

  // ---- GAME LOOP ----
  update(time: number, delta: number): void {
    if (this.gamePaused || this.isGameOver) return;
    const dt = delta / 1000;

    // Wave spawning
    this.waveSystem.update(dt);

    // Auto-start next wave
    if (!this.waveInProgress && this.currentWave > 0) {
      this.waveAutoStartTimer -= dt;
      if (this.waveAutoStartTimer <= 0) {
        this.startNextWave();
      }
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(dt);
      if (!enemy.isAlive()) {
        this.onEnemyKilled(enemy);
        enemy.destroy();
        this.enemies.splice(i, 1);
      }
    }

    // Tower auto-attack
    this.towerFireCooldown -= dt;
    if (this.towerFireCooldown <= 0 && this.enemies.length > 0) {
      this.towerAttack();
    }

    // Orb attacks
    this.updateOrbs(dt);

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const consumed = proj.update(dt, this.enemies);
      if (consumed || !proj.active) {
        this.projectiles.splice(i, 1);
      }
    }

    // Tower visual update
    this.tower.update(dt);

    // Game over check
    const maxEnemies = MAX_ENEMIES_ON_SCREEN + (this.computedStats?.maxEnemiesBonus || 0);
    if (this.enemies.length >= maxEnemies) {
      this.triggerGameOver();
    }

    // Shop availability check
    if (!this.shopAvailable) {
      if (this.shopSystem.shouldUnlockShop(
        this.currentWave, this.waveSystem.getTotalKills(),
        this.lastShopWave, this.lastShopKills
      )) {
        this.shopAvailable = true;
        eventManager.emit(GameEvent.SHOP_AVAILABLE);
      }
    }

    // Update registry for UIScene
    this.registry.set('towerState', this.tower.towerState);
    this.registry.set('currentWave', this.currentWave);
    this.registry.set('enemyCount', this.enemies.length);
    this.registry.set('gold', this.economy.getGold());
  }

  private startNextWave(): void {
    this.currentWave++;
    this.waveInProgress = true;
    const waveConfig = generateWave(this.currentWave);
    this.waveSystem.startWave(waveConfig);
    soundManager.waveStart();

    // Listen for wave complete via eventManager
    const onComplete = () => {
      this.waveInProgress = false;
      this.waveAutoStartTimer = 3;
      eventManager.off(GameEvent.WAVE_COMPLETE, onComplete);
    };
    eventManager.on(GameEvent.WAVE_COMPLETE, onComplete);
  }

  private spawnEnemy(type: string, hpMult: number, speedMult: number): void {
    const data = ENEMY_DATA[type as keyof typeof ENEMY_DATA];
    if (!data) return;

    const startProgress = Math.random(); // Random start position on path
    const pos = this.pathSystem.getPositionAt(startProgress);

    const state: EnemyState = {
      id: `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      dataId: data.id,
      hp: data.baseHp * hpMult,
      maxHp: data.baseHp * hpMult,
      speed: data.speed * speedMult,
      baseSpeed: data.speed * speedMult,
      armor: data.armor || 0,
      goldReward: data.goldReward,
      expReward: data.expReward,
      pathProgress: startProgress,
      laps: 0,
      slowed: 0, slowTimer: 0,
      poisonDps: 0, poisonTimer: 0,
      burnDps: 0, burnTimer: 0,
      bleedDps: 0, bleedTimer: 0,
      stunTimer: 0, freezeTimer: 0,
      chillStacks: 0, fearTimer: 0,
      x: pos.x, y: pos.y,
      size: data.size, color: data.color,
    };

    const enemy = new Enemy(this, state, this.pathSystem as any);
    this.enemies.push(enemy);
    eventManager.emit(GameEvent.ENEMY_SPAWNED, state);
  }

  private towerAttack(): void {
    if (!this.computedStats) return;
    const stats = this.computedStats;

    // Find target
    const enemyData = this.enemies.map(e => ({
      x: e.enemyState.x, y: e.enemyState.y,
      hp: e.enemyState.hp, maxHp: e.enemyState.maxHp,
      pathProgress: e.enemyState.pathProgress,
      id: e.enemyState.id,
    }));

    const targetId = this.combat.findTarget(
      this.towerX, this.towerY, stats.range, enemyData, this.tower.towerState.targeting
    );
    if (!targetId) return;

    const target = this.enemies.find(e => e.enemyState.id === targetId);
    if (!target) return;

    // Calculate damage
    const { damage, isCrit } = this.combat.calculateDamage(stats.damage, stats.critChance, stats.critDamage);

    // Execute check
    if (stats.executeThreshold > 0 && this.combat.shouldExecute(target.enemyState.hp / target.enemyState.maxHp, stats.executeThreshold)) {
      target.takeDamage(target.enemyState.maxHp * 10); // Instant kill
      soundManager.executeKill();
      this.vfx.floatingText(target.enemyState.x, target.enemyState.y - 20, '처형!', 0xff0000, 18);
      this.towerFireCooldown = 1 / stats.fireRate;
      return;
    }

    // Build projectile effects
    const effects: any = {};
    if (stats.splashRadius > 0) effects.splash = stats.splashRadius;
    if (stats.slowPercent > 0) effects.slow = { percent: stats.slowPercent, duration: stats.slowDuration };
    if (stats.fireDps > 0) effects.burn = { dps: stats.fireDps, duration: stats.dotDuration || 3 };
    if (stats.poisonDps > 0) effects.poison = { dps: stats.poisonDps, duration: stats.dotDuration || 3 };
    if (stats.bleedDps > 0) effects.bleed = { dps: stats.bleedDps, duration: stats.dotDuration || 4 };
    if (stats.stunDuration > 0) effects.stun = stats.stunDuration;
    if (stats.chainCount > 0) effects.chain = { count: stats.chainCount, damageRatio: stats.chainDamageRatio };
    if (stats.pierceCount > 0) effects.pierce = stats.pierceCount;
    if (stats.knockback > 0) effects.knockback = stats.knockback;
    if (isCrit) effects.isCrit = true;

    // Fire projectile(s)
    const shotCount = 1 + (stats.multiShot || 0);
    for (let s = 0; s < shotCount; s++) {
      const proj = new Projectile(
        this, this.towerX, this.towerY, target, damage, 400, COLORS.TOWER_BASE, effects
      );
      this.projectiles.push(proj);
    }

    soundManager.towerShoot();
    if (isCrit) soundManager.criticalHit();
    this.vfx.muzzleFlash(this.towerX, this.towerY, COLORS.TOWER_BASE);

    this.towerFireCooldown = 1 / stats.fireRate;
    eventManager.emit(GameEvent.PROJECTILE_FIRED);
  }

  private updateOrbs(dt: number): void {
    this.orbs.forEach(orb => {
      orb.update(dt, this.towerX, this.towerY);

      // Active orb attacks
      const skill = SKILLS[orb.skillId];
      if (!skill || skill.passive) return;

      const owned = this.tower.towerState.skills.find(s => s.id === orb.skillId);
      if (!owned) return;

      const cooldownKey = orb.skillId;
      let cooldown = this.orbCooldowns.get(cooldownKey) || 0;
      cooldown -= dt;

      if (cooldown <= 0 && this.enemies.length > 0) {
        this.orbAttack(orb, skill, owned.level);
        const fireRate = getSkillEffect(skill, owned.level, 'orbFireRate') || 1;
        cooldown = 1 / Math.max(0.1, fireRate);
        if (cooldown > 5) cooldown = 2; // Default 2s if no orbFireRate defined
      }

      this.orbCooldowns.set(cooldownKey, cooldown);
    });
  }

  private orbAttack(orb: SkillOrb, skill: typeof SKILLS[SkillId], level: number): void {
    // Find nearest enemy to orb
    let nearest: Enemy | null = null;
    let nearDist = Infinity;
    this.enemies.forEach(e => {
      const dx = e.enemyState.x - orb.x;
      const dy = e.enemyState.y - orb.y;
      const d = dx * dx + dy * dy;
      if (d < nearDist) { nearDist = d; nearest = e; }
    });
    if (!nearest) return;

    const orbRange = getSkillEffect(skill, level, 'orbRange') || 200;
    if (Math.sqrt(nearDist) > orbRange) return;

    const orbDamage = getSkillEffect(skill, level, 'orbDamage') || 10;
    const effects: any = {};

    // Skill-specific effects
    const fireDps = getSkillEffect(skill, level, 'fireDps');
    const poisonDps = getSkillEffect(skill, level, 'poisonDps');
    const bleedDps = getSkillEffect(skill, level, 'bleedDps');
    const slowPct = getSkillEffect(skill, level, 'slowPercent');
    const stunDur = getSkillEffect(skill, level, 'stunDuration');
    const splashR = getSkillEffect(skill, level, 'splashRadius');
    const chainCt = getSkillEffect(skill, level, 'chainCount');
    const knockb = getSkillEffect(skill, level, 'knockback');

    if (fireDps > 0) effects.burn = { dps: fireDps, duration: getSkillEffect(skill, level, 'dotDuration') || 3 };
    if (poisonDps > 0) effects.poison = { dps: poisonDps, duration: getSkillEffect(skill, level, 'dotDuration') || 3 };
    if (bleedDps > 0) effects.bleed = { dps: bleedDps, duration: getSkillEffect(skill, level, 'dotDuration') || 4 };
    if (slowPct > 0) effects.slow = { percent: slowPct, duration: getSkillEffect(skill, level, 'slowDuration') || 2 };
    if (stunDur > 0) effects.stun = stunDur;
    if (splashR > 0) effects.splash = splashR;
    if (chainCt > 0) effects.chain = { count: chainCt, damageRatio: getSkillEffect(skill, level, 'chainDamageRatio') || 0.7 };
    if (knockb > 0) effects.knockback = knockb;

    // Fire orb projectile (Projectile adds itself to scene)
    const proj = new Projectile(
      this, orb.x, orb.y, nearest as Enemy, orbDamage, 300, skill.color, effects
    );
    this.projectiles.push(proj);

    // Determine element for VFX/SFX
    const element = skill.tags.find(t => ['FIRE', 'ICE', 'LIGHTNING', 'NATURE', 'DARK'].includes(t as string));
    this.vfx.orbAttackEffect(orb.x, orb.y, (nearest as Enemy).enemyState.x, (nearest as Enemy).enemyState.y, skill.color, (element || 'default').toLowerCase());

    // Play element-specific sound
    switch (element) {
      case 'FIRE': soundManager.orbAttackFire(); break;
      case 'ICE': soundManager.orbAttackIce(); break;
      case 'LIGHTNING': soundManager.orbAttackLightning(); break;
      case 'NATURE': soundManager.orbAttackPoison(); break;
      case 'DARK': soundManager.orbAttackDark(); break;
      default: soundManager.towerShoot(); break;
    }
  }

  private onEnemyKilled(enemy: Enemy): void {
    const state = enemy.enemyState;

    // Gold reward
    const goldBonus = 1 + (this.computedStats?.goldBonusPercent || 0);
    const gold = Math.floor(state.goldReward * goldBonus);
    this.economy.addGold(gold);
    soundManager.goldEarned();
    this.vfx.goldText(state.x, state.y - 10, gold);

    // EXP reward
    const expBonus = 1 + (this.computedStats?.expBonusPercent || 0);
    const exp = Math.floor(state.expReward * expBonus);
    const leveled = this.tower.addExp(exp);
    eventManager.emit(GameEvent.EXP_GAINED, exp);
    this.vfx.expText(state.x, state.y - 25, exp);
    if (leveled) {
      soundManager.levelUp();
      this.vfx.levelUpEffect(this.towerX, this.towerY);
      this.recomputeStats();
      eventManager.emit(GameEvent.LEVEL_UP, this.tower.towerState.level);
    }

    // Kill count
    this.tower.towerState.kills++;
    this.waveSystem.onEnemyKilled();

    // Death VFX
    if (state.dataId === 'boss') {
      soundManager.bossDeath();
      this.vfx.bossDeathExplosion(state.x, state.y);
    } else {
      soundManager.enemyDeath();
      this.vfx.deathExplosion(state.x, state.y, state.color, state.size);
    }

    eventManager.emit(GameEvent.ENEMY_KILLED, state);
  }

  private triggerGameOver(): void {
    this.isGameOver = true;
    this.gamePaused = true;
    soundManager.gameOver();
    eventManager.emit(GameEvent.GAME_OVER);

    this.time.delayedCall(1500, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', {
        wave: this.currentWave,
        kills: this.tower.towerState.kills,
        level: this.tower.towerState.level,
        skills: [...this.tower.towerState.skills],
        gold: this.economy.getGold(),
      });
    });
  }

  // ---- STATS & SYNERGIES ----
  private recomputeStats(): void {
    this.computedStats = this.combat.getComputedStats(
      this.tower.towerState, this.tower.towerState.skills, SKILLS
    );
    // Update orb levels
    this.orbs.forEach(orb => {
      const owned = this.tower.towerState.skills.find(s => s.id === orb.skillId);
      if (owned) orb.setLevel(owned.level);
    });
  }

  private updateSynergies(): void {
    // Count tags from owned skills
    const tagCounts = new Map<string, number>();
    this.tower.towerState.skills.forEach(owned => {
      const skill = SKILLS[owned.id];
      if (!skill) return;
      skill.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    // Check synergies
    const newSynergies: ActiveSynergy[] = [];
    SYNERGIES.forEach(synergy => {
      const met = synergy.requirements.every(req => (tagCounts.get(req.tag) || 0) >= req.count);
      if (met) {
        newSynergies.push({
          id: synergy.id,
          name: synergy.name,
          description: synergy.description,
          tier: synergy.tier,
        });
      }
    });

    // Check for newly activated/deactivated synergies
    const oldIds = new Set(this.activeSynergies.map(s => s.id));
    const newIds = new Set(newSynergies.map(s => s.id));

    newSynergies.forEach(s => {
      if (!oldIds.has(s.id)) {
        soundManager.synergyActivate();
        this.vfx.synergyActivateEffect(this.towerX, this.towerY);
        this.vfx.floatingText(this.towerX, this.towerY - 60, `시너지: ${s.name}!`, 0xff88ff, 16);
        eventManager.emit(GameEvent.SYNERGY_ACTIVATED, s);
      }
    });

    this.activeSynergies.forEach(s => {
      if (!newIds.has(s.id)) {
        eventManager.emit(GameEvent.SYNERGY_DEACTIVATED, s);
      }
    });

    this.activeSynergies = newSynergies;
  }
}
