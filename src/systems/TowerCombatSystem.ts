// ============================================================
// 라스트타워 - TowerCombatSystem: 타워 전투 로직 및 스킬 효과
// ============================================================

import {
  TowerState,
  OwnedSkill,
  SkillData,
  SkillId,
  TargetingStrategy,
  getSkillEffect,
} from '@/utils/types';
import { TOWER_LEVEL_STATS } from '@/utils/constants';

// ---- Computed Stats Interface ----

export interface ComputedTowerStats {
  damage: number;
  fireRate: number;       // attacks per second
  range: number;
  critChance: number;
  critDamage: number;
  multiShot: number;      // extra projectiles
  splashRadius: number;
  chainCount: number;
  chainDamageRatio: number;
  pierceCount: number;
  // DOT
  fireDps: number;
  poisonDps: number;
  bleedDps: number;
  dotDuration: number;
  // CC
  slowPercent: number;
  slowDuration: number;
  stunDuration: number;
  knockback: number;
  // Special
  executeThreshold: number;
  goldBonusPercent: number;
  expBonusPercent: number;
  maxEnemiesBonus: number;
  // Active orb skill ids
  activeOrbSkills: SkillId[];
}

// ---- Enemy reference for targeting ----

interface TargetableEnemy {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  pathProgress: number;
  id: string;
}

// ---- TowerCombatSystem ----

export class TowerCombatSystem {

  /**
   * Compute aggregate stats from tower base stats + all passive skill bonuses.
   */
  getComputedStats(
    towerState: TowerState,
    activeSkills: OwnedSkill[],
    skillDataMap: Record<string, SkillData>,
  ): ComputedTowerStats {
    // Base stats from tower level (0-indexed array)
    const levelIdx = Math.min(
      Math.max(towerState.level - 1, 0),
      TOWER_LEVEL_STATS.length - 1,
    );
    const base = TOWER_LEVEL_STATS[levelIdx];

    // Accumulators for flat bonuses
    let flatDamage = 0;
    let flatFireRate = 0;
    let flatRange = 0;

    // Accumulators for percent multipliers (additive, applied at end)
    let damagePercent = 0;
    let fireRatePercent = 0;
    let rangePercent = 0;

    // Derived stats
    let critChance = 0;
    let critDamage = 1.5; // base crit multiplier
    let multiShot = 0;
    let splashRadius = 0;
    let chainCount = 0;
    let chainDamageRatio = 0.7;
    let pierceCount = 0;

    // DOT
    let fireDps = 0;
    let poisonDps = 0;
    let bleedDps = 0;
    let dotDuration = 3; // default dot duration seconds

    // CC
    let slowPercent = 0;
    let slowDuration = 0;
    let stunDuration = 0;
    let knockback = 0;

    // Special
    let executeThreshold = 0;
    let goldBonusPercent = 0;
    let expBonusPercent = 0;
    let maxEnemiesBonus = 0;

    const activeOrbSkills: SkillId[] = [];

    // Aggregate all owned skill effects
    for (const owned of activeSkills) {
      const data = skillDataMap[owned.id];
      if (!data) continue;

      if (!data.passive) {
        // Active orb skill
        activeOrbSkills.push(owned.id);
        continue;
      }

      // Passive skill: accumulate effects
      const lvl = owned.level;
      const eff = (key: string) => getSkillEffect(data, lvl, key);

      // Damage
      flatDamage += eff('flatDamage');
      damagePercent += eff('damagePercent');

      // Fire rate
      flatFireRate += eff('flatFireRate');
      fireRatePercent += eff('fireRatePercent');

      // Range
      flatRange += eff('flatRange');
      rangePercent += eff('rangePercent');

      // Crit
      critChance += eff('critChance');
      critDamage += eff('critDamage');

      // Multi-shot / splash / chain / pierce
      multiShot += eff('multiShot');
      splashRadius += eff('splashRadius');
      chainCount += eff('chainCount');
      if (eff('chainDamageRatio') > 0) {
        chainDamageRatio = eff('chainDamageRatio');
      }
      pierceCount += eff('pierceCount');

      // DOT
      fireDps += eff('fireDps');
      poisonDps += eff('poisonDps');
      bleedDps += eff('bleedDps');
      dotDuration += eff('dotDuration');

      // CC
      slowPercent += eff('slowPercent');
      slowDuration += eff('slowDuration');
      stunDuration += eff('stunDuration');
      knockback += eff('knockback');

      // Special
      executeThreshold += eff('executeThreshold');
      goldBonusPercent += eff('goldBonusPercent');
      expBonusPercent += eff('expBonusPercent');
      maxEnemiesBonus += eff('maxEnemiesBonus');
    }

    // Compute final values: base + flat, then multiply by percent bonus
    const damage = Math.max(1, Math.round(
      (base.damage + flatDamage) * (1 + damagePercent / 100),
    ));
    const fireRate = Math.max(0.1,
      (base.fireRate + flatFireRate) * (1 + fireRatePercent / 100),
    );
    const range = Math.max(50,
      (base.range + flatRange) * (1 + rangePercent / 100),
    );

    return {
      damage,
      fireRate,
      range,
      critChance: Math.min(critChance, 1), // cap at 100%
      critDamage,
      multiShot,
      splashRadius,
      chainCount: Math.floor(chainCount),
      chainDamageRatio,
      pierceCount: Math.floor(pierceCount),
      fireDps,
      poisonDps,
      bleedDps,
      dotDuration: Math.max(0, dotDuration),
      slowPercent: Math.min(slowPercent, 0.9), // cap at 90%
      slowDuration,
      stunDuration,
      knockback,
      executeThreshold: Math.min(executeThreshold, 0.5), // cap at 50%
      goldBonusPercent,
      expBonusPercent,
      maxEnemiesBonus: Math.floor(maxEnemiesBonus),
      activeOrbSkills,
    };
  }

  /**
   * Find the best target enemy based on targeting strategy.
   * Returns enemy id or null if no valid target.
   */
  findTarget(
    towerX: number,
    towerY: number,
    range: number,
    enemies: TargetableEnemy[],
    strategy: TargetingStrategy,
  ): string | null {
    let bestId: string | null = null;
    let bestScore = -Infinity;

    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;

      const dx = enemy.x - towerX;
      const dy = enemy.y - towerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > range) continue;

      let score: number;
      switch (strategy) {
        case 'first':
          // Highest path progress = furthest along
          score = enemy.pathProgress;
          break;
        case 'last':
          // Lowest path progress
          score = -enemy.pathProgress;
          break;
        case 'closest':
          // Nearest to tower
          score = -dist;
          break;
        case 'strongest':
          // Highest current HP
          score = enemy.hp;
          break;
        default:
          score = enemy.pathProgress;
      }

      if (score > bestScore) {
        bestScore = score;
        bestId = enemy.id;
      }
    }

    return bestId;
  }

  /**
   * Roll for crit and calculate damage.
   */
  calculateDamage(
    baseDamage: number,
    critChance: number,
    critDamage: number,
  ): { damage: number; isCrit: boolean } {
    const roll = Math.random();
    if (roll < critChance) {
      return {
        damage: Math.round(baseDamage * critDamage),
        isCrit: true,
      };
    }
    return {
      damage: baseDamage,
      isCrit: false,
    };
  }

  /**
   * Check if an enemy should be instantly executed based on HP threshold.
   */
  shouldExecute(enemyHpPercent: number, threshold: number): boolean {
    return threshold > 0 && enemyHpPercent <= threshold;
  }
}
