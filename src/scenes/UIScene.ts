import Phaser from 'phaser';
import {
  GameEvent, TowerState, TargetingStrategy, ActiveSynergy, OwnedSkill, TagRequirement,
  GameLayout, SkillData, getSkillEffect,
} from '../utils/types';
import {
  COLORS, FONT_FAMILY,
  RARITY_COLORS, RARITY_COLOR_STRINGS, EXP_TABLE,
  MAX_ENEMIES_ON_SCREEN,
} from '../utils/constants';
import { SKILLS } from '../data/skillData';
import { eventManager } from '../managers/EventManager';
import { soundManager } from '../managers/SoundManager';

interface TowerStats {
  damage: number;
  fireRate: number;
  range: number;
  critChance: number;
  dps: number;
}

interface UISceneData {
  getTowerState: () => TowerState;
  getWave: () => number;
  getEnemyCount: () => number;
  getMaxEnemies: () => number;
  getActiveSynergies: () => ActiveSynergy[];
  getWaveTimeLeft: () => number;
  getStats: () => TowerStats;
  onShopOpen: () => void;
  onFusionOpen: () => void;
  onTargetChange: (s: TargetingStrategy) => void;
}

const TARGETING_OPTIONS: TargetingStrategy[] = ['first', 'last', 'closest', 'strongest'];
const TARGETING_LABELS: Record<TargetingStrategy, string> = {
  first: '선두', last: '후미', closest: '최근접', strongest: '최강',
};

/* ============================================================
 *  Tooltip helpers
 * ============================================================ */
const EFFECT_LABELS: Record<string, string> = {
  damagePercent: '데미지',
  fireRatePercent: '공격속도',
  orbDamage: '오브 데미지',
  orbFireRate: '발사 속도',
  orbRange: '오브 사거리',
  fireDps: '화상 DPS',
  poisonDps: '독 DPS',
  bleedDps: '출혈 DPS',
  dotDuration: 'DOT 지속',
  slowPercent: '감속',
  slowDuration: '감속 지속',
  stunDuration: '기절 지속',
  splashRadius: '범위 반경',
  chainCount: '연쇄 횟수',
  chainDamageRatio: '연쇄 비율',
  pierceCount: '관통 횟수',
  knockback: '넉백',
  critChance: '치명타 확률',
  critDamage: '치명타 배율',
  expBonusPercent: '경험치 보너스',
  flatDamage: '추가 데미지',
  flatFireRate: '추가 공격속도',
  rangePercent: '사거리',
  multiShot: '멀티샷',
  executeThreshold: '즉사 기준',
  thunderDuration: '지대 지속',
  thunderRadius: '지대 반경',
  thunderTicks: '지대 틱수',
  missileCount: '미사일 수',
};

const RARITY_LABELS: Record<string, string> = {
  normal: '노말', magic: '매직', rare: '레어',
  unique: '유니크', mythic: '미시크', legend: '레전드',
};

function formatEffectValue(key: string, value: number): string {
  if (key.endsWith('Percent') || key === 'critChance' || key === 'executeThreshold') {
    return `${(value * 100).toFixed(0)}%`;
  }
  if (key.endsWith('Duration')) {
    return `${value.toFixed(1)}초`;
  }
  if (key === 'orbFireRate' || key === 'flatFireRate') {
    return `${value.toFixed(2)}/s`;
  }
  if (key === 'chainDamageRatio' || key === 'critDamage') {
    return `x${value.toFixed(2)}`;
  }
  if (['chainCount', 'pierceCount', 'multiShot', 'thunderTicks', 'missileCount'].includes(key)) {
    return `${Math.floor(value)}`;
  }
  return value.toFixed(1);
}

export class UIScene extends Phaser.Scene {
  private data_!: UISceneData;
  private layout!: GameLayout;

  // Dynamic layout values (set once in create)
  private panelX = 0;
  private panelW = 0;
  private leftX = 0;
  private cx = 0;
  private expBarX = 0;
  private expBarW = 0;
  private expBarY = 0;

  // Scroll state
  private scrollContainer!: Phaser.GameObjects.Container;
  private scrollOffset = 0;
  private scrollStartY = 0;
  private scrollHeight = 0;
  private contentHeight = 0;

