// ============================================================
// 라스트타워 - Enemy: 적 엔티티 (사각 경로 이동)
// ============================================================

import Phaser from 'phaser';
import { EnemyState, EnemyId, GameEvent } from '@/utils/types';
import { COLORS } from '@/utils/constants';
import { eventManager } from '@/managers/EventManager';

/** Interface for the square path system that enemies follow */
export interface SquarePathSystem {
  getPositionAt(progress: number): { x: number; y: number };
  getPerimeter(): number;
}

/** Status effect application payload */
export interface StatusEffects {
  slow?: { percent: number; duration: number };
  poison?: { dps: number; duration: number };
  burn?: { dps: number; duration: number };
  bleed?: { dps: number; duration: number };
  stun?: number;   // duration
  freeze?: number; // duration
  knockback?: number;
  fear?: number;   // duration
}

let enemyCounter = 0;

export class Enemy extends Phaser.GameObjects.Container {
  enemyState: EnemyState;

  private bodyGraphics: Phaser.GameObjects.Graphics;
  private hpBarBg: Phaser.GameObjects.Graphics;
  private hpBarFill: Phaser.GameObjects.Graphics;
  private statusIndicator: Phaser.GameObjects.Graphics;
  private pathSystem: SquarePathSystem;

  private readonly HP_BAR_WIDTH = 24;
  private readonly HP_BAR_HEIGHT = 3;
  private readonly HP_BAR_OFFSET_Y: number;
  private dotAccum = 0;
  private dotDisplayTimer = 0;

  constructor(
    scene: Phaser.Scene,
    state: EnemyState,
    pathSystem: SquarePathSystem,
  ) {
    // Get initial position from path
    const pos = pathSystem.getPositionAt(state.pathProgress);
    super(scene, pos.x, pos.y);

    this.enemyState = state;
    this.enemyState.id = `enemy_${enemyCounter++}`;
    this.enemyState.x = pos.x;
    this.enemyState.y = pos.y;
    this.pathSystem = pathSystem;

    // HP bar offset based on enemy size
    this.HP_BAR_OFFSET_Y = -(this.enemyState.size + 6);

    // Create body graphic
    this.bodyGraphics = scene.add.graphics();
    this.add(this.bodyGraphics);
    this.drawBody();

    // Create status effect indicator (colored outlines)
    this.statusIndicator = scene.add.graphics();
    this.add(this.statusIndicator);

    // Create HP bar background
    this.hpBarBg = scene.add.graphics();
    this.add(this.hpBarBg);
    this.hpBarBg.fillStyle(COLORS.HP_BAR_BG, 1);
    this.hpBarBg.fillRect(
      -this.HP_BAR_WIDTH / 2,
      this.HP_BAR_OFFSET_Y,
      this.HP_BAR_WIDTH,
      this.HP_BAR_HEIGHT,
    );

    // Create HP bar fill
    this.hpBarFill = scene.add.graphics();
    this.add(this.hpBarFill);
    this.updateHpBar();

    this.setDepth(10);
    scene.add.existing(this);
  }

  // ---- Update ----

  update(dt: number): void {
    if (!this.isAlive()) return;

    // -- Stun: don't move while stunned
    if (this.enemyState.stunTimer > 0) {
      this.enemyState.stunTimer -= dt;
      if (this.enemyState.stunTimer < 0) this.enemyState.stunTimer = 0;
      this.processDots(dt);
      this.updateVisuals();
      return;
    }

    // -- Freeze: don't move while frozen
    if (this.enemyState.freezeTimer > 0) {
      this.enemyState.freezeTimer -= dt;
      if (this.enemyState.freezeTimer < 0) this.enemyState.freezeTimer = 0;
      this.processDots(dt);
      this.updateVisuals();
      return;
    }

    // -- Movement
    const totalLength = this.pathSystem.getPerimeter();
    // Speed in pixels per second, convert to path progress per second
    let progressSpeed = (totalLength > 0)
      ? (this.enemyState.speed / totalLength)
      : 0;

    // Apply slow
    let slowMult = 1;
    if (this.enemyState.slowTimer > 0) {
      slowMult = 1 - this.enemyState.slowed;
      this.enemyState.slowTimer -= dt;
      if (this.enemyState.slowTimer <= 0) {
        this.enemyState.slowTimer = 0;
        this.enemyState.slowed = 0;
      }
    }
    progressSpeed *= slowMult;

    // Fear: move backward
    if (this.enemyState.fearTimer > 0) {
      progressSpeed = -Math.abs(progressSpeed);
      this.enemyState.fearTimer -= dt;
      if (this.enemyState.fearTimer < 0) this.enemyState.fearTimer = 0;
    }

    // Advance along path
    this.enemyState.pathProgress += progressSpeed * dt;

    // Lap check
    if (this.enemyState.pathProgress >= 1) {
      this.enemyState.laps++;
      this.enemyState.pathProgress -= 1;
    }
    // Backward wrap
    if (this.enemyState.pathProgress < 0) {
      this.enemyState.pathProgress += 1;
    }

    // Update world position from path
    const pos = this.pathSystem.getPositionAt(this.enemyState.pathProgress);
    this.enemyState.x = pos.x;
    this.enemyState.y = pos.y;

    // Process DOT effects
    this.processDots(dt);

    // Update visual representation
    this.updateVisuals();
  }

