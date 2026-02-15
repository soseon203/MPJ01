import Phaser from 'phaser';
import {
  GameEvent, SkillId, OwnedSkill, ShopCard, EnemyState, TowerState,
  TargetingStrategy, ActiveSynergy, GameLayout, getSkillEffect, MAX_SKILL_SLOTS,
} from '../utils/types';
import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, FONT_FAMILY, UI_PANEL_WIDTH, PATH_MARGIN,
  MAX_ENEMIES_ON_SCREEN, EXP_TABLE, TOWER_LEVEL_STATS,
  SHOP_CARD_COUNT, RARITY_COLORS, RARITY_COLOR_STRINGS, ORB_ORBIT_RADIUS,
  WAVE_TIME_LIMIT,
} from '../utils/constants';
import { eventManager } from '../managers/EventManager';
import { SKILLS, SKILL_LIST, SKILL_EVOLUTION, EVOLUTION_LEVEL } from '../data/skillData';
import { SYNERGIES } from '../data/synergyData';
import { ENEMY_DATA } from '../data/enemyData';
import { generateWave } from '../data/waveData';
import { SquarePathSystem } from '../systems/SquarePathSystem';
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
  private orbCooldowns: Map<string, number> = new Map();
  private gamePaused = false;
  private isGameOver = false;
  private initialSelectionRound = 0;
  private computedStats!: ComputedTowerStats;
  private activeSynergies: ActiveSynergy[] = [];
  private waveElapsed = 0;
  private currentWave = 0;
  private waveInProgress = false;

  // Layout & Tower position
  private layout!: GameLayout;
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
    this.waveInProgress = false;

    // Read layout from registry
    this.layout = this.registry.get('gameLayout') as GameLayout;
    this.towerX = this.layout.towerX;
    this.towerY = this.layout.towerY;

    // Init systems
    const pathRect = this.layout.pathRect;
    this.pathSystem = new SquarePathSystem(pathRect);
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
      getTowerState: () => this.tower.towerState as TowerState,
      getWave: () => this.currentWave,
      getEnemyCount: () => this.enemies.length,
      getMaxEnemies: () => MAX_ENEMIES_ON_SCREEN + (this.computedStats?.maxEnemiesBonus || 0),
      getActiveSynergies: () => this.activeSynergies,
      getWaveTimeLeft: () => this.waveInProgress ? Math.max(0, WAVE_TIME_LIMIT - this.waveElapsed) : -1,
      getStats: () => ({
        damage: this.computedStats?.damage || 0,
        fireRate: this.computedStats?.fireRate || 0,
        range: this.computedStats?.range || 0,
        critChance: this.computedStats?.critChance || 0,
        dps: (this.computedStats?.damage || 0) * (this.computedStats?.fireRate || 0),
      }),
      onShopOpen: () => this.showShopPopup(),
      onFusionOpen: () => this.showFusionPopup(),
      onTargetChange: (s: TargetingStrategy) => {
        this.tower.towerState.targeting = s;
        eventManager.emit(GameEvent.TARGETING_CHANGED, s);
      },
    });

    // Event listeners
    this.setupEvents();

    // Start initial skill selection
    this.initialSelectionRound = 1;
    this.time.delayedCall(500, () => this.showInitialSelection());
  }

  private setupEvents(): void {
    eventManager.removeAllListeners();

    // Show damage numbers on enemy hit
    let lastHitSound = 0;
    eventManager.on(GameEvent.ENEMY_DAMAGED, (enemy: unknown, damage: unknown) => {
      const e = enemy as Enemy;
      const d = damage as number;
      if (e && e.enemyState) {
        // Throttled hit sound (max ~10/sec)
        const now = Date.now();
        if (now - lastHitSound > 100) {
          soundManager.enemyHit();
          lastHitSound = now;
        }
        const isCrit = d >= (this.computedStats?.damage || 0) * 1.5;
        this.vfx.damageNumber(e.enemyState.x, e.enemyState.y, d, isCrit);
      }
    });

    // Projectile hit effects
    eventManager.on(GameEvent.PROJECTILE_HIT, (proj: unknown) => {
      const p = proj as Projectile;
      if (!p) return;
      if (p.hasStun) soundManager.freezeSound();
      // Missile explosion VFX + sound
      if (p.isMissile) {
        this.vfx.missileExplosion(p.x, p.y);
        soundManager.missileExplosion();
      }
      // Splash ring VFX
      if (p.splashRadius > 0) {
        this.vfx.splashRing(p.x, p.y, p.splashRadius, p.projectileColor);
      }
    });
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
  private showInitialSelection(): void {
    this.gamePaused = true;
    soundManager.cardReveal();
    const cards = this.shopSystem.generateInitialCards();
    const MAX_REROLLS = 3;
    const rerollsLeft = cards.map(() => MAX_REROLLS);

    const container = this.add.container(0, 0);
    container.setDepth(1000);
    this.popupContainer = container;

    // Game area center (exclude UI panel)
    const gameAreaW = this.layout.gameAreaWidth;
    const cx = gameAreaW / 2;

    // Overlay
    const overlay = this.add.rectangle(cx, this.layout.gameAreaHeight / 2, gameAreaW, this.layout.gameAreaHeight, 0x000000, 0.75);
    container.add(overlay);

    // Title
    const title = this.add.text(cx, 80, '시작 스킬', {
      fontSize: '26px', fontFamily: FONT_FAMILY, color: '#ffd700',
    }).setOrigin(0.5);
    container.add(title);

    const subtitle = this.add.text(cx, 112, '4장 모두 획득! 새로고침으로 교체 가능', {
      fontSize: '15px', fontFamily: FONT_FAMILY, color: '#aaaacc',
    }).setOrigin(0.5);
    container.add(subtitle);

    // Cards (compact) — narrower in portrait to fit 720px
    const isPortrait = this.layout.mode === 'portrait';
    const cardWidth = isPortrait ? 164 : 170;
    const cardHeight = 230;
    const gap = isPortrait ? 10 : 14;
    const totalWidth = cards.length * cardWidth + (cards.length - 1) * gap;
    const startX = (gameAreaW - totalWidth) / 2 + cardWidth / 2;
    const cardY = this.layout.gameAreaHeight / 2 - 30;

    const cardContainers: Phaser.GameObjects.Container[] = [];

    // Reroll button builder
    const rerollBtnW = cardWidth - 10;
    const rerollBtnH = 24;
    const rerollY = cardY + cardHeight / 2 + 18;

    const rerollBgs: Phaser.GameObjects.Graphics[] = [];
    const rerollTexts: Phaser.GameObjects.Text[] = [];
    const rerollHits: Phaser.GameObjects.Rectangle[] = [];

    const rebuildCard = (i: number) => {
      const x = startX + i * (cardWidth + gap);
      // Destroy old card container
      cardContainers[i].destroy();
      // Create new card
      const cc = this.createSkillCard(x, cardY, cardWidth, cardHeight, cards[i]);
      container.add(cc);
      cardContainers[i] = cc;
      // Keep reroll buttons on top
      rerollBgs.forEach((_, j) => {
        container.bringToTop(rerollBgs[j]);
        container.bringToTop(rerollTexts[j]);
        container.bringToTop(rerollHits[j]);
      });
    };

    cards.forEach((card, i) => {
      const x = startX + i * (cardWidth + gap);
      const cc = this.createSkillCard(x, cardY, cardWidth, cardHeight, card);
      container.add(cc);
      cardContainers.push(cc);

      // Reroll button per card
      const rbg = this.add.graphics();
      rbg.fillStyle(0x334455, 1);
      rbg.fillRoundedRect(x - rerollBtnW / 2, rerollY - rerollBtnH / 2, rerollBtnW, rerollBtnH, 4);
      rbg.lineStyle(1, 0x5577aa);
      rbg.strokeRoundedRect(x - rerollBtnW / 2, rerollY - rerollBtnH / 2, rerollBtnW, rerollBtnH, 4);
      container.add(rbg);
      rerollBgs.push(rbg);

      const rtxt = this.add.text(x, rerollY, `새로고침 (${rerollsLeft[i]})`, {
        fontSize: '11px', fontFamily: FONT_FAMILY, color: '#88ccff',
      }).setOrigin(0.5);
      container.add(rtxt);
      rerollTexts.push(rtxt);

      const rhit = this.add.rectangle(x, rerollY, rerollBtnW, rerollBtnH).setInteractive({ useHandCursor: true }).setAlpha(0.001);
      container.add(rhit);
      rerollHits.push(rhit);

      rhit.on('pointerdown', () => {
        if (rerollsLeft[i] <= 0) return;

        // Collect all current skillIds except this card's
        const excludeIds = new Set(cards.map(c => c.skillId));
        const newCard = this.shopSystem.rerollInitialCard(excludeIds);
        if (!newCard) return;

        // Replace card
        cards[i] = newCard;
        rerollsLeft[i]--;
        soundManager.buttonClick();

        // Update reroll button
        if (rerollsLeft[i] <= 0) {
          rtxt.setText('새로고침 (0)');
          rtxt.setColor('#555566');
          rbg.clear();
          rbg.fillStyle(0x222233, 1);
          rbg.fillRoundedRect(x - rerollBtnW / 2, rerollY - rerollBtnH / 2, rerollBtnW, rerollBtnH, 4);
        } else {
          rtxt.setText(`새로고침 (${rerollsLeft[i]})`);
        }

        // Rebuild card visual
        rebuildCard(i);
      });
    });

    // Confirm button
    const confirmBtn = this.add.container(cx, this.layout.gameAreaHeight - 60);
    const btnBg = this.add.graphics();
    btnBg.fillStyle(COLORS.BUTTON, 1);
    btnBg.fillRoundedRect(-80, -22, 160, 44, 8);
    confirmBtn.add(btnBg);
    const btnText = this.add.text(0, 0, '시작', {
      fontSize: '20px', fontFamily: FONT_FAMILY, color: '#ffffff',
    }).setOrigin(0.5);
    confirmBtn.add(btnText);
    const btnHit = this.add.rectangle(0, 0, 160, 44).setInteractive({ useHandCursor: true }).setAlpha(0.001);
    confirmBtn.add(btnHit);
    container.add(confirmBtn);

    btnHit.on('pointerdown', () => {
      soundManager.skillPurchase();
      // Add all 4 cards
      cards.forEach(card => {
        if (this.tower.hasSkill(card.skillId)) {
          this.tower.upgradeSkill(card.skillId);
          const orb = this.orbs.find(o => o.skillId === card.skillId);
          if (orb) {
            const owned = this.tower.towerState.skills.find(s => s.id === card.skillId);
            if (owned) orb.setLevel(owned.level);
          }
        } else {
          this.tower.addSkill(card.skillId);
          this.addOrb(card.skillId);
        }
      });

      container.destroy();
      this.popupContainer = null;
      this.initialSelectionRound = 3;
      this.gamePaused = false;
      this.recomputeStats();
      this.updateSynergies();
      eventManager.emit(GameEvent.INITIAL_SELECTION_DONE);
      eventManager.emit(GameEvent.GAME_START);
      soundManager.gameStart();
      this.startNextWave();
    });
  }

  // ---- LEVEL-UP CARD SELECTION ----
  showShopPopup(): void {
    if (this.popupContainer) return;
    this.gamePaused = true;
    soundManager.cardReveal();

    const cards = this.shopSystem.generateCards(
      this.currentWave, this.tower.towerState.level, this.tower.towerState.skills
    );

    const container = this.add.container(0, 0);
    container.setDepth(1000);
    this.popupContainer = container;

    const gameAreaW = this.layout.gameAreaWidth;
    const cx = gameAreaW / 2;

    // Overlay
    container.add(this.add.rectangle(cx, this.layout.gameAreaHeight / 2, gameAreaW, this.layout.gameAreaHeight, 0x000000, 0.8));

    // Title
    const title = this.add.text(cx, 65, 'LEVEL UP!', {
      fontSize: '32px', fontFamily: FONT_FAMILY, color: '#ffdd44', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(title);
    this.tweens.add({ targets: title, alpha: { from: 0.7, to: 1 }, scaleX: { from: 0.95, to: 1.05 }, scaleY: { from: 0.95, to: 1.05 }, duration: 600, yoyo: true, repeat: -1 });

    container.add(this.add.text(cx, 105, `Lv.${this.tower.towerState.level} 달성! 스킬 1장을 선택하세요`, {
      fontSize: '15px', fontFamily: FONT_FAMILY, color: '#ccccee',
    }).setOrigin(0.5));

    // Cards — narrower in portrait
    const prt = this.layout.mode === 'portrait';
    const cardW = prt ? 164 : 170, cardH = 240, gap = prt ? 10 : 14;
    const totalW = cards.length * cardW + (cards.length - 1) * gap;
    const startX = (gameAreaW - totalW) / 2 + cardW / 2;
    const cardY = this.layout.gameAreaHeight / 2;

    // Reroll state (1회 새로고침)
    const MAX_REROLLS = 1;
    const rerollsLeft = cards.map(() => MAX_REROLLS);
    const cardContainers: Phaser.GameObjects.Container[] = [];
    const hitAreas: Phaser.GameObjects.Rectangle[] = [];

    const rebuildCard = (i: number) => {
      const x = startX + i * (cardW + gap);
      if (cardContainers[i]) cardContainers[i].destroy();
      if (hitAreas[i]) hitAreas[i].destroy();

      const cc = this.createSkillCard(x, cardY, cardW, cardH, cards[i]);
      container.add(cc);
      cardContainers[i] = cc;

      const hitArea = this.add.rectangle(x, cardY, cardW, cardH).setInteractive({ useHandCursor: true }).setAlpha(0.001);
      container.add(hitArea);
      hitAreas[i] = hitArea;
      hitArea.on('pointerdown', () => {
        soundManager.skillPurchase();
        this.acquireSkill(cards[i]);
        container.destroy();
        this.popupContainer = null;
        this.gamePaused = false;
      });
    };

    cards.forEach((card, i) => {
      rebuildCard(i);

      // Reroll button
      const x = startX + i * (cardW + gap);
      const rerollY = cardY + cardH / 2 + 18;
      const rerollBtnW = cardW - 20;
      const rerollBtnH = 24;

      const rbg = this.add.graphics();
      rbg.fillStyle(0x334455, 1);
      rbg.fillRoundedRect(x - rerollBtnW / 2, rerollY - rerollBtnH / 2, rerollBtnW, rerollBtnH, 4);
      container.add(rbg);

      const rtxt = this.add.text(x, rerollY, `새로고침 (${rerollsLeft[i]})`, {
        fontSize: '11px', fontFamily: FONT_FAMILY, color: '#88ccff',
      }).setOrigin(0.5);
      container.add(rtxt);

      const rhit = this.add.rectangle(x, rerollY, rerollBtnW, rerollBtnH).setInteractive({ useHandCursor: true }).setAlpha(0.001);
      container.add(rhit);

      rhit.on('pointerdown', () => {
        if (rerollsLeft[i] <= 0) return;

        const excludeIds = new Set(cards.map(c => c.skillId));
        const newCard = this.shopSystem.rerollShopCard(
          this.currentWave, this.tower.towerState.level,
          this.tower.towerState.skills, excludeIds
        );
        if (!newCard) return;

        cards[i] = newCard;
        rerollsLeft[i]--;
        soundManager.buttonClick();

        if (rerollsLeft[i] <= 0) {
          rtxt.setText('새로고침 (0)');
          rtxt.setColor('#555566');
          rbg.clear();
          rbg.fillStyle(0x222233, 1);
          rbg.fillRoundedRect(x - rerollBtnW / 2, rerollY - rerollBtnH / 2, rerollBtnW, rerollBtnH, 4);
        } else {
          rtxt.setText(`새로고침 (${rerollsLeft[i]})`);
        }

        rebuildCard(i);
      });
    });

    // Skip button
    const skipY = this.layout.gameAreaHeight - 45;
    const skipBg = this.add.graphics();
    skipBg.fillStyle(0x444466, 1);
    skipBg.fillRoundedRect(cx - 60, skipY - 16, 120, 32, 6);
    container.add(skipBg);
    container.add(this.add.text(cx, skipY, '건너뛰기', {
      fontSize: '14px', fontFamily: FONT_FAMILY, color: '#888899',
    }).setOrigin(0.5));
    const skipHit = this.add.rectangle(cx, skipY, 120, 32).setInteractive({ useHandCursor: true }).setAlpha(0.001);
    container.add(skipHit);
    skipHit.on('pointerdown', () => {
      container.destroy();
      this.popupContainer = null;
      this.gamePaused = false;
    });
  }

  private acquireSkill(card: ShopCard): void {
    const skillData = SKILLS[card.skillId];
    if (!skillData) return;

    // Evolution card: replace source skill with evolved version
    if (card.isEvolution) {
      const sourceId = this.findEvolutionSource(card.skillId);
      if (sourceId) {
        this.executeEvolution(sourceId, card.skillId);
        eventManager.emit(GameEvent.SKILL_PURCHASED, card.skillId);
        this.recomputeStats();
        this.updateSynergies();
        return;
      }
    }

    if (card.isUpgrade) {
      this.tower.upgradeSkill(card.skillId);
      this.vfx.skillPurchaseEffect(this.towerX, this.towerY, skillData.color);
      eventManager.emit(GameEvent.SKILL_UPGRADED, card.skillId);
      // Update existing orb level
      const orb = this.orbs.find(o => o.skillId === card.skillId);
      if (orb) {
        const owned = this.tower.towerState.skills.find(s => s.id === card.skillId);
        if (owned) orb.setLevel(owned.level);
      }
    } else if (this.tower.getSkillCount() >= MAX_SKILL_SLOTS - 1) {
      this.showReplaceSkillPopup(card);
      return;
    } else {
      this.tower.addSkill(card.skillId);
      this.addOrb(card.skillId);
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
    container.setDepth(1000);
    this.popupContainer = container;

    const gameAreaW = this.layout.gameAreaWidth;
    const cx = gameAreaW / 2;

    container.add(this.add.rectangle(cx, this.layout.gameAreaHeight / 2, gameAreaW, this.layout.gameAreaHeight, 0x000000, 0.8));

    const newSkill = SKILLS[newCard.skillId];
    container.add(this.add.text(cx, 60, '스킬 슬롯이 가득 찼습니다!', {
      fontSize: '22px', fontFamily: FONT_FAMILY, color: '#ff8844',
    }).setOrigin(0.5));

    container.add(this.add.text(cx, 95, `획득할 스킬: ${newSkill.name}`, {
      fontSize: '15px', fontFamily: FONT_FAMILY, color: '#ffd700',
    }).setOrigin(0.5));

    container.add(this.add.text(cx, 125, '교체할 스킬을 선택하세요:', {
      fontSize: '15px', fontFamily: FONT_FAMILY, color: '#ccccee',
    }).setOrigin(0.5));

    // List owned skills (skip basic attack at index 0)
    const skills = this.tower.towerState.skills;
    skills.forEach((owned, i) => {
      if (i === 0) return; // Can't remove basic attack
      const sd = SKILLS[owned.id];
      if (!sd) return;
      const y = 165 + (i - 1) * 38;
      const colorStr = RARITY_COLOR_STRINGS[sd.rarity] || '#cccccc';

      container.add(this.add.text(cx - 140, y, `${sd.name} Lv.${owned.level}`, {
        fontSize: '15px', fontFamily: FONT_FAMILY, color: colorStr,
      }).setOrigin(0, 0.5));

      const replaceBtn = this.add.graphics();
      replaceBtn.fillStyle(0x884444, 1);
      replaceBtn.fillRoundedRect(cx + 70, y - 14, 80, 28, 4);
      container.add(replaceBtn);
      container.add(this.add.text(cx + 110, y, '교체', {
        fontSize: '14px', fontFamily: FONT_FAMILY, color: '#ffffff',
      }).setOrigin(0.5));

      const hit = this.add.rectangle(cx + 110, y, 80, 28)
        .setInteractive({ useHandCursor: true }).setAlpha(0.001);
      container.add(hit);
      hit.on('pointerdown', () => {
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
        this.gamePaused = false;
      });
    });

    // Cancel button
    const cancelY = this.layout.gameAreaHeight - 60;
    const cancelBg = this.add.graphics();
    cancelBg.fillStyle(0x444466, 1);
    cancelBg.fillRoundedRect(cx - 60, cancelY - 16, 120, 32, 6);
    container.add(cancelBg);
    container.add(this.add.text(cx, cancelY, '취소', {
      fontSize: '16px', fontFamily: FONT_FAMILY, color: '#aaaacc',
    }).setOrigin(0.5));
    const cancelHit = this.add.rectangle(cx, cancelY, 120, 32)
      .setInteractive({ useHandCursor: true }).setAlpha(0.001);
    container.add(cancelHit);
    cancelHit.on('pointerdown', () => {
      container.destroy();
      this.popupContainer = null;
      this.gamePaused = false;
    });
  }

  private createSkillCard(x: number, y: number, w: number, h: number, card: ShopCard): Phaser.GameObjects.Container {
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

    // Level / Evolution label
    if (card.isEvolution) {
      const sourceId = this.findEvolutionSource(card.skillId);
      const sourceName = sourceId ? SKILLS[sourceId]?.name : '';
      cc.add(this.add.text(0, -h / 2 + 115, `${sourceName} → 진화`, {
        fontSize: '11px', fontFamily: FONT_FAMILY, color: '#ffdd00',
      }).setOrigin(0.5));
    } else if (card.isUpgrade) {
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

    return cc;
  }

  // ---- SKILL EVOLUTION ----

  /** Find which owned skill can evolve into the given target */
  private findEvolutionSource(targetId: SkillId): SkillId | null {
    for (const owned of this.tower.towerState.skills) {
      if (owned.level >= EVOLUTION_LEVEL && !owned.fusedFrom) {
        const candidates = SKILL_EVOLUTION[owned.id];
        if (candidates && candidates.includes(targetId)) {
          return owned.id;
        }
      }
    }
    return null;
  }

  private executeEvolution(fromId: SkillId, toId: SkillId): void {
    const fromSkill = SKILLS[fromId];
    const toSkill = SKILLS[toId];
    if (!fromSkill || !toSkill) return;

    // Remove old orb
    const orbIdx = this.orbs.findIndex(o => o.skillId === fromId);
    if (orbIdx >= 0) {
      this.orbs[orbIdx].destroy();
      this.orbs.splice(orbIdx, 1);
    }

    // Remove old skill, add evolved skill
    this.tower.removeSkill(fromId);
    this.tower.addSkill(toId);

    // Add new orb (if active skill)
    this.addOrb(toId);

    // VFX
    this.vfx.fusionEffect(this.towerX, this.towerY, [fromSkill.color, toSkill.color]);
    soundManager.skillPurchase();

    this.recomputeStats();
    this.updateSynergies();
    this.gamePaused = false;
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

    // Wave time limit — force next wave every 30 seconds
    this.waveElapsed += dt;
    if (this.waveElapsed >= WAVE_TIME_LIMIT) {
      this.startNextWave();
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

    // Shop is now triggered by level up and boss kill (not by update loop)

    // Update registry for UIScene
    this.registry.set('towerState', this.tower.towerState);
    this.registry.set('currentWave', this.currentWave);
    this.registry.set('enemyCount', this.enemies.length);
  }

  private startNextWave(): void {
    this.currentWave++;
    this.waveInProgress = true;
    this.waveElapsed = 0;
    const waveConfig = generateWave(this.currentWave);
    this.waveSystem.startWave(waveConfig);
    soundManager.waveStart();

    // Listen for wave complete via eventManager
    const onComplete = () => {
      this.waveInProgress = false;
      this.waveElapsed = WAVE_TIME_LIMIT - 3; // 3초 후 다음 웨이브
      soundManager.waveComplete();
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

  private updateOrbs(dt: number): void {
    this.orbs.forEach(orb => {
      orb.update(dt, this.towerX, this.towerY);

      const owned = this.tower.towerState.skills.find(s => s.id === orb.skillId);
      if (!owned) return;

      // Fused orbs are always active; normal orbs must be non-passive
      if (!owned.fusedFrom) {
        const skill = SKILLS[orb.skillId];
        if (!skill || skill.passive) return;
      }

      const cooldownKey = orb.skillId;
      let cooldown = this.orbCooldowns.get(cooldownKey) || 0;
      cooldown -= dt;

      if (cooldown <= 0 && this.enemies.length > 0) {
        if (owned.fusedFrom) {
          this.orbAttackFused(orb, owned);
          // Use fastest fire rate among component skills
          let bestFireRate = 1;
          for (const srcId of owned.fusedFrom) {
            const srcSkill = SKILLS[srcId];
            if (!srcSkill) continue;
            const fr = getSkillEffect(srcSkill, owned.level, 'orbFireRate');
            if (fr > bestFireRate) bestFireRate = fr;
          }
          const frMult = this.getOrbPassiveBonuses().fireRateMult;
          cooldown = 1 / Math.max(0.1, bestFireRate * frMult);
          if (cooldown > 5) cooldown = 2;
        } else {
          const skill = SKILLS[orb.skillId];
          this.orbAttack(orb, skill, owned.level);
          const fireRate = getSkillEffect(skill, owned.level, 'orbFireRate') || 1;
          const frMult = this.getOrbPassiveBonuses().fireRateMult;
          cooldown = 1 / Math.max(0.1, fireRate * frMult);
          if (cooldown > 5) cooldown = 2;
        }
      }

      this.orbCooldowns.set(cooldownKey, cooldown);
    });
  }

  /** Get passive bonus multipliers for orb attacks */
  private getOrbPassiveBonuses(): { dmgMult: number; rangeMult: number; fireRateMult: number; critChance: number; critDamage: number; fireDps: number; poisonDps: number; bleedDps: number; slowPct: number; stunDur: number; splashR: number; chainCt: number; knockb: number; multiShot: number; pierceCount: number; executeThreshold: number } {
    const ps = this.computedStats;
    if (!ps) return { dmgMult: 1, rangeMult: 1, fireRateMult: 1, critChance: 0, critDamage: 1, fireDps: 0, poisonDps: 0, bleedDps: 0, slowPct: 0, stunDur: 0, splashR: 0, chainCt: 0, knockb: 0, multiShot: 0, pierceCount: 0, executeThreshold: 0 };
    const base = TOWER_LEVEL_STATS[Math.min(Math.max(this.tower.towerState.level - 1, 0), TOWER_LEVEL_STATS.length - 1)];
    return {
      dmgMult: ps.damage / base.damage,
      rangeMult: ps.range / base.range,
      fireRateMult: ps.fireRate / base.fireRate,
      critChance: ps.critChance,
      critDamage: ps.critDamage,
      fireDps: ps.fireDps,
      poisonDps: ps.poisonDps,
      bleedDps: ps.bleedDps,
      slowPct: ps.slowPercent,
      stunDur: ps.stunDuration,
      splashR: ps.splashRadius,
      chainCt: ps.chainCount,
      knockb: ps.knockback,
      multiShot: ps.multiShot,
      pierceCount: ps.pierceCount,
      executeThreshold: ps.executeThreshold,
    };
  }

  private orbAttack(orb: SkillOrb, skill: typeof SKILLS[SkillId], level: number): void {
    // Passive bonuses applied to orb attacks
    const pb = this.getOrbPassiveBonuses();

    const orbRange = (getSkillEffect(skill, level, 'orbRange') || 200) * pb.rangeMult;
    let orbDamage = Math.round((getSkillEffect(skill, level, 'orbDamage') || 10) * pb.dmgMult);
    const missileCount = Math.max(1, Math.floor(getSkillEffect(skill, level, 'missileCount') || 1));

    // Crit from passives
    if (pb.critChance > 0 && Math.random() < pb.critChance) {
      orbDamage = Math.round(orbDamage * pb.critDamage);
    }

    // Build effects (orb's own + passive contributions)
    const effects: any = {};
    const fireDps = getSkillEffect(skill, level, 'fireDps') + pb.fireDps;
    const poisonDps = getSkillEffect(skill, level, 'poisonDps') + pb.poisonDps;
    const bleedDps = getSkillEffect(skill, level, 'bleedDps') + pb.bleedDps;
    const slowPct = getSkillEffect(skill, level, 'slowPercent') + pb.slowPct;
    const stunDur = getSkillEffect(skill, level, 'stunDuration') + pb.stunDur;
    const splashR = getSkillEffect(skill, level, 'splashRadius') + pb.splashR;
    const chainCt = getSkillEffect(skill, level, 'chainCount') + pb.chainCt;
    const knockb = getSkillEffect(skill, level, 'knockback') + pb.knockb;

    if (fireDps > 0) effects.burn = { dps: fireDps, duration: getSkillEffect(skill, level, 'dotDuration') || 3 };
    if (poisonDps > 0) effects.poison = { dps: poisonDps, duration: getSkillEffect(skill, level, 'dotDuration') || 3 };
    if (bleedDps > 0) effects.bleed = { dps: bleedDps, duration: getSkillEffect(skill, level, 'dotDuration') || 4 };
    if (slowPct > 0) effects.slow = { percent: slowPct, duration: getSkillEffect(skill, level, 'slowDuration') || 2 };
    if (stunDur > 0) effects.stun = stunDur;
    if (splashR > 0) effects.splash = splashR;
    if (chainCt > 0) effects.chain = { count: chainCt, damageRatio: getSkillEffect(skill, level, 'chainDamageRatio') || 0.7 };
    if (knockb > 0) effects.knockback = knockb;

    // Pierce support (skill's own + passive bonus)
    const pierceCt = getSkillEffect(skill, level, 'pierceCount') + pb.pierceCount;
    if (pierceCt > 0) effects.pierce = Math.floor(pierceCt);

    // Missile flag
    if (missileCount >= 1 && skill.id === 'homing_missile') effects.isMissile = true;

    // Area DOT strike: no projectile, instant strike + lingering damage zone
    const thunderDuration = getSkillEffect(skill, level, 'thunderDuration');
    if (thunderDuration > 0) {
      let nearest: Enemy | null = null;
      let nearDist = Infinity;
      this.enemies.forEach(e => {
        const dx = e.enemyState.x - orb.x;
        const dy = e.enemyState.y - orb.y;
        const d = dx * dx + dy * dy;
        if (d < nearDist) { nearDist = d; nearest = e; }
      });
      if (!nearest || Math.sqrt(nearDist) > orbRange) return;

      const thunderR = getSkillEffect(skill, level, 'thunderRadius') || 35;
      const ticks = Math.max(1, Math.floor(getSkillEffect(skill, level, 'thunderTicks') || 5));
      const strikeX = (nearest as Enemy).enemyState.x;
      const strikeY = (nearest as Enemy).enemyState.y;
      const tickInterval = (thunderDuration * 1000) / ticks;

      // Build area status effects for ticks
      const areaEffects: any = {};
      if (effects.burn) areaEffects.burn = effects.burn;
      if (effects.poison) areaEffects.poison = effects.poison;
      if (effects.bleed) areaEffects.bleed = effects.bleed;
      if (effects.slow) areaEffects.slow = effects.slow;
      if (effects.stun) areaEffects.stun = effects.stun;
      if (effects.knockback) areaEffects.knockback = effects.knockback;

      // Initial hit (full damage + status effects)
      this.enemies.forEach(e => {
        if (!e.isAlive()) return;
        const dx = e.enemyState.x - strikeX;
        const dy = e.enemyState.y - strikeY;
        if (Math.sqrt(dx * dx + dy * dy) <= thunderR) {
          e.takeDamage(orbDamage, areaEffects);
        }
      });

      // Lingering ticks (60% damage + refresh status effects)
      let ticksRemaining = ticks - 1;
      if (ticksRemaining > 0) {
        this.time.addEvent({
          delay: tickInterval,
          repeat: ticksRemaining - 1,
          callback: () => {
            this.enemies.forEach(e => {
              if (!e.isAlive()) return;
              const dx = e.enemyState.x - strikeX;
              const dy = e.enemyState.y - strikeY;
              if (Math.sqrt(dx * dx + dy * dy) <= thunderR) {
                e.takeDamage(Math.round(orbDamage * 0.6), areaEffects);
              }
            });
          },
        });
      }

      // Element-specific VFX & SFX
      const areaElement = skill.tags.find(t => ['FIRE', 'ICE', 'LIGHTNING', 'NATURE', 'DARK'].includes(t as string));
      switch (areaElement) {
        case 'FIRE':
          this.vfx.fireArea(strikeX, strikeY, thunderR, thunderDuration);
          soundManager.orbAreaFire();
          break;
        case 'ICE':
          this.vfx.iceArea(strikeX, strikeY, thunderR, thunderDuration);
          soundManager.orbAreaIce();
          break;
        case 'NATURE':
          this.vfx.poisonArea(strikeX, strikeY, thunderR, thunderDuration);
          soundManager.orbAreaPoison();
          break;
        case 'DARK':
          this.vfx.voidArea(strikeX, strikeY, thunderR, thunderDuration);
          soundManager.orbAreaVoid();
          break;
        default:
          this.vfx.thunderStrike(strikeX, strikeY, thunderR, thunderDuration);
          soundManager.orbAttackThunder();
          break;
      }
      return;
    }

    // Multi-missile: fire at different targets (multiShot adds extra volleys)
    if (missileCount > 1) {
      const totalMissiles = missileCount + (pb.multiShot || 0);
      const targets = this.findMultipleTargets(orb.x, orb.y, orbRange, totalMissiles);
      if (targets.length === 0) return;

      for (let i = 0; i < targets.length; i++) {
        this.time.delayedCall(i * 50, () => {
          if (!targets[i] || !targets[i].isAlive()) return;
          const proj = new Projectile(
            this, orb.x, orb.y, targets[i], orbDamage, 500, skill.color, { ...effects }
          );
          this.projectiles.push(proj);
        });
      }

      // Missile VFX & SFX
      this.vfx.missileBarrage(
        orb.x, orb.y,
        targets.map(t => ({ x: t.enemyState.x, y: t.enemyState.y }))
      );
      soundManager.orbAttackMissile(targets.length);
      return;
    }

    // Single target: find nearest
    let nearest: Enemy | null = null;
    let nearDist = Infinity;
    this.enemies.forEach(e => {
      const dx = e.enemyState.x - orb.x;
      const dy = e.enemyState.y - orb.y;
      const d = dx * dx + dy * dy;
      if (d < nearDist) { nearDist = d; nearest = e; }
    });
    if (!nearest) return;
    if (Math.sqrt(nearDist) > orbRange) return;

    // Execute check (instant kill low HP enemies)
    const target = nearest as Enemy;
    if (pb.executeThreshold > 0 && this.combat.shouldExecute(target.enemyState.hp / target.enemyState.maxHp, pb.executeThreshold)) {
      target.takeDamage(target.enemyState.maxHp * 10);
      soundManager.executeKill();
      this.vfx.floatingText(target.enemyState.x, target.enemyState.y - 20, '처형!', 0xff0000, 18);
      return;
    }

    // Fire orb projectile(s) — multiShot adds extra shots
    const shotCount = 1 + (pb.multiShot || 0);
    for (let s = 0; s < shotCount; s++) {
      const proj = new Projectile(
        this, orb.x, orb.y, nearest as Enemy, orbDamage, 500, skill.color, effects
      );
      this.projectiles.push(proj);
    }

    // Determine element for VFX/SFX
    const element = skill.tags.find(t => ['FIRE', 'ICE', 'LIGHTNING', 'NATURE', 'DARK'].includes(t as string));
    this.vfx.orbAttackEffect(orb.x, orb.y, (nearest as Enemy).enemyState.x, (nearest as Enemy).enemyState.y, skill.color, (element || 'default').toLowerCase(), skill.rarity);

    // Play element-specific sound
    switch (element) {
      case 'FIRE': soundManager.orbAttackFire(); break;
      case 'ICE': soundManager.orbAttackIce(); break;
      case 'LIGHTNING': soundManager.orbAttackLightning(); break;
      case 'NATURE': soundManager.orbAttackNature(); break;
      case 'DARK': soundManager.orbAttackDark(); break;
      default: soundManager.towerShoot(); break;
    }
  }

  private findMultipleTargets(fromX: number, fromY: number, range: number, count: number): Enemy[] {
    return this.enemies
      .filter(e => {
        if (!e.isAlive()) return false;
        const dx = e.enemyState.x - fromX;
        const dy = e.enemyState.y - fromY;
        return Math.sqrt(dx * dx + dy * dy) <= range;
      })
      .sort((a, b) => {
        const da = (a.enemyState.x - fromX) ** 2 + (a.enemyState.y - fromY) ** 2;
        const db = (b.enemyState.x - fromX) ** 2 + (b.enemyState.y - fromY) ** 2;
        return da - db;
      })
      .slice(0, count);
  }

  private onEnemyKilled(enemy: Enemy): void {
    const state = enemy.enemyState;

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
      // Level up → auto open shop popup
      this.time.delayedCall(300, () => {
        if (!this.popupContainer) {
          this.showShopPopup();
        }
      });
    }

    // Kill count
    this.tower.towerState.kills++;
    this.waveSystem.onEnemyKilled();

    // Death VFX
    if (state.dataId === 'boss') {
      soundManager.bossDeath();
      this.vfx.bossDeathExplosion(state.x, state.y);
      // Boss kill → special popup
      this.time.delayedCall(500, () => this.showBossRewardPopup());
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
      if (owned.fusedFrom) {
        // Fused skill: count tags from all source skills
        owned.fusedFrom.forEach(srcId => {
          const srcSkill = SKILLS[srcId];
          if (!srcSkill) return;
          srcSkill.tags.forEach(tag => {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          });
        });
      } else {
        const skill = SKILLS[owned.id];
        if (!skill) return;
        skill.tags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      }
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
          requirements: synergy.requirements,
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

  // ---- BOSS REWARD POPUP ----
  private showBossRewardPopup(): void {
    if (this.popupContainer) return;
    this.gamePaused = true;

    const container = this.add.container(0, 0);
    container.setDepth(1000);
    this.popupContainer = container;

    const gameAreaW = this.layout.gameAreaWidth;
    const cx = gameAreaW / 2;

    // Overlay
    container.add(this.add.rectangle(cx, this.layout.gameAreaHeight / 2, gameAreaW, this.layout.gameAreaHeight, 0x000000, 0.8));

    // Title with glow effect
    const title = this.add.text(cx, 65, 'BOSS CLEAR!', {
      fontSize: '32px', fontFamily: FONT_FAMILY, color: '#ff4444', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(title);
    this.tweens.add({ targets: title, alpha: { from: 0.7, to: 1 }, scaleX: { from: 0.95, to: 1.05 }, scaleY: { from: 0.95, to: 1.05 }, duration: 600, yoyo: true, repeat: -1 });

    container.add(this.add.text(cx, 105, `Wave ${this.currentWave} 보스 처치 보상`, {
      fontSize: '15px', fontFamily: FONT_FAMILY, color: '#ffaa44',
    }).setOrigin(0.5));

    // Generate rare+ cards
    const bossCards = this.shopSystem.generateBossCards(
      this.currentWave, this.tower.towerState.level, this.tower.towerState.skills
    );

    container.add(this.add.text(cx, 175, '특별 스킬 1장을 선택하세요!', {
      fontSize: '14px', fontFamily: FONT_FAMILY, color: '#ccccee',
    }).setOrigin(0.5));

    // Show cards (compact)
    const cardW = 170, cardH = 240, gap = 14;
    const totalW = bossCards.length * cardW + (bossCards.length - 1) * gap;
    const startX = (gameAreaW - totalW) / 2 + cardW / 2;
    const cardY = 330;

    bossCards.forEach((card, i) => {
      const x = startX + i * (cardW + gap);
      const cc = this.createSkillCard(x, cardY, cardW, cardH, card);
      container.add(cc);

      // FREE label
      const freeLabel = this.add.text(x, cardY + cardH / 2 - 30, '무료!', {
        fontSize: '16px', fontFamily: FONT_FAMILY, color: '#44ff44', fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(freeLabel);

      const hitArea = this.add.rectangle(x, cardY, cardW, cardH).setInteractive({ useHandCursor: true }).setAlpha(0.001);
      container.add(hitArea);
      hitArea.on('pointerdown', () => {
        soundManager.skillPurchase();
        const skillData = SKILLS[card.skillId];
        if (card.isUpgrade) {
          this.tower.upgradeSkill(card.skillId);
          eventManager.emit(GameEvent.SKILL_UPGRADED, card.skillId);
        } else if (this.tower.getSkillCount() >= MAX_SKILL_SLOTS - 1) {
          // Need replacement
          container.destroy();
          this.popupContainer = null;
          this.showReplaceSkillPopup(card);
          return;
        } else {
          this.tower.addSkill(card.skillId);
          this.addOrb(card.skillId);
          eventManager.emit(GameEvent.SKILL_PURCHASED, card.skillId);
        }
        if (skillData) this.vfx.skillPurchaseEffect(this.towerX, this.towerY, skillData.color);
        this.recomputeStats();
        this.updateSynergies();
        container.destroy();
        this.popupContainer = null;
        this.gamePaused = false;
      });
    });

    // Skip button
    const skipY = this.layout.gameAreaHeight - 45;
    const skipBg = this.add.graphics();
    skipBg.fillStyle(0x444466, 1);
    skipBg.fillRoundedRect(cx - 60, skipY - 16, 120, 32, 6);
    container.add(skipBg);
    container.add(this.add.text(cx, skipY, '건너뛰기', {
      fontSize: '14px', fontFamily: FONT_FAMILY, color: '#888899',
    }).setOrigin(0.5));
    const skipHit = this.add.rectangle(cx, skipY, 120, 32).setInteractive({ useHandCursor: true }).setAlpha(0.001);
    container.add(skipHit);
    skipHit.on('pointerdown', () => {
      container.destroy();
      this.popupContainer = null;
      this.gamePaused = false;
    });
  }

  // ---- FUSION SYSTEM ----

  showFusionPopup(): void {
    if (this.popupContainer) return;
    this.gamePaused = true;

    const container = this.add.container(0, 0);
    container.setDepth(1000);
    this.popupContainer = container;

    const gameAreaW = this.layout.gameAreaWidth;
    const cx = gameAreaW / 2;

    // Overlay
    container.add(this.add.rectangle(cx, this.layout.gameAreaHeight / 2, gameAreaW, this.layout.gameAreaHeight, 0x000000, 0.8));

    // Title
    container.add(this.add.text(cx, 50, '오브 합성', {
      fontSize: '26px', fontFamily: FONT_FAMILY, color: '#ffd700',
    }).setOrigin(0.5));

    container.add(this.add.text(cx, 82, '레벨 5 이상 오브 2~3개를 선택하세요', {
      fontSize: '14px', fontFamily: FONT_FAMILY, color: '#aaaacc',
    }).setOrigin(0.5));

    // Get eligible skills (level 5+, not fused, not basic attack)
    const eligible = this.tower.towerState.skills.filter(
      s => s.level >= 5 && !s.fusedFrom && s.id !== 'power_shot'
    );

    const selected = new Set<number>();
    const checkMarks: Phaser.GameObjects.Text[] = [];

    // Preview text
    const previewText = this.add.text(cx, this.layout.gameAreaHeight - 160, '', {
      fontSize: '12px', fontFamily: FONT_FAMILY, color: '#88ff88',
      align: 'center',
    }).setOrigin(0.5);
    container.add(previewText);

    // Confirm button
    const confirmBtn = this.add.container(cx, this.layout.gameAreaHeight - 105);
    const confirmBg = this.add.graphics();
    confirmBg.fillStyle(COLORS.BUTTON, 1);
    confirmBg.fillRoundedRect(-80, -22, 160, 44, 8);
    confirmBtn.add(confirmBg);
    const confirmText = this.add.text(0, 0, '합성', {
      fontSize: '20px', fontFamily: FONT_FAMILY, color: '#ffffff',
    }).setOrigin(0.5);
    confirmBtn.add(confirmText);
    const confirmHit = this.add.rectangle(0, 0, 160, 44).setInteractive({ useHandCursor: true }).setAlpha(0.001);
    confirmBtn.add(confirmHit);
    confirmBtn.setAlpha(0.4);
    container.add(confirmBtn);

    const updatePreview = () => {
      const count = selected.size;
      if (count < 2) {
        previewText.setText('');
        confirmBtn.setAlpha(0.4);
        return;
      }
      const bonus = count === 2 ? 1.5 : 2.0;
      const bonusLabel = count === 2 ? '+50%' : '+100%';
      const selectedSkills = [...selected].map(i => eligible[i]);
      const names = selectedSkills.map(s => SKILLS[s.id]?.name || s.id).join(' + ');
      previewText.setText(
        `${names}\n` +
        `합성 보너스: ${bonusLabel} 효과 증폭\n` +
        `결과: 모든 효과를 합친 융합 오브 1개`
      );
      confirmBtn.setAlpha(1);
    };

    // Skill cards
    const cardW = 150, cardH = 180, gap = 12;
    const totalW = eligible.length * cardW + (eligible.length - 1) * gap;
    const startX = Math.max(cardW / 2 + 10, (gameAreaW - totalW) / 2 + cardW / 2);
    const cardY = this.layout.gameAreaHeight / 2 - 50;

    eligible.forEach((owned, i) => {
      const sd = SKILLS[owned.id];
      if (!sd) return;
      const x = startX + i * (cardW + gap);
      const rarityColor = RARITY_COLORS[sd.rarity] || 0xcccccc;
      const rarityStr = RARITY_COLOR_STRINGS[sd.rarity] || '#cccccc';

      // Card bg
      const bg = this.add.graphics();
      bg.fillStyle(COLORS.SHOP_CARD_BG, 1);
      bg.fillRoundedRect(x - cardW / 2, cardY - cardH / 2, cardW, cardH, 8);
      bg.lineStyle(2, rarityColor);
      bg.strokeRoundedRect(x - cardW / 2, cardY - cardH / 2, cardW, cardH, 8);
      container.add(bg);

      // Skill icon
      const icon = this.add.graphics();
      icon.fillStyle(sd.color, 1);
      icon.fillCircle(x, cardY - cardH / 2 + 40, 16);
      icon.lineStyle(2, rarityColor);
      icon.strokeCircle(x, cardY - cardH / 2 + 40, 16);
      container.add(icon);

      // Name
      container.add(this.add.text(x, cardY - cardH / 2 + 70, sd.name, {
        fontSize: '14px', fontFamily: FONT_FAMILY, color: '#ffffff',
      }).setOrigin(0.5));

      // Level
      container.add(this.add.text(x, cardY - cardH / 2 + 90, `Lv.${owned.level}`, {
        fontSize: '12px', fontFamily: FONT_FAMILY, color: rarityStr,
      }).setOrigin(0.5));

      // Tags
      container.add(this.add.text(x, cardY - cardH / 2 + 110, sd.tags.join(' '), {
        fontSize: '9px', fontFamily: FONT_FAMILY, color: '#666688',
        wordWrap: { width: cardW - 10 }, align: 'center',
      }).setOrigin(0.5));

      // Description
      container.add(this.add.text(x, cardY - cardH / 2 + 135, sd.description, {
        fontSize: '10px', fontFamily: FONT_FAMILY, color: '#8888aa',
        wordWrap: { width: cardW - 16 }, align: 'center',
      }).setOrigin(0.5, 0));

      // Checkmark
      const check = this.add.text(x, cardY - cardH / 2 + 16, '', {
        fontSize: '20px', fontFamily: FONT_FAMILY, color: '#44ff44',
      }).setOrigin(0.5);
      container.add(check);
      checkMarks.push(check);

      // Hit area
      const hitArea = this.add.rectangle(x, cardY, cardW, cardH).setInteractive({ useHandCursor: true }).setAlpha(0.001);
      container.add(hitArea);
      hitArea.on('pointerdown', () => {
        if (selected.has(i)) {
          selected.delete(i);
          checkMarks[i].setText('');
        } else if (selected.size < 3) {
          selected.add(i);
          checkMarks[i].setText('[v]');
        }
        updatePreview();
      });
    });

    // Confirm action
    confirmHit.on('pointerdown', () => {
      if (selected.size < 2 || selected.size > 3) return;
      const selectedSkills = [...selected].map(i => eligible[i]);
      this.executeFusion(selectedSkills);
      container.destroy();
      this.popupContainer = null;
      this.gamePaused = false;
    });

    // Cancel button
    const cancelY = this.layout.gameAreaHeight - 55;
    const cancelBg = this.add.graphics();
    cancelBg.fillStyle(0x444466, 1);
    cancelBg.fillRoundedRect(cx - 60, cancelY - 16, 120, 32, 6);
    container.add(cancelBg);
    container.add(this.add.text(cx, cancelY, '취소', {
      fontSize: '16px', fontFamily: FONT_FAMILY, color: '#aaaacc',
    }).setOrigin(0.5));
    const cancelHit = this.add.rectangle(cx, cancelY, 120, 32).setInteractive({ useHandCursor: true }).setAlpha(0.001);
    container.add(cancelHit);
    cancelHit.on('pointerdown', () => {
      container.destroy();
      this.popupContainer = null;
      this.gamePaused = false;
    });
  }

  private executeFusion(selectedSkills: OwnedSkill[]): void {
    const primaryId = selectedSkills[0].id;
    const consumedIds = selectedSkills.slice(1).map(s => s.id);
    const bonus = selectedSkills.length === 2 ? 1.5 : 2.0;

    // Collect colors for VFX before removing
    const colors = selectedSkills.map(s => SKILLS[s.id]?.color || 0xffffff);

    // Remove all source orbs
    selectedSkills.forEach(s => this.removeOrb(s.id));

    // Fuse in tower
    const fusedSkill = this.tower.fuseSkills(primaryId, consumedIds, bonus);
    if (!fusedSkill) return;

    // Add new fused orb
    this.addFusedOrb(fusedSkill, colors);

    // VFX
    this.vfx.fusionEffect(this.towerX, this.towerY, colors);
    soundManager.synergyActivate();

    // Recompute
    this.recomputeStats();
    this.updateSynergies();
  }

  private addFusedOrb(owned: OwnedSkill, colors: number[]): void {
    const primarySkill = SKILLS[owned.id];
    if (!primarySkill) return;
    const total = this.orbs.length + 1;
    const orb = new SkillOrb(this, this.towerX, this.towerY, owned.id, primarySkill.color, this.orbs.length, total);
    orb.setLevel(owned.level);
    orb.setFusedVisual(colors);
    this.orbs.push(orb);
    // Rebalance orbit positions
    this.orbs.forEach((o, i) => o.setOrbitPosition(i, total));
  }

  /** Fused orb attack: aggregates all source skill effects into one combined projectile */
  private orbAttackFused(orb: SkillOrb, owned: OwnedSkill): void {
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

    // Aggregate effects from all source skills
    const fusedFrom = owned.fusedFrom!;
    let orbDamage = 0;
    let orbRange = 0;
    let fireDps = 0;
    let poisonDps = 0;
    let bleedDps = 0;
    let slowPct = 0;
    let stunDur = 0;
    let splashR = 0;
    let chainCt = 0;
    let knockb = 0;
    let bestChainRatio = 0.7;
    let bestDotDuration = 3;
    let bestSlowDuration = 2;

    for (const srcId of fusedFrom) {
      const srcSkill = SKILLS[srcId];
      if (!srcSkill) continue;
      orbDamage += getSkillEffect(srcSkill, owned.level, 'orbDamage');
      const range = getSkillEffect(srcSkill, owned.level, 'orbRange');
      if (range > orbRange) orbRange = range;
      fireDps += getSkillEffect(srcSkill, owned.level, 'fireDps');
      poisonDps += getSkillEffect(srcSkill, owned.level, 'poisonDps');
      bleedDps += getSkillEffect(srcSkill, owned.level, 'bleedDps');
      slowPct += getSkillEffect(srcSkill, owned.level, 'slowPercent');
      stunDur += getSkillEffect(srcSkill, owned.level, 'stunDuration');
      splashR += getSkillEffect(srcSkill, owned.level, 'splashRadius');
      chainCt += getSkillEffect(srcSkill, owned.level, 'chainCount');
      knockb += getSkillEffect(srcSkill, owned.level, 'knockback');
      const cr = getSkillEffect(srcSkill, owned.level, 'chainDamageRatio');
      if (cr > bestChainRatio) bestChainRatio = cr;
      const dd = getSkillEffect(srcSkill, owned.level, 'dotDuration');
      if (dd > bestDotDuration) bestDotDuration = dd;
      const sd = getSkillEffect(srcSkill, owned.level, 'slowDuration');
      if (sd > bestSlowDuration) bestSlowDuration = sd;
    }

    // Apply fusion bonus + passive bonuses
    const bonus = owned.fusionBonus || 1;
    const pb = this.getOrbPassiveBonuses();
    orbDamage = Math.max(10, orbDamage * bonus * pb.dmgMult);
    orbRange = Math.max(200, orbRange * pb.rangeMult);

    // Add passive contributions
    fireDps += pb.fireDps;
    poisonDps += pb.poisonDps;
    bleedDps += pb.bleedDps;
    slowPct += pb.slowPct;
    stunDur += pb.stunDur;
    splashR += pb.splashR;
    chainCt = Math.floor(chainCt + pb.chainCt);
    knockb += pb.knockb;
    fireDps *= bonus;
    poisonDps *= bonus;
    bleedDps *= bonus;
    slowPct *= bonus;
    stunDur *= bonus;
    splashR *= bonus;
    chainCt = Math.floor(chainCt * bonus);
    knockb *= bonus;

    if (Math.sqrt(nearDist) > orbRange) return;

    // Execute check (instant kill low HP enemies)
    const fusedTarget = nearest as Enemy;
    if (pb.executeThreshold > 0 && this.combat.shouldExecute(fusedTarget.enemyState.hp / fusedTarget.enemyState.maxHp, pb.executeThreshold)) {
      fusedTarget.takeDamage(fusedTarget.enemyState.maxHp * 10);
      soundManager.executeKill();
      this.vfx.floatingText(fusedTarget.enemyState.x, fusedTarget.enemyState.y - 20, '처형!', 0xff0000, 18);
      return;
    }

    // Crit from passives
    if (pb.critChance > 0 && Math.random() < pb.critChance) {
      orbDamage = Math.round(orbDamage * pb.critDamage);
    }

    const effects: any = {};
    if (fireDps > 0) effects.burn = { dps: fireDps, duration: bestDotDuration };
    if (poisonDps > 0) effects.poison = { dps: poisonDps, duration: bestDotDuration };
    if (bleedDps > 0) effects.bleed = { dps: bleedDps, duration: bestDotDuration };
    if (slowPct > 0) effects.slow = { percent: slowPct, duration: bestSlowDuration };
    if (stunDur > 0) effects.stun = stunDur;
    if (splashR > 0) effects.splash = splashR;
    if (chainCt > 0) effects.chain = { count: chainCt, damageRatio: bestChainRatio };
    if (knockb > 0) effects.knockback = knockb;

    // Use primary skill color
    const primarySkill = SKILLS[owned.id];
    const color = primarySkill?.color || 0xffffff;

    // Fire combined projectile(s) — multiShot adds extra shots
    const shotCount = 1 + (pb.multiShot || 0);
    for (let s = 0; s < shotCount; s++) {
      const proj = new Projectile(
        this, orb.x, orb.y, nearest as Enemy, orbDamage, 500, color, effects
      );
      this.projectiles.push(proj);
    }

    // VFX: fire all element effects sequentially for combined visual
    const elements: string[] = [];
    for (const srcId of fusedFrom) {
      const srcSkill = SKILLS[srcId];
      if (!srcSkill) continue;
      const elem = srcSkill.tags.find(t => ['FIRE', 'ICE', 'LIGHTNING', 'NATURE', 'DARK'].includes(t as string));
      if (elem && !elements.includes(elem as string)) elements.push(elem as string);
    }
    const primaryElem = elements[0] || 'default';
    this.vfx.orbAttackEffect(orb.x, orb.y, (nearest as Enemy).enemyState.x, (nearest as Enemy).enemyState.y, color, primaryElem.toLowerCase(), primarySkill?.rarity || 'normal');

    // Play sound for primary element
    switch (primaryElem) {
      case 'FIRE': soundManager.orbAttackFire(); break;
      case 'ICE': soundManager.orbAttackIce(); break;
      case 'LIGHTNING': soundManager.orbAttackLightning(); break;
      case 'NATURE': soundManager.orbAttackNature(); break;
      case 'DARK': soundManager.orbAttackDark(); break;
      default: soundManager.towerShoot(); break;
    }
  }
}
