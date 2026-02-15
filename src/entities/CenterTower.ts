import Phaser from 'phaser';
import {
  TowerState,
  OwnedSkill,
  SkillId,
  TargetingStrategy,
  GameEvent,
  MAX_SKILL_SLOTS,
} from '../utils/types';
import {
  TOWER_LEVEL_STATS,
  EXP_TABLE,
  COLORS,
  FONT_FAMILY,
} from '../utils/constants';

/**
 * CenterTower - 화면 중앙의 메인 타워
 * 프로시저럴 그래픽으로 골든 육각형 형태
 */
export class CenterTower extends Phaser.GameObjects.Container {
  public towerState: TowerState;
  private baseGraphics: Phaser.GameObjects.Graphics;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private rangeGraphics: Phaser.GameObjects.Graphics;
  private levelText: Phaser.GameObjects.Text;
  private glowTween: Phaser.Tweens.Tween | null = null;
  private rainbowTween: Phaser.Tweens.Tween | null = null;
  private rangeVisible = false;
  private glowAlpha = 0.5;
  private rainbowHue = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this.setDepth(10);

    // Initialize tower state at level 1
    const stats = TOWER_LEVEL_STATS[0];
    this.towerState = {
      level: 1,
      exp: 0,
      expToNext: EXP_TABLE[1], // 200
      baseDamage: stats.damage,
      baseFireRate: stats.fireRate,
      baseRange: stats.range,
      skills: [{ id: 'power_shot', level: 1 }],
      kills: 0,
      targeting: 'first',
    };

    // Create visual layers (order matters: range -> glow -> base -> text)
    this.rangeGraphics = scene.add.graphics();
    this.rangeGraphics.setDepth(5);
    this.rangeGraphics.setVisible(false);
    // Range indicator is positioned in world space, not local
    this.add(this.rangeGraphics);

    this.glowGraphics = scene.add.graphics();
    this.add(this.glowGraphics);

    this.baseGraphics = scene.add.graphics();
    this.add(this.baseGraphics);