  // ---- Damage ----

  takeDamage(amount: number, effects?: StatusEffects): void {
    if (!this.isAlive()) return;

    // Apply armor reduction
    const damage = Math.max(1, amount - this.enemyState.armor);
    this.enemyState.hp -= damage;

    // Apply status effects
    if (effects) {
      if (effects.slow) {
        this.enemyState.slowed = Math.max(this.enemyState.slowed, effects.slow.percent);
        this.enemyState.slowTimer = Math.max(this.enemyState.slowTimer, effects.slow.duration);
      }
      if (effects.poison) {
        this.enemyState.poisonDps = Math.max(this.enemyState.poisonDps, effects.poison.dps);
        this.enemyState.poisonTimer = Math.max(this.enemyState.poisonTimer, effects.poison.duration);
      }
      if (effects.burn) {
        this.enemyState.burnDps = Math.max(this.enemyState.burnDps, effects.burn.dps);
        this.enemyState.burnTimer = Math.max(this.enemyState.burnTimer, effects.burn.duration);
      }
      if (effects.bleed) {
        this.enemyState.bleedDps = Math.max(this.enemyState.bleedDps, effects.bleed.dps);
        this.enemyState.bleedTimer = Math.max(this.enemyState.bleedTimer, effects.bleed.duration);
      }
      if (effects.stun != null && effects.stun > 0) {
        this.enemyState.stunTimer = Math.max(this.enemyState.stunTimer, effects.stun);
      }
      if (effects.freeze != null && effects.freeze > 0) {
        this.enemyState.freezeTimer = Math.max(this.enemyState.freezeTimer, effects.freeze);
      }
      if (effects.knockback != null && effects.knockback > 0) {
        // Knockback moves enemy backward on path
        const totalLength = this.pathSystem.getPerimeter();
        if (totalLength > 0) {
          this.enemyState.pathProgress -= effects.knockback / totalLength;
          if (this.enemyState.pathProgress < 0) this.enemyState.pathProgress += 1;
        }
      }
      if (effects.fear != null && effects.fear > 0) {
        this.enemyState.fearTimer = Math.max(this.enemyState.fearTimer, effects.fear);
      }
    }

    eventManager.emit(GameEvent.ENEMY_DAMAGED, this, damage);

    if (this.enemyState.hp <= 0) {
      this.enemyState.hp = 0;
      eventManager.emit(GameEvent.ENEMY_KILLED, this);
    }
  }

  // ---- Queries ----

  isAlive(): boolean {
    return this.enemyState.hp > 0;
  }

  getHpPercent(): number {
    if (this.enemyState.maxHp <= 0) return 0;
    return this.enemyState.hp / this.enemyState.maxHp;
  }

  // ---- Private: DOT Processing ----

  private processDots(dt: number): void {
    let totalDot = 0;

    // Poison
    if (this.enemyState.poisonTimer > 0) {
      totalDot += this.enemyState.poisonDps;
      this.enemyState.poisonTimer -= dt;
      if (this.enemyState.poisonTimer <= 0) {
        this.enemyState.poisonTimer = 0;
        this.enemyState.poisonDps = 0;
      }
    }

    // Burn
    if (this.enemyState.burnTimer > 0) {
      totalDot += this.enemyState.burnDps;
      this.enemyState.burnTimer -= dt;
      if (this.enemyState.burnTimer <= 0) {
        this.enemyState.burnTimer = 0;
        this.enemyState.burnDps = 0;
      }
    }

    // Bleed
    if (this.enemyState.bleedTimer > 0) {
      totalDot += this.enemyState.bleedDps;
      this.enemyState.bleedTimer -= dt;
      if (this.enemyState.bleedTimer <= 0) {
        this.enemyState.bleedTimer = 0;
        this.enemyState.bleedDps = 0;
      }
    }

    if (totalDot > 0) {
      const dotDamage = totalDot * dt;
      this.enemyState.hp -= dotDamage;
      this.dotAccum += dotDamage;

      // Show accumulated DOT damage every 0.5s
      this.dotDisplayTimer -= dt;
      if (this.dotDisplayTimer <= 0) {
        this.dotDisplayTimer = 0.5;
        if (this.dotAccum >= 1) {
          eventManager.emit(GameEvent.ENEMY_DAMAGED, this, Math.round(this.dotAccum));
          this.dotAccum = 0;
        }
      }

      if (this.enemyState.hp <= 0) {
        this.enemyState.hp = 0;
        eventManager.emit(GameEvent.ENEMY_KILLED, this);
      }
    }
  }

