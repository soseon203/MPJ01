// ============================================================
// 라스트타워 - Projectile: 투사체 엔티티
// ============================================================

import Phaser from 'phaser';
import { GameEvent } from '@/utils/types';
import { eventManager } from '@/managers/EventManager';
import { Enemy, StatusEffects } from '@/entities/Enemy';

// ---- Projectile Effects Interface ----

export interface ProjectileEffects {
  splash?: number;                              // splash radius in pixels
  slow?: { percent: number; duration: number };
  poison?: { dps: number; duration: number };
  burn?: { dps: number; duration: number };
  bleed?: { dps: number; duration: number };
  stun?: number;                                // duration
  chain?: { count: number; damageRatio: number };
  pierce?: number;                              // remaining pierce count
  knockback?: number;
  isCrit?: boolean;
  isMissile?: boolean;
}

let projectileCounter = 0;

export class Projectile extends Phaser.GameObjects.Container {
  target: Enemy | null;

  private damage: number;
  private speed: number;
  private color: number;
  private effects: ProjectileEffects;
  private bodyGraphics: Phaser.GameObjects.Graphics;
  private trailTimer = 0;
  private pierceRemaining: number;
  private chainHitIds: Set<string> = new Set();
  private readonly id: string;

  get hasStun(): boolean { return (this.effects.stun ?? 0) > 0; }
  get splashRadius(): number { return this.effects.splash ?? 0; }
  get projectileColor(): number { return this.color; }
  get isMissile(): boolean { return this.effects.isMissile === true; }

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    targetEnemy: Enemy,
    damage: number,
    speed: number,
    color: number,
    effects: ProjectileEffects,
  ) {
    super(scene, x, y);

    this.id = `proj_${projectileCounter++}`;
    this.target = targetEnemy;
    this.damage = damage;
    this.speed = speed;
    this.color = color;
    this.effects = { ...effects };
    this.pierceRemaining = effects.pierce ?? 0;

    // Track initial target for chain exclusion
    if (targetEnemy) {
      this.chainHitIds.add(targetEnemy.enemyState.id);
    }

    // Create visual
    this.bodyGraphics = scene.add.graphics();
    this.add(this.bodyGraphics);
    this.drawProjectile();

    this.setDepth(15);
    scene.add.existing(this);
  }

  // ---- Update ----

  update(dt: number, enemies: Enemy[] = []): boolean {

    // If target is dead, find nearest enemy or self-destruct
    if (!this.target || !this.target.isAlive()) {
      this.target = this.findNearestEnemy(enemies);
      if (!this.target) {
        this.destroy();
        return true; // signal removal
      }
    }

    // Move toward target
    const tx = this.target.enemyState.x;
    const ty = this.target.enemyState.y;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 8) {
      // Hit!
      return this.onHit(enemies);
    }

    // Move
    const moveX = (dx / dist) * this.speed * dt;
    const moveY = (dy / dist) * this.speed * dt;
    this.x += moveX;
    this.y += moveY;

    // Rotate toward target
    const angle = Math.atan2(dy, dx);
    this.setRotation(angle);

    // Trail particles
    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = 0.04;
      this.spawnTrail();
    }

    return false; // still alive
  }

  // ---- Hit Logic ----

  /**
   * Returns true if the projectile should be removed from the game.
   */
  private onHit(enemies: Enemy[]): boolean {
    const hitEnemies: Enemy[] = [];

    // Build status effects to pass to enemy
    const statusEffects = this.buildStatusEffects();

    // === Splash damage ===
    if (this.effects.splash && this.effects.splash > 0) {
      const splashR = this.effects.splash;
      for (const enemy of enemies) {
        if (!enemy.isAlive()) continue;
        const dx = enemy.enemyState.x - this.x;
        const dy = enemy.enemyState.y - this.y;
        if (Math.sqrt(dx * dx + dy * dy) <= splashR) {
          enemy.takeDamage(this.damage, statusEffects);
          hitEnemies.push(enemy);
        }
      }
    } else {
      // Single target damage
      if (this.target && this.target.isAlive()) {
        this.target.takeDamage(this.damage, statusEffects);
        hitEnemies.push(this.target);
      }
    }

    // === Chain (starts from impact point even if target died) ===
    if (this.effects.chain && this.effects.chain.count > 0) {
      this.processChain(enemies, hitEnemies, this.target);
    }

    // === Pierce ===
    if (this.pierceRemaining > 0) {
      this.pierceRemaining--;
      // Mark current target as hit for chain tracking
      if (this.target) {
        this.chainHitIds.add(this.target.enemyState.id);
      }
      // Find next target to pierce through
      this.target = this.findNearestEnemy(enemies, this.chainHitIds);
      if (this.target) {
        eventManager.emit(GameEvent.PROJECTILE_HIT, this);
        return false; // projectile continues
      }
    }

    eventManager.emit(GameEvent.PROJECTILE_HIT, this);
    this.destroy();
    return true; // projectile consumed
  }

  private buildStatusEffects(): StatusEffects {
    const fx: StatusEffects = {};

    if (this.effects.slow) {
      fx.slow = { ...this.effects.slow };
    }
    if (this.effects.poison) {
      fx.poison = { ...this.effects.poison };
    }
    if (this.effects.burn) {
      fx.burn = { ...this.effects.burn };
    }
    if (this.effects.bleed) {
      fx.bleed = { ...this.effects.bleed };
    }
    if (this.effects.stun != null && this.effects.stun > 0) {
      fx.stun = this.effects.stun;
    }
    if (this.effects.knockback != null && this.effects.knockback > 0) {
      fx.knockback = this.effects.knockback;
    }

    return fx;
  }

  private processChain(enemies: Enemy[], alreadyHit: Enemy[], originTarget: Enemy | null): void {
    if (!this.effects.chain) return;

    let chainsLeft = this.effects.chain.count;
    const damageRatio = this.effects.chain.damageRatio;
    const hitSet = new Set(alreadyHit.map(e => e.enemyState.id));
    let chainDamage = Math.round(this.damage * damageRatio);
    // Use first hit enemy, or fallback to original target for position reference
    let lastHit: Enemy | null = alreadyHit[0] || originTarget;
    if (!lastHit) return;

    // Chain range: use a generous search radius
    const chainRange = 200;

    while (chainsLeft > 0 && lastHit) {
      let nearest: Enemy | null = null;
      let minDist = Infinity;

      for (const enemy of enemies) {
        if (!enemy.isAlive() || hitSet.has(enemy.enemyState.id)) continue;
        const dx = enemy.enemyState.x - lastHit.enemyState.x;
        const dy = enemy.enemyState.y - lastHit.enemyState.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= chainRange && dist < minDist) {
          minDist = dist;
          nearest = enemy;
        }
      }

      if (!nearest) break;

      // Apply chain damage with status effects
      const chainFx = this.buildStatusEffects();
      nearest.takeDamage(chainDamage, chainFx);

      // Draw chain visual (lightning bolt effect)
      this.drawChainVisual(
        lastHit.enemyState.x, lastHit.enemyState.y,
        nearest.enemyState.x, nearest.enemyState.y,
      );

      hitSet.add(nearest.enemyState.id);
      lastHit = nearest;
      chainsLeft--;
      chainDamage = Math.round(chainDamage * damageRatio); // diminishing per chain
    }
  }

  // ---- Helpers ----

  private findNearestEnemy(
    enemies: Enemy[],
    excludeIds?: Set<string>,
  ): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = Infinity;

    for (const enemy of enemies) {
      if (!enemy.isAlive()) continue;
      if (excludeIds && excludeIds.has(enemy.enemyState.id)) continue;

      const dx = enemy.enemyState.x - this.x;
      const dy = enemy.enemyState.y - this.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearest = enemy;
      }
    }

    return nearest;
  }

  // ---- Visuals ----

  private drawProjectile(): void {
    this.bodyGraphics.clear();

    if (this.effects.isMissile) {
      this.drawMissile();
      return;
    }

    if (this.effects.isCrit) {
      // Crit projectile: larger, brighter
      this.bodyGraphics.fillStyle(0xffffff, 0.9);
      this.bodyGraphics.fillCircle(0, 0, 5);
      this.bodyGraphics.fillStyle(this.color, 1);
      this.bodyGraphics.fillCircle(0, 0, 4);
    } else {
      // Normal projectile: small colored circle
      this.bodyGraphics.fillStyle(this.color, 1);
      this.bodyGraphics.fillCircle(0, 0, 3);
      this.bodyGraphics.lineStyle(1, 0xffffff, 0.4);
      this.bodyGraphics.strokeCircle(0, 0, 3);
    }
  }

  private drawMissile(): void {
    const g = this.bodyGraphics;
    const isCrit = this.effects.isCrit;
    const s = isCrit ? 1.4 : 1; // crit missiles are bigger

    // Exhaust glow (drawn first, behind body)
    g.fillStyle(0xff6600, 0.6);
    g.fillCircle(-7 * s, 0, 3.5 * s);
    g.fillStyle(0xffcc00, 0.5);
    g.fillCircle(-6 * s, 0, 2 * s);

    // Missile body — elongated diamond/arrow
    g.fillStyle(this.color, 1);
    g.beginPath();
    g.moveTo(9 * s, 0);         // nose
    g.lineTo(-2 * s, -3.5 * s); // top shoulder
    g.lineTo(-5 * s, -2 * s);   // top fin root
    g.lineTo(-7 * s, -4 * s);   // top fin tip
    g.lineTo(-5 * s, 0);        // tail center
    g.lineTo(-7 * s, 4 * s);    // bottom fin tip
    g.lineTo(-5 * s, 2 * s);    // bottom fin root
    g.lineTo(-2 * s, 3.5 * s);  // bottom shoulder
    g.closePath();
    g.fillPath();

    // White nose highlight
    g.fillStyle(0xffffff, 0.7);
    g.beginPath();
    g.moveTo(9 * s, 0);
    g.lineTo(4 * s, -1.5 * s);
    g.lineTo(4 * s, 1.5 * s);
    g.closePath();
    g.fillPath();

    // Outline
    g.lineStyle(1, 0xffffff, isCrit ? 0.5 : 0.25);
    g.beginPath();
    g.moveTo(9 * s, 0);
    g.lineTo(-2 * s, -3.5 * s);
    g.lineTo(-5 * s, 0);
    g.lineTo(-2 * s, 3.5 * s);
    g.closePath();
    g.strokePath();
  }

  private spawnTrail(): void {
    if (this.effects.isMissile) {
      this.spawnMissileTrail();
      return;
    }

    const trail = this.scene.add.graphics();
    trail.fillStyle(this.color, 0.4);
    trail.fillCircle(0, 0, 2);
    trail.setPosition(this.x, this.y);
    trail.setDepth(14);

    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: 180,
      onComplete: () => trail.destroy(),
    });
  }

  private spawnMissileTrail(): void {
    const jx = (Math.random() - 0.5) * 4;
    const jy = (Math.random() - 0.5) * 4;

    // Smoke particle — gray, expands and fades
    const smoke = this.scene.add.graphics();
    const smokeR = 2.5 + Math.random() * 2;
    smoke.fillStyle(0x888888, 0.45);
    smoke.fillCircle(0, 0, smokeR);
    smoke.setPosition(this.x + jx, this.y + jy);
    smoke.setDepth(13);

    this.scene.tweens.add({
      targets: smoke,
      alpha: 0,
      scaleX: 2.2,
      scaleY: 2.2,
      duration: 350,
      onComplete: () => smoke.destroy(),
    });

    // Fire particle — orange, shrinks fast
    const fire = this.scene.add.graphics();
    fire.fillStyle(0xff6600, 0.8);
    fire.fillCircle(0, 0, 2);
    fire.fillStyle(0xffcc00, 0.5);
    fire.fillCircle(0, 0, 1);
    fire.setPosition(this.x + jx * 0.5, this.y + jy * 0.5);
    fire.setDepth(14);

    this.scene.tweens.add({
      targets: fire,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 0.3,
      duration: 150,
      onComplete: () => fire.destroy(),
    });
  }

  private drawChainVisual(
    x1: number, y1: number,
    x2: number, y2: number,
  ): void {
    const gfx = this.scene.add.graphics();
    gfx.lineStyle(2, 0x88ccff, 0.8);
    gfx.lineBetween(x1, y1, x2, y2);
    gfx.setDepth(16);

    // Fade out chain visual
    this.scene.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 250,
      onComplete: () => gfx.destroy(),
    });
  }

  // ---- Cleanup ----

  destroy(fromScene?: boolean): void {
    this.bodyGraphics.destroy();
    this.target = null;
    super.destroy(fromScene);
  }
}