  // UI elements
  private waveText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private expBarBg!: Phaser.GameObjects.Graphics;
  private expBarFill!: Phaser.GameObjects.Graphics;
  private expText!: Phaser.GameObjects.Text;
  private enemyCountText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private skillContainer!: Phaser.GameObjects.Container;
  private synergyContainer!: Phaser.GameObjects.Container;
  private targetingText!: Phaser.GameObjects.Text;
  private currentTargetIdx = 0;
  private fusionContainer!: Phaser.GameObjects.Container;
  private tooltipContainer!: Phaser.GameObjects.Container;
  private waveTimerText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UIScene' });
  }

  init(data: UISceneData): void {
    this.data_ = data;
  }

  create(): void {
    this.layout = this.registry.get('gameLayout') as GameLayout;

    if (this.layout.mode === 'portrait') {
      this.createPortraitUI();
    } else {
      this.createLandscapeUI();
    }
  }

  /* ================================================================
   *  LANDSCAPE UI — 240px right panel
   * ================================================================ */
  private createLandscapeUI(): void {
    const PANEL_X = this.layout.uiPanelX;
    const panelW = this.layout.uiPanelWidth;

    this.panelX = PANEL_X;
    this.panelW = panelW;
    this.leftX = PANEL_X + 12;
    this.cx = PANEL_X + panelW / 2;

    const leftX = this.leftX;
    const cx = this.cx;
    const barW = panelW - 24;

    // Panel background
    const panelBg = this.add.graphics();
    panelBg.fillStyle(COLORS.UI_BG, 0.95);
    panelBg.fillRect(PANEL_X, 0, panelW, this.layout.gameHeight);
    panelBg.lineStyle(2, COLORS.UI_BORDER);
    panelBg.lineBetween(PANEL_X, 0, PANEL_X, this.layout.gameHeight);

    let y = 15;

    // ---- WAVE ----
    this.add.text(cx, y, '웨이브', {
      fontSize: '12px', fontFamily: FONT_FAMILY, color: '#888899',
    }).setOrigin(0.5);
    y += 18;
    this.waveText = this.add.text(cx, y, '0', {
      fontSize: '28px', fontFamily: FONT_FAMILY, color: '#88aaff',
    }).setOrigin(0.5);
    y += 28;

    // ---- WAVE TIMER ----
    this.waveTimerText = this.add.text(cx, y, '', {
      fontSize: '12px', fontFamily: FONT_FAMILY, color: '#aaaacc',
    }).setOrigin(0.5);
    y += 18;

    // ---- ENEMY COUNT ----
    this.enemyCountText = this.add.text(cx, y, '적: 0/50', {
      fontSize: '14px', fontFamily: FONT_FAMILY, color: '#ff8888',
    }).setOrigin(0.5);
    y += 25;

    // ---- DIVIDER ----
    this.drawDivider(y);
    y += 10;

    // ---- ORB BONUS STATS ----
    this.add.text(cx, y, '패시브 보너스', {
      fontSize: '12px', fontFamily: FONT_FAMILY, color: '#888899',
    }).setOrigin(0.5);
    y += 16;
    this.statsText = this.add.text(leftX, y, '', {
      fontSize: '11px', fontFamily: FONT_FAMILY, color: '#aabbcc',
      lineSpacing: 4,
    });
    y += 78;

    // ---- LEVEL + EXP ----
    this.levelText = this.add.text(leftX, y, 'Lv.1', {
      fontSize: '13px', fontFamily: FONT_FAMILY, color: '#ffdd44',
    });
    y += 18;

    this.expBarY = y;
    this.expBarX = leftX;
    this.expBarW = barW;
    this.expBarBg = this.add.graphics();
    this.expBarBg.fillStyle(COLORS.EXP_BAR_BG, 1);
    this.expBarBg.fillRoundedRect(leftX, y, barW, 14, 4);
    this.expBarBg.lineStyle(1, 0x4444aa, 0.4);
    this.expBarBg.strokeRoundedRect(leftX, y, barW, 14, 4);
    this.expBarFill = this.add.graphics();
    this.expText = this.add.text(cx, y + 7, 'EXP 0/200', {
      fontSize: '9px', fontFamily: FONT_FAMILY, color: '#ccccee',
    }).setOrigin(0.5);
    y += 24;

    // ---- DIVIDER ----
    this.drawDivider(y);
    y += 10;

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

    // ---- SKILLS + SYNERGIES (scrollable) ----
    this.add.text(cx, y, '보유 스킬', {
      fontSize: '12px', fontFamily: FONT_FAMILY, color: '#888899',
    }).setOrigin(0.5);
    y += 16;

    this.setupScrollArea(y, this.layout.gameHeight - y - 10);

    // Fusion button (in game area)
    const fusionCx = this.layout.gameAreaWidth / 2;
    this.fusionContainer = this.add.container(fusionCx, this.layout.gameAreaHeight - 40);
    this.fusionContainer.setVisible(false);
    this.createFusionButton();

    // Tooltip container
    this.tooltipContainer = this.add.container(0, 0);
    this.tooltipContainer.setDepth(100);
    this.tooltipContainer.setVisible(false);
  }

  /* ================================================================
   *  PORTRAIT UI — 720x560 bottom panel
   * ================================================================ */
  private createPortraitUI(): void {
    const W = this.layout.gameWidth;       // 720
    const panelY = this.layout.uiPanelY;   // 720
    const panelH = this.layout.uiPanelHeight; // 560

    this.panelX = 0;
    this.panelW = W;
    this.leftX = 12;
    this.cx = W / 2;

    // Panel background
    const panelBg = this.add.graphics();
    panelBg.fillStyle(COLORS.UI_BG, 0.95);
    panelBg.fillRect(0, panelY, W, panelH);
    panelBg.lineStyle(2, COLORS.UI_BORDER);
    panelBg.lineBetween(0, panelY, W, panelY);

    let y = panelY + 10;

    // ---- INFO BAR: Wave / Timer / Enemy (horizontal) ----
    this.add.text(120, y, '웨이브', {
      fontSize: '11px', fontFamily: FONT_FAMILY, color: '#888899',
    }).setOrigin(0.5);
    this.waveText = this.add.text(120, y + 16, '0', {
      fontSize: '22px', fontFamily: FONT_FAMILY, color: '#88aaff',
    }).setOrigin(0.5);

    this.waveTimerText = this.add.text(W / 2, y + 8, '', {
      fontSize: '12px', fontFamily: FONT_FAMILY, color: '#aaaacc',
    }).setOrigin(0.5);

    this.add.text(600, y, '적', {
      fontSize: '11px', fontFamily: FONT_FAMILY, color: '#888899',
    }).setOrigin(0.5);
    this.enemyCountText = this.add.text(600, y + 16, '0/50', {
      fontSize: '14px', fontFamily: FONT_FAMILY, color: '#ff8888',
    }).setOrigin(0.5);
    y += 40;

    // ---- DIVIDER ----
    this.drawDivider(y);
    y += 8;

    // ---- ORB BONUS + LEVEL + STATS (compact horizontal) ----
    this.add.text(12, y, '패시브', {
      fontSize: '11px', fontFamily: FONT_FAMILY, color: '#888899',
    });
    this.levelText = this.add.text(50, y, 'Lv.1', {
      fontSize: '13px', fontFamily: FONT_FAMILY, color: '#ffdd44',
    });
    this.statsText = this.add.text(120, y, '', {
      fontSize: '10px', fontFamily: FONT_FAMILY, color: '#aabbcc',
    });
    y += 18;

    // ---- EXP BAR (full width) ----
    this.expBarX = 12;
    this.expBarW = W - 24;
    this.expBarY = y;
    this.expBarBg = this.add.graphics();
    this.expBarBg.fillStyle(COLORS.EXP_BAR_BG, 1);
    this.expBarBg.fillRoundedRect(12, y, this.expBarW, 12, 4);
    this.expBarBg.lineStyle(1, 0x4444aa, 0.4);
    this.expBarBg.strokeRoundedRect(12, y, this.expBarW, 12, 4);
    this.expBarFill = this.add.graphics();
    this.expText = this.add.text(W / 2, y + 6, 'EXP 0/200', {
      fontSize: '9px', fontFamily: FONT_FAMILY, color: '#ccccee',
    }).setOrigin(0.5);
    y += 20;

    // ---- DIVIDER ----
    this.drawDivider(y);
    y += 8;

    // ---- TARGETING: 4 direct-select buttons ----
    this.add.text(12, y, '타겟팅', {
      fontSize: '10px', fontFamily: FONT_FAMILY, color: '#888899',
    });

    // Dummy targetingText (landscape-only, kept for type safety)
    this.targetingText = this.add.text(0, 0, '').setAlpha(0);

    const btnW = (W - 24 - 30) / 4;   // ~166px each, 10px gaps
    const btnStartX = 12;
    const btnY = y + 16;
    const targetingBtns: Phaser.GameObjects.Text[] = [];
    const targetingBgs: Phaser.GameObjects.Graphics[] = [];

    TARGETING_OPTIONS.forEach((strat, i) => {
      const bx = btnStartX + i * (btnW + 10);

      const bg = this.add.graphics();
      bg.fillStyle(i === 0 ? 0x4444aa : 0x333355, 1);
      bg.fillRoundedRect(bx, btnY, btnW, 26, 4);
      targetingBgs.push(bg);

      const label = this.add.text(bx + btnW / 2, btnY + 13, TARGETING_LABELS[strat], {
        fontSize: '13px', fontFamily: FONT_FAMILY, color: i === 0 ? '#88ddff' : '#6688aa',
      }).setOrigin(0.5);
      targetingBtns.push(label);

      const hit = this.add.rectangle(bx + btnW / 2, btnY + 13, btnW, 26)
        .setInteractive({ useHandCursor: true }).setAlpha(0.001);
      hit.on('pointerdown', () => {
        this.currentTargetIdx = i;
        this.data_.onTargetChange(strat);
        soundManager.buttonClick();
        targetingBgs.forEach((g, j) => {
          g.clear();
          g.fillStyle(j === i ? 0x4444aa : 0x333355, 1);
          g.fillRoundedRect(btnStartX + j * (btnW + 10), btnY, btnW, 26, 4);
        });
        targetingBtns.forEach((t, j) => {
          t.setColor(j === i ? '#88ddff' : '#6688aa');
        });
      });
    });
    y += 50;

    // ---- DIVIDER ----
    this.drawDivider(y);
    y += 8;

    // ---- SKILLS + SYNERGIES (scrollable) ----
    this.add.text(W / 2, y, '보유 스킬', {
      fontSize: '12px', fontFamily: FONT_FAMILY, color: '#888899',
    }).setOrigin(0.5);
    y += 16;

    this.setupScrollArea(y, this.layout.gameHeight - y - 10);

    // Fusion button (in game area, above panel)
    const fusionCx = W / 2;
    this.fusionContainer = this.add.container(fusionCx, this.layout.gameAreaHeight - 40);
    this.fusionContainer.setVisible(false);
    this.createFusionButton();

    // Tooltip container
    this.tooltipContainer = this.add.container(0, 0);
    this.tooltipContainer.setDepth(100);
    this.tooltipContainer.setVisible(false);
  }

  /* ================================================================
   *  Scroll area setup
   * ================================================================ */
  private setupScrollArea(startY: number, height: number): void {
    this.scrollStartY = startY;
    this.scrollHeight = height;
    this.scrollOffset = 0;

    this.scrollContainer = this.add.container(0, startY);
    this.skillContainer = this.add.container(0, 0);
    this.synergyContainer = this.add.container(0, 0);
    this.scrollContainer.add(this.skillContainer);
    this.scrollContainer.add(this.synergyContainer);

    // Mask to clip content outside the scroll area
    const maskShape = this.make.graphics({});
    maskShape.fillRect(this.panelX, startY, this.panelW, height);
    this.scrollContainer.setMask(maskShape.createGeometryMask());

    // Wheel scroll handler
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _gos: any[], _dx: number, dy: number) => {
      // Only scroll when pointer is in the panel area
      if (this.layout.mode === 'landscape') {
        if (pointer.x < this.panelX) return;
      } else {
        if (pointer.y < this.scrollStartY) return;
      }

      const maxScroll = Math.max(0, this.contentHeight - this.scrollHeight);
      this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset + dy * 0.5, 0, maxScroll);
      this.scrollContainer.y = this.scrollStartY - this.scrollOffset;
      this.tooltipContainer.setVisible(false);
    });
  }

  /* ================================================================
   *  Shared helpers
   * ================================================================ */
  private createFusionButton(): void {
    const fusionBg = this.add.graphics();
    fusionBg.fillStyle(0x664488, 1);
    fusionBg.fillRoundedRect(-70, -16, 140, 32, 8);
    fusionBg.lineStyle(1, 0xaa88ff);
    fusionBg.strokeRoundedRect(-70, -16, 140, 32, 8);
    this.fusionContainer.add(fusionBg);
    this.fusionContainer.add(this.add.text(0, 0, '오브 합성', {
      fontSize: '16px', fontFamily: FONT_FAMILY, color: '#ffdd88', fontStyle: 'bold',
    }).setOrigin(0.5));
    const fusionHit = this.add.rectangle(0, 0, 140, 32).setInteractive({ useHandCursor: true }).setAlpha(0.001);
    this.fusionContainer.add(fusionHit);
    fusionHit.on('pointerdown', () => {
      soundManager.buttonClick();
      this.data_.onFusionOpen();
    });
  }

  update(): void {
    if (!this.data_) return;

    const towerState = this.data_.getTowerState();
    const wave = this.data_.getWave();
    const enemyCount = this.data_.getEnemyCount();
    const maxEnemies = this.data_.getMaxEnemies();
    const synergies = this.data_.getActiveSynergies();
    const isPortrait = this.layout.mode === 'portrait';

    // Update text
    this.waveText.setText(`${wave}`);
    this.levelText.setText(`Lv.${towerState.level}`);

    // Wave timer
    const timeLeft = this.data_.getWaveTimeLeft();
    if (timeLeft >= 0) {
      const sec = Math.ceil(timeLeft);
      this.waveTimerText.setText(`다음 웨이브: ${sec}s`);
      this.waveTimerText.setColor(sec <= 5 ? '#ff6644' : '#aaaacc');
    } else {
      this.waveTimerText.setText('');
    }

    // Enemy count with color warning
    const ratio = enemyCount / maxEnemies;
    let enemyColor = '#88ff88';
    if (ratio > 0.8) enemyColor = '#ff4444';
    else if (ratio > 0.6) enemyColor = '#ffaa44';
    else if (ratio > 0.4) enemyColor = '#ffff44';
    this.enemyCountText.setText(isPortrait ? `${enemyCount}/${maxEnemies}` : `적: ${enemyCount}/${maxEnemies}`);
    this.enemyCountText.setColor(enemyColor);

    // EXP bar
    const expNeeded = towerState.expToNext || 1;
    const pct = Math.min(1, towerState.exp / expNeeded);
    const barH = isPortrait ? 12 : 14;
    this.expBarFill.clear();
    this.expBarFill.fillStyle(0x8888ff, 1);
    const fillW = Math.max(0, this.expBarW * pct);
    this.expBarFill.fillRoundedRect(this.expBarX, this.expBarY, fillW, barH, 4);
    this.expText.setText(`EXP ${towerState.exp}/${expNeeded}`);

    // Tower stats
    const stats = this.data_.getStats();
    if (isPortrait) {
      this.statsText.setText(
        `ATK ${stats.damage.toFixed(1)}  SPD ${stats.fireRate.toFixed(1)}/s  RNG ${stats.range.toFixed(0)}  DPS ${stats.dps.toFixed(1)}` +
        (stats.critChance > 0 ? `  CRT ${(stats.critChance * 100).toFixed(0)}%` : '')
      );
    } else {
      this.statsText.setText(
        `ATK  ${stats.damage.toFixed(1)}\n` +
        `SPD  ${stats.fireRate.toFixed(1)}/s\n` +
        `RNG  ${stats.range.toFixed(0)}\n` +
        `DPS  ${stats.dps.toFixed(1)}` +
        (stats.critChance > 0 ? `\nCRT  ${(stats.critChance * 100).toFixed(0)}%` : '')
      );
    }

    // Update skills list (returns height consumed)
    const skillsHeight = this.updateSkillsList(towerState.skills);

    // Position synergies below skills
    this.synergyContainer.setY(skillsHeight);

    // Update synergies (returns height consumed)
    const synergiesHeight = this.updateSynergiesList(synergies);

    // Update content height for scroll clamping
    this.contentHeight = skillsHeight + synergiesHeight;

    // Clamp scroll offset in case content height changed
    const maxScroll = Math.max(0, this.contentHeight - this.scrollHeight);
    if (this.scrollOffset > maxScroll) {
      this.scrollOffset = maxScroll;
      this.scrollContainer.y = this.scrollStartY - this.scrollOffset;
    }

    // Check fusion availability (2+ non-fused skills at level 5+)
    const fusionEligible = towerState.skills.filter(
      (s: OwnedSkill) => s.level >= 5 && !s.fusedFrom && s.id !== 'power_shot'
    );
    this.fusionContainer.setVisible(fusionEligible.length >= 2);
  }

  private updateSkillsList(skills: OwnedSkill[]): number {
    this.skillContainer.removeAll(true);

    // Split into active and passive groups
    const activeSkills: OwnedSkill[] = [];
    const passiveSkills: OwnedSkill[] = [];

    for (const owned of skills) {
      const sd = SKILLS[owned.id];
      if (!sd) continue;
      if (!sd.passive || owned.fusedFrom) {
        activeSkills.push(owned);
      } else {
        passiveSkills.push(owned);
      }
    }

    // Sort passive: power_shot first
    passiveSkills.sort((a, b) => {
      if (a.id === 'power_shot') return -1;
      if (b.id === 'power_shot') return 1;
      return 0;
    });

    const isPortrait = this.layout.mode === 'portrait';
    let y = 0;

    if (isPortrait) {
      // ---- Portrait: 2-column layout per group ----
      const col1X = 12;
      const col2X = 372;
      const hitW = 340;

      // Active group header
      if (activeSkills.length > 0) {
        const header = this.add.text(this.cx, y, `액티브 (${activeSkills.length})`, {
          fontSize: '11px', fontFamily: FONT_FAMILY, color: '#77aacc',
        }).setOrigin(0.5);
        this.skillContainer.add(header);
        y += 18;

        activeSkills.forEach((owned, i) => {
          const sd = SKILLS[owned.id];
          if (!sd) return;
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = col === 0 ? col1X : col2X;
          const itemY = y + row * 22;
          this.addSkillRow(owned, sd, x, itemY, hitW);
        });
        y += Math.ceil(activeSkills.length / 2) * 22 + 6;
      }

      // Passive group header
      if (passiveSkills.length > 0) {
        const header = this.add.text(this.cx, y, `패시브 (${passiveSkills.length})`, {
          fontSize: '11px', fontFamily: FONT_FAMILY, color: '#77aacc',
        }).setOrigin(0.5);
        this.skillContainer.add(header);
        y += 18;

        passiveSkills.forEach((owned, i) => {
          const sd = SKILLS[owned.id];
          if (!sd) return;
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = col === 0 ? col1X : col2X;
          const itemY = y + row * 22;
          this.addSkillRow(owned, sd, x, itemY, hitW);
        });
        y += Math.ceil(passiveSkills.length / 2) * 22;
      }
    } else {
      // ---- Landscape: single column ----
      const leftX = this.leftX;
      const hitW = this.panelW - 24;

      // Active group header
      if (activeSkills.length > 0) {
        const header = this.add.text(leftX, y, `액티브 (${activeSkills.length})`, {
          fontSize: '11px', fontFamily: FONT_FAMILY, color: '#77aacc',
        });
        this.skillContainer.add(header);
        y += 18;

        for (const owned of activeSkills) {
          const sd = SKILLS[owned.id];
          if (!sd) continue;
          this.addSkillRow(owned, sd, leftX, y, hitW);
          y += 22;
        }
        y += 6;
      }

      // Passive group header
      if (passiveSkills.length > 0) {
        const header = this.add.text(leftX, y, `패시브 (${passiveSkills.length})`, {
          fontSize: '11px', fontFamily: FONT_FAMILY, color: '#77aacc',
        });
        this.skillContainer.add(header);
        y += 18;

        for (const owned of passiveSkills) {
          const sd = SKILLS[owned.id];
          if (!sd) continue;
          this.addSkillRow(owned, sd, leftX, y, hitW);
          y += 22;
        }
      }
    }

    return y + 8;
  }

  /** Add a single skill row with dot, label, and hover hit area */
  private addSkillRow(owned: OwnedSkill, sd: SkillData, x: number, y: number, hitW: number): void {
    const colorStr = RARITY_COLOR_STRINGS[sd.rarity] || '#cccccc';

    const dot = this.add.graphics();
    dot.fillStyle(sd.color, 1);
    dot.fillCircle(x + 6, y + 6, 4);
    this.skillContainer.add(dot);

    const label = owned.fusedFrom
      ? `${sd.name} Lv.${owned.level} [${owned.fusedFrom.length}합]`
      : `${sd.name} Lv.${owned.level}`;
    const text = this.add.text(x + 16, y, label, {
      fontSize: '12px', fontFamily: FONT_FAMILY, color: colorStr,
    });
    this.skillContainer.add(text);

    // Hit area for hover tooltip
    const hit = this.add.rectangle(x + hitW / 2, y + 7, hitW, 18)
      .setInteractive().setAlpha(0.001);
    this.skillContainer.add(hit);

    hit.on('pointerover', () => {
      // Check if item is within visible scroll area
      const itemWorldY = this.scrollContainer.y + y;
      if (itemWorldY < this.scrollStartY - 10 || itemWorldY > this.scrollStartY + this.scrollHeight + 10) return;
      this.showSkillTooltip(owned, sd, itemWorldY);
    });
    hit.on('pointerout', () => {
      this.tooltipContainer.setVisible(false);
    });
  }

  private updateSynergiesList(synergies: ActiveSynergy[]): number {
    this.synergyContainer.removeAll(true);

    if (synergies.length === 0) {
      this.synergyContainer.setVisible(false);
      return 0;
    }

    this.synergyContainer.setVisible(true);

    const divStartX = this.panelX + 10;
    const divEndX = this.panelX + this.panelW - 10;
    const titleX = this.panelX + this.panelW / 2;
    const textLeftX = this.leftX;
    const hitW = this.panelW - 24;
    const rowH = 32; // taller rows: name + description

    // Divider
    const divider = this.add.graphics();
    divider.lineStyle(1, COLORS.UI_BORDER, 0.5);
    divider.lineBetween(divStartX, 0, divEndX, 0);
    this.synergyContainer.add(divider);

    const title = this.add.text(titleX, 12, '시너지', {
      fontSize: '12px', fontFamily: FONT_FAMILY, color: '#888899',
    }).setOrigin(0.5);
    this.synergyContainer.add(title);

    const tierColors: Record<string, string> = {
      basic: '#88aaff', element: '#ff88ff', advanced: '#ffaa44',
    };

    synergies.forEach((syn, i) => {
      const y = 28 + i * rowH;
      const color = tierColors[syn.tier] || '#888888';

      // Synergy name
      const nameText = this.add.text(textLeftX, y, syn.name, {
        fontSize: '11px', fontFamily: FONT_FAMILY, color: color,
      });
      this.synergyContainer.add(nameText);

      // Synergy effect description (below name, dimmer)
      const descText = this.add.text(textLeftX + 4, y + 14, syn.description, {
        fontSize: '9px', fontFamily: FONT_FAMILY, color: '#8888aa',
        wordWrap: { width: hitW - 4 },
      });
      this.synergyContainer.add(descText);

      const hit = this.add.rectangle(textLeftX + hitW / 2, y + rowH / 2, hitW, rowH)
        .setInteractive().setAlpha(0.001);
      this.synergyContainer.add(hit);

      hit.on('pointerover', () => {
        const worldY = this.scrollContainer.y + this.synergyContainer.y + y;
        if (worldY < this.scrollStartY - 10 || worldY > this.scrollStartY + this.scrollHeight + 10) return;
        this.showSynergyTooltip(syn, worldY);
      });
      hit.on('pointerout', () => {
        this.tooltipContainer.setVisible(false);
      });
    });

    return 28 + synergies.length * rowH + 10;
  }

  private showSynergyTooltip(syn: ActiveSynergy, worldY: number): void {
    this.tooltipContainer.removeAll(true);
    this.tooltipContainer.setVisible(true);

    // Find which owned skills contribute to this synergy
    const towerState = this.data_.getTowerState();
    const contributingSkills: string[] = [];

    for (const req of syn.requirements) {
      for (const owned of towerState.skills) {
        const sd = SKILLS[owned.id];
        if (!sd) continue;
        const tagsToCheck = owned.fusedFrom
          ? owned.fusedFrom.flatMap(srcId => SKILLS[srcId]?.tags || [])
          : sd.tags;
        if (tagsToCheck.includes(req.tag)) {
          const name = owned.fusedFrom
            ? `${sd.name}[합성]`
            : sd.name;
          if (!contributingSkills.includes(name)) {
            contributingSkills.push(name);
          }
        }
      }
    }

    const tierColors: Record<string, string> = {
      basic: '#88aaff', element: '#ff88ff', advanced: '#ffaa44',
    };
    const tierLabels: Record<string, string> = {
      basic: '기본', element: '원소', advanced: '고급',
    };

    // Build tooltip lines with individual styling
    const padding = 10;
    const lineH = 16;
    const tooltipW = 230;

    const reqText = syn.requirements.map(r => `${r.tag} x${r.count}`).join(' + ');
    const skillNames = contributingSkills.join(', ');

    const lines: { text: string; color: string; fontSize: string }[] = [
      { text: `[${tierLabels[syn.tier] || syn.tier}] ${syn.name}`, color: tierColors[syn.tier] || '#ffffff', fontSize: '12px' },
      { text: '─────────────────', color: '#555577', fontSize: '9px' },
      { text: `효과: ${syn.description}`, color: '#ffdd88', fontSize: '10px' },
      { text: '─────────────────', color: '#555577', fontSize: '9px' },
      { text: `조건: ${reqText}`, color: '#bbbbcc', fontSize: '10px' },
      { text: `기여: ${skillNames}`, color: '#88ff88', fontSize: '10px' },
    ];

    const tooltipH = lines.length * lineH + padding * 2;

    let tx: number;
    let ty: number;

    if (this.layout.mode === 'portrait') {
      tx = this.layout.gameWidth / 2 - tooltipW / 2;
      ty = Math.max(10, worldY - tooltipH - 10);
    } else {
      tx = this.panelX - tooltipW - 8;
      ty = Phaser.Math.Clamp(worldY - tooltipH / 2, 10, this.layout.gameHeight - tooltipH - 10);
    }

    this.tooltipContainer.setPosition(tx, ty);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(0, 0, tooltipW, tooltipH, 6);
    bg.lineStyle(1, 0x6666aa, 0.8);
    bg.strokeRoundedRect(0, 0, tooltipW, tooltipH, 6);
    this.tooltipContainer.add(bg);

    // Text lines
    lines.forEach((line, idx) => {
      const t = this.add.text(padding, padding + idx * lineH, line.text, {
        fontSize: line.fontSize, fontFamily: FONT_FAMILY, color: line.color,
        wordWrap: { width: tooltipW - padding * 2 },
      });
      this.tooltipContainer.add(t);
    });
  }

  private showSkillTooltip(owned: OwnedSkill, sd: SkillData, worldY: number): void {
    this.tooltipContainer.removeAll(true);
    this.tooltipContainer.setVisible(true);

    const padding = 10;
    const lineH = 15;
    const tooltipW = 220;

    // Build content lines
    const lines: { text: string; color: string; fontSize: string }[] = [];

    // Line 1: [rarity] skill name
    const rarityLabel = RARITY_LABELS[sd.rarity] || sd.rarity;
    const rarityColor = RARITY_COLOR_STRINGS[sd.rarity] || '#cccccc';
    lines.push({
      text: `[${rarityLabel}] ${sd.name}`,
      color: rarityColor,
      fontSize: '12px',
    });

    // Line 2: type
    const typeStr = owned.fusedFrom ? '액티브 [합성]' :
      sd.passive ? '패시브' : '액티브';
    lines.push({ text: typeStr, color: '#aabbcc', fontSize: '10px' });

    // Line 3: level
    lines.push({
      text: `Lv.${owned.level} / Max ${sd.maxLevel}`,
      color: '#ffdd44',
      fontSize: '10px',
    });

    // Line 4: description
    lines.push({ text: sd.description, color: '#ddddee', fontSize: '10px' });

    // Line 5: tags
    lines.push({
      text: `태그: ${sd.tags.join(' ')}`,
      color: '#888899',
      fontSize: '9px',
    });

    // Fusion info
    if (owned.fusedFrom) {
      lines.push({ text: '─────────────', color: '#555577', fontSize: '9px' });
      const sourceNames = owned.fusedFrom.map(id => SKILLS[id]?.name || id).join(', ');
      lines.push({ text: `합성 소스: ${sourceNames}`, color: '#cc88ff', fontSize: '10px' });
      if (owned.fusionBonus) {
        lines.push({ text: `합성 보너스: x${owned.fusionBonus.toFixed(1)}`, color: '#ffaa44', fontSize: '10px' });
      }
    }

    // Effects separator
    lines.push({ text: '─────────────', color: '#555577', fontSize: '9px' });
    lines.push({ text: `효과 (Lv.${owned.level}):`, color: '#88ddff', fontSize: '10px' });

    // Effect values
    for (const [key, _def] of Object.entries(sd.effects)) {
      const value = getSkillEffect(sd, owned.level, key);
      const label = EFFECT_LABELS[key] || key;
      const formatted = formatEffectValue(key, value);
      lines.push({
        text: `  ${label}: ${formatted}`,
        color: '#aabbcc',
        fontSize: '10px',
      });
    }

    // Calculate tooltip height
    const tooltipH = lines.length * lineH + padding * 2;

    // Position
    let tx: number;
    let ty: number;

    if (this.layout.mode === 'portrait') {
      tx = this.layout.gameWidth / 2 - tooltipW / 2;
      ty = Math.max(10, worldY - tooltipH - 10);
    } else {
      tx = this.panelX - tooltipW - 8;
      ty = Phaser.Math.Clamp(worldY - tooltipH / 2, 10, this.layout.gameHeight - tooltipH - 10);
    }

    this.tooltipContainer.setPosition(tx, ty);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(0, 0, tooltipW, tooltipH, 6);
    bg.lineStyle(1, 0x6666aa, 0.8);
    bg.strokeRoundedRect(0, 0, tooltipW, tooltipH, 6);
    this.tooltipContainer.add(bg);

    // Render lines
    lines.forEach((line, idx) => {
      const t = this.add.text(padding, padding + idx * lineH, line.text, {
        fontSize: line.fontSize,
        fontFamily: FONT_FAMILY,
        color: line.color,
        wordWrap: { width: tooltipW - padding * 2 },
      });
      this.tooltipContainer.add(t);
    });
  }

  private drawDivider(y: number): void {
    const g = this.add.graphics();
    g.lineStyle(1, COLORS.UI_BORDER, 0.5);
    g.lineBetween(this.panelX + 10, y, this.panelX + this.panelW - 10, y);
  }
}