  // ---- Private: Visuals ----

  private updateVisuals(): void {
    // Update container position
    this.setPosition(this.enemyState.x, this.enemyState.y);

    // Update HP bar
    this.updateHpBar();

    // Update status indicators
    this.updateStatusIndicators();

    // Alpha change for freeze
    if (this.enemyState.freezeTimer > 0) {
      this.setAlpha(0.6);
    } else if (this.enemyState.stunTimer > 0) {
      this.setAlpha(0.7);
    } else {
      this.setAlpha(1);
    }
  }

  private updateHpBar(): void {
    this.hpBarFill.clear();
    const hpPercent = this.getHpPercent();
    const fillWidth = this.HP_BAR_WIDTH * hpPercent;
    const fillColor = hpPercent > 0.5 ? COLORS.HP_BAR_FILL : COLORS.HP_BAR_LOW;

    this.hpBarFill.fillStyle(fillColor, 1);
    this.hpBarFill.fillRect(
      -this.HP_BAR_WIDTH / 2,
      this.HP_BAR_OFFSET_Y,
      fillWidth,
      this.HP_BAR_HEIGHT,
    );
  }

  private updateStatusIndicators(): void {
    this.statusIndicator.clear();
    const r = this.enemyState.size + 2;

    // Priority: freeze > poison > burn > slow > bleed
    if (this.enemyState.freezeTimer > 0) {
      this.statusIndicator.lineStyle(2, 0x88ddff, 0.8); // cyan
      this.statusIndicator.strokeCircle(0, 0, r);
    } else if (this.enemyState.poisonTimer > 0) {
      this.statusIndicator.lineStyle(2, 0x44ff44, 0.8); // green
      this.statusIndicator.strokeCircle(0, 0, r);
    } else if (this.enemyState.burnTimer > 0) {
      this.statusIndicator.lineStyle(2, 0xff8800, 0.8); // orange
      this.statusIndicator.strokeCircle(0, 0, r);
    } else if (this.enemyState.slowTimer > 0) {
      this.statusIndicator.lineStyle(1.5, 0x4488ff, 0.7); // blue
      this.statusIndicator.strokeCircle(0, 0, r);
    } else if (this.enemyState.bleedTimer > 0) {
      this.statusIndicator.lineStyle(2, 0xff2222, 0.8); // red
      this.statusIndicator.strokeCircle(0, 0, r);
    }
  }

  // ---- Private: Body Drawing ----

  private drawBody(): void {
    this.bodyGraphics.clear();
    const s = this.enemyState.size;
    const c = this.enemyState.color;

    switch (this.enemyState.dataId) {
      case 'normal':
        this.drawNormal(s, c);
        break;
      case 'fast':
        this.drawFast(s, c);
        break;
      case 'tank':
        this.drawTank(s, c);
        break;
      case 'tiny':
        this.drawTiny(s, c);
        break;
      case 'boss':
        this.drawBoss(s, c);
        break;
      default:
        this.drawNormal(s, c);
    }
  }

  /** Normal: 초록 원 + 눈 */
  private drawNormal(size: number, color: number): void {
    // Body
    this.bodyGraphics.fillStyle(color, 1);
    this.bodyGraphics.fillCircle(0, 0, size);
    this.bodyGraphics.lineStyle(1.5, 0x228822, 0.8);
    this.bodyGraphics.strokeCircle(0, 0, size);
    // Eyes
    this.bodyGraphics.fillStyle(0xffffff, 0.9);
    this.bodyGraphics.fillCircle(-size * 0.3, -size * 0.2, size * 0.25);
    this.bodyGraphics.fillCircle(size * 0.3, -size * 0.2, size * 0.25);
    this.bodyGraphics.fillStyle(0x000000, 1);
    this.bodyGraphics.fillCircle(-size * 0.25, -size * 0.2, size * 0.12);
    this.bodyGraphics.fillCircle(size * 0.35, -size * 0.2, size * 0.12);
  }