    this.levelText = scene.add.text(0, 0, '1', {
      fontSize: '12px',
      fontFamily: FONT_FAMILY,
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add(this.levelText);

    // Draw initial visuals
    this.updateVisual();

    // Start glow pulse animation
    this.glowTween = scene.tweens.add({
      targets: this,
      glowAlpha: { from: 0.3, to: 0.7 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Interactive hover for range indicator
    this.setSize(60, 60);
    this.setInteractive();
    this.on('pointerover', () => this.showRange(true));
    this.on('pointerout', () => this.showRange(false));
  }

  // ===== EXP & Leveling =====

  /** Add EXP, return true if leveled up (infinite leveling) */
  addExp(amount: number): boolean {
    this.towerState.exp += amount;
    let leveled = false;

    while (this.towerState.exp >= this.towerState.expToNext && this.towerState.expToNext > 0) {
      this.towerState.exp -= this.towerState.expToNext;
      this.towerState.level++;
      leveled = true;

      // Update base stats
      if (this.towerState.level <= TOWER_LEVEL_STATS.length) {
        // Use table for levels 1~10
        const newStats = TOWER_LEVEL_STATS[this.towerState.level - 1];
        this.towerState.baseDamage = newStats.damage;
        this.towerState.baseFireRate = newStats.fireRate;
        this.towerState.baseRange = newStats.range;
      } else {
        // Level 11+: scale beyond table with formula
        const extra = this.towerState.level - TOWER_LEVEL_STATS.length;
        const maxStats = TOWER_LEVEL_STATS[TOWER_LEVEL_STATS.length - 1];
        this.towerState.baseDamage = maxStats.damage + extra * 5;
        this.towerState.baseFireRate = maxStats.fireRate + extra * 0.2;
        this.towerState.baseRange = Math.min(400, maxStats.range + extra * 5);
      }

      // Calculate next EXP requirement
      if (this.towerState.level < EXP_TABLE.length) {
        this.towerState.expToNext = EXP_TABLE[this.towerState.level];
      } else {
        // Beyond table: exponential growth
        const lastExp = EXP_TABLE[EXP_TABLE.length - 1];
        const beyond = this.towerState.level - EXP_TABLE.length + 1;
        this.towerState.expToNext = Math.floor(lastExp * Math.pow(1.15, beyond));
      }

      // Emit level up event
      this.scene.events.emit(GameEvent.LEVEL_UP, this.towerState.level);
    }

    if (leveled) {
      this.updateVisual();
    }

    return leveled;
  }

  // ===== Skill Management =====

  /** Add new skill (check MAX_SKILL_SLOTS=8) */
  addSkill(skillId: SkillId): boolean {
    if (this.getSkillCount() >= MAX_SKILL_SLOTS - 1) return false; // -1 for basic attack slot
    if (this.hasSkill(skillId)) return false;

    this.towerState.skills.push({ id: skillId, level: 1 });
    return true;
  }

  /** Upgrade an owned skill's level */
  upgradeSkill(skillId: SkillId): boolean {
    const skill = this.hasSkill(skillId);
    if (!skill) return false;

    skill.level++;
    return true;
  }

  /** Remove skill and return it */
  removeSkill(skillId: SkillId): OwnedSkill | null {
    const index = this.towerState.skills.findIndex(s => s.id === skillId);
    if (index === -1) return null;
    // Don't allow removing the basic attack
    if (skillId === 'power_shot' && this.towerState.skills[index].level === 1) {
      // Allow removal of power_shot if it's not the only one
    }
    const [removed] = this.towerState.skills.splice(index, 1);
    return removed;
  }

  /** Check if tower has a specific skill */
  hasSkill(skillId: SkillId): OwnedSkill | undefined {
    return this.towerState.skills.find(s => s.id === skillId);
  }

  /** Get count of skills excluding basic attack */
  getSkillCount(): number {
    return this.towerState.skills.filter(s => s.id !== 'power_shot').length;
  }

  /** Fuse multiple skills into one fused skill */
  fuseSkills(primaryId: SkillId, consumedIds: SkillId[], bonus: number): OwnedSkill | null {
    const allIds = [primaryId, ...consumedIds];
    let maxLevel = 0;

    for (const id of allIds) {
      const owned = this.towerState.skills.find(s => s.id === id);
      if (!owned) return null;
      maxLevel = Math.max(maxLevel, owned.level);
    }

    for (const id of allIds) {
      this.removeSkill(id);
    }

    const fusedSkill: OwnedSkill = {
      id: primaryId,
      level: maxLevel,
      fusedFrom: allIds,
      fusionBonus: bonus,
    };

    this.towerState.skills.push(fusedSkill);
    return fusedSkill;
  }

  // ===== Targeting =====

  setTargeting(strategy: TargetingStrategy): void {
    this.towerState.targeting = strategy;
    this.scene.events.emit(GameEvent.TARGETING_CHANGED, strategy);
  }

  // ===== Visual =====

  /** Toggle range circle visibility */
  showRange(show: boolean): void {
    this.rangeVisible = show;
    this.rangeGraphics.setVisible(show);
    if (show) {
      this._drawRange();
    }
  }

  /** Update tower appearance based on level */
  updateVisual(): void {
    this._drawBase();
    this._drawGlow();
    this._drawRange();
    this.levelText.setText(`${this.towerState.level}`);

    // Rainbow shimmer at level 10+
    if (this.towerState.level >= 10 && !this.rainbowTween) {
      this.rainbowTween = this.scene.tweens.add({
        targets: this,
        rainbowHue: { from: 0, to: 360 },
        duration: 3000,
        repeat: -1,
        onUpdate: () => this._drawBase(),
      });
    }
  }

  /** Draw the hexagonal tower base */
  private _drawBase(): void {
    this.baseGraphics.clear();

    const level = this.towerState.level;
    const baseRadius = 28 + level * 0.5; // Slightly larger at higher levels

    // Determine color
    let baseColor = COLORS.TOWER_BASE;
    if (level >= 10) {
      // Rainbow shimmer at level 10+
      baseColor = Phaser.Display.Color.HSLToColor(this.rainbowHue / 360, 0.8, 0.6).color;
    }

    // Draw hexagon
    this.baseGraphics.fillStyle(baseColor, 0.95);
    this.baseGraphics.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 6;
      const px = Math.cos(angle) * baseRadius;
      const py = Math.sin(angle) * baseRadius;
      if (i === 0) {
        this.baseGraphics.moveTo(px, py);
      } else {
        this.baseGraphics.lineTo(px, py);
      }
    }
    this.baseGraphics.closePath();
    this.baseGraphics.fillPath();

    // Border
    const borderAlpha = 0.4 + level * 0.06;
    this.baseGraphics.lineStyle(2, 0xffffff, borderAlpha);
    this.baseGraphics.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 6;
      const px = Math.cos(angle) * baseRadius;
      const py = Math.sin(angle) * baseRadius;
      if (i === 0) {
        this.baseGraphics.moveTo(px, py);
      } else {
        this.baseGraphics.lineTo(px, py);
      }
    }
    this.baseGraphics.closePath();
    this.baseGraphics.strokePath();

    // Inner detail lines
    this.baseGraphics.lineStyle(1, 0x000000, 0.15);
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 6;
      this.baseGraphics.lineBetween(0, 0, Math.cos(angle) * baseRadius * 0.5, Math.sin(angle) * baseRadius * 0.5);
    }
  }

  /** Draw the inner glow circle */
  private _drawGlow(): void {
    this.glowGraphics.clear();

    const level = this.towerState.level;
    const glowRadius = 16 + level * 0.5;
    const brightness = 0.3 + level * 0.07; // Brighter at higher levels

    let glowColor = COLORS.TOWER_GLOW;
    if (level >= 10) {
      glowColor = Phaser.Display.Color.HSLToColor(this.rainbowHue / 360, 0.9, 0.8).color;
    }

    this.glowGraphics.fillStyle(glowColor, brightness * this.glowAlpha);
    this.glowGraphics.fillCircle(0, 0, glowRadius);

    // Outer glow halo
    if (level >= 5) {
      this.glowGraphics.fillStyle(glowColor, brightness * this.glowAlpha * 0.3);
      this.glowGraphics.fillCircle(0, 0, glowRadius + 8);
    }
  }

  /** Draw range indicator (dashed circle) */
  private _drawRange(): void {
    this.rangeGraphics.clear();
    if (!this.rangeVisible) return;

    const range = this.towerState.baseRange;
    const dashCount = 36;
    const dashAngle = (Math.PI * 2) / dashCount;

    this.rangeGraphics.lineStyle(1.5, 0xffffff, 0.25);
    for (let i = 0; i < dashCount; i += 2) {
      const startAngle = i * dashAngle;
      const endAngle = (i + 1) * dashAngle;
      this.rangeGraphics.beginPath();
      this.rangeGraphics.arc(0, 0, range, startAngle, endAngle, false);
      this.rangeGraphics.strokePath();
    }
  }

  // ===== Update =====

  /** Update glow pulse animation */
  update(delta: number): void {
    // The glow pulse is driven by the tween, but we redraw glow here
    // to apply the changing glowAlpha
    this._drawGlow();

  }

  destroy(fromScene?: boolean): void {
    if (this.glowTween) {
      this.glowTween.destroy();
      this.glowTween = null;
    }
    if (this.rainbowTween) {
      this.rainbowTween.destroy();
      this.rainbowTween = null;
    }
    super.destroy(fromScene);
  }
}
