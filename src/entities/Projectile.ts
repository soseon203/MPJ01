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

    // === Chain ===
    if (this.effects.chain && this.effects.chain.count > 0) {
      this.processChain(enemies, hitEnemies);
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

  private processChain(enemies: Enemy[], alreadyHit: Enemy[]): void {
    if (!this.effects.chain) return;

    let chainsLeft = this.effects.chain.count;
    const damageRatio = this.effects.chain.damageRatio;
    const hitSet = new Set(alreadyHit.map(e => e.enemyState.id));
    let chainDamage = Math.round(this.damage * damageRatio);
    let lastHit = alreadyHit[0];

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

  private spawnTrail(): void {
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