  /** Fast: 파란 다이아몬드 + 속도 잔상 */
  private drawFast(size: number, color: number): void {
    const g = this.bodyGraphics;
    // Diamond body
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(0, -size * 1.3);
    g.lineTo(size * 0.8, 0);
    g.lineTo(0, size * 0.8);
    g.lineTo(-size * 0.8, 0);
    g.closePath();
    g.fillPath();
    // Outline
    g.lineStyle(1.5, 0x2266dd, 0.9);
    g.beginPath();
    g.moveTo(0, -size * 1.3);
    g.lineTo(size * 0.8, 0);
    g.lineTo(0, size * 0.8);
    g.lineTo(-size * 0.8, 0);
    g.closePath();
    g.strokePath();
    // Speed trail
    g.fillStyle(color, 0.3);
    g.fillTriangle(-size * 0.8, -size * 0.3, -size * 2, 0, -size * 0.8, size * 0.3);
    g.fillStyle(color, 0.15);
    g.fillTriangle(-size * 1.5, -size * 0.2, -size * 2.8, 0, -size * 1.5, size * 0.2);
    // Eye
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(0, -size * 0.3, size * 0.2);
    g.fillStyle(0x000000, 1);
    g.fillCircle(size * 0.05, -size * 0.3, size * 0.1);
  }

  /** Tank: 회색 팔각형 + 방패 무늬 */
  private drawTank(size: number, color: number): void {
    const g = this.bodyGraphics;
    // Octagon body
    g.fillStyle(color, 1);
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 - Math.PI / 8;
      const px = Math.cos(angle) * size;
      const py = Math.sin(angle) * size;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();
    // Heavy border
    g.lineStyle(3, 0xaaaaaa, 0.9);
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 - Math.PI / 8;
      const px = Math.cos(angle) * size;
      const py = Math.sin(angle) * size;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.strokePath();
    // Shield cross
    g.lineStyle(2, 0x555555, 0.6);
    g.lineBetween(0, -size * 0.6, 0, size * 0.6);
    g.lineBetween(-size * 0.6, 0, size * 0.6, 0);
    // Armor rivets
    g.fillStyle(0xbbbbbb, 0.8);
    const rivetR = size * 0.1;
    g.fillCircle(-size * 0.5, -size * 0.5, rivetR);
    g.fillCircle(size * 0.5, -size * 0.5, rivetR);
    g.fillCircle(-size * 0.5, size * 0.5, rivetR);
    g.fillCircle(size * 0.5, size * 0.5, rivetR);
  }

  /** Tiny: 주황 삼각형 (빠르고 작은) */
  private drawTiny(size: number, color: number): void {
    const g = this.bodyGraphics;
    // Triangle body
    g.fillStyle(color, 1);
    g.fillTriangle(0, -size * 1.2, size * 0.9, size * 0.6, -size * 0.9, size * 0.6);
    g.lineStyle(1, 0xcc8833, 0.8);
    g.strokeTriangle(0, -size * 1.2, size * 0.9, size * 0.6, -size * 0.9, size * 0.6);
    // Eye
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(0, 0, size * 0.3);
    g.fillStyle(0x000000, 1);
    g.fillCircle(0, 0, size * 0.15);
  }

  /** Boss: 빨간 왕관형 + 해골 마크 */
  private drawBoss(size: number, color: number): void {
    const g = this.bodyGraphics;
    // Outer aura
    g.fillStyle(0xff0000, 0.1);
    g.fillCircle(0, 0, size * 1.5);
    g.fillStyle(0xff0000, 0.15);
    g.fillCircle(0, 0, size * 1.25);
    // Main body
    g.fillStyle(color, 1);
    g.fillCircle(0, 0, size);
    // Crown spikes
    const spikeCount = 10;
    for (let i = 0; i < spikeCount; i++) {
      const angle = (i / spikeCount) * Math.PI * 2;
      const outerR = size * 1.4;
      const innerR = size;
      const halfAngle = Math.PI / spikeCount;
      const x1 = Math.cos(angle) * outerR;
      const y1 = Math.sin(angle) * outerR;
      const x2 = Math.cos(angle + halfAngle) * innerR;
      const y2 = Math.sin(angle + halfAngle) * innerR;
      const x0 = Math.cos(angle - halfAngle) * innerR;
      const y0 = Math.sin(angle - halfAngle) * innerR;
      g.fillStyle(0xcc0000, 0.9);
      g.fillTriangle(x0, y0, x1, y1, x2, y2);
    }
    // Inner dark circle
    g.fillStyle(0x220000, 0.7);
    g.fillCircle(0, 0, size * 0.6);
    // Skull eyes
    g.fillStyle(0xff4444, 1);
    g.fillCircle(-size * 0.25, -size * 0.15, size * 0.18);
    g.fillCircle(size * 0.25, -size * 0.15, size * 0.18);
    // Skull nose
    g.fillTriangle(0, size * 0.05, -size * 0.08, size * 0.2, size * 0.08, size * 0.2);
    // Glowing outline
    g.lineStyle(2.5, 0xff6666, 0.9);
    g.strokeCircle(0, 0, size);
  }

  // ---- Cleanup ----

  destroy(fromScene?: boolean): void {
    this.bodyGraphics.destroy();
    this.hpBarBg.destroy();
    this.hpBarFill.destroy();
    this.statusIndicator.destroy();
    super.destroy(fromScene);
  }
}
