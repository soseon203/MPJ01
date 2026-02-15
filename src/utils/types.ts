// ============================================================
// 라스트타워 - 타입 정의
// ============================================================

// ---- Skill System ----
export type SkillId =
  // Normal (11)
  | 'rapid_fire' | 'power_shot' | 'long_range' | 'sharp_bullet'
  | 'tough_skin' | 'exp_boost' | 'focus_aim'
  | 'quick_reload' | 'iron_wall' | 'scavenger' | 'steady_hand'
  // Magic (12)
  | 'burn_shot' | 'ember_blast' | 'frost_shot' | 'chill_aura'
  | 'shock_shot' | 'poison_shot' | 'thorn_shot'
  | 'shadow_bolt' | 'splash_shot' | 'critical_strike'
  | 'bleed_shot' | 'wind_shot'
  // Rare (13)
  | 'chain_lightning' | 'pierce_shot' | 'multi_shot' | 'homing_missile' | 'static_charge'
  | 'frozen_field' | 'poison_cloud' | 'fire_trail' | 'shadow_strike'
  | 'thunder_storm' | 'vine_trap' | 'ricochet' | 'blizzard'
  // Unique (9)
  | 'execute' | 'soul_harvest' | 'mirror_orb'
  | 'overcharge' | 'berserker' | 'ice_age' | 'plague_bearer'
  | 'inferno_core' | 'void_rift'
  // Mythic (7)
  | 'elemental_fusion' | 'death_mark' | 'chain_reaction' | 'eternal_winter'
  | 'phantom_army' | 'wildfire' | 'toxic_evolution'
  // Legend (8)
  | 'apocalypse' | 'time_warp' | 'black_hole' | 'infinity_chain'
  | 'dragon_breath' | 'world_tree' | 'absolute_zero' | 'storm_lord';

export type SkillRarity = 'normal' | 'magic' | 'rare' | 'unique' | 'mythic' | 'legend';

export type SkillTag =
  | 'DOT' | 'CC' | 'AOE' | 'SINGLE' | 'SPEED' | 'CRIT'
  | 'CHAIN' | 'PROJECTILE' | 'ECONOMY' | 'SUMMON' | 'SCALE'
  | 'DEBUFF' | 'DEFENSE' | 'FORCE';

export type ElementTag = 'FIRE' | 'ICE' | 'LIGHTNING' | 'NATURE' | 'DARK';

export interface SkillEffectDef {
  base: number;
  perLevel: number;
}

export interface SkillData {
  id: SkillId;
  name: string;
  description: string;
  rarity: SkillRarity;
  tags: (SkillTag | ElementTag)[];
  baseCost: number;
  maxLevel: number;
  passive: boolean;
  color: number;
  effects: Record<string, SkillEffectDef>;
}

export interface OwnedSkill {
  id: SkillId;
  level: number;
  fusedFrom?: SkillId[];  // 합성 원료 스킬 ID 목록
  fusionBonus?: number;   // 합성 보너스 배율 (1.5 or 2.0)
}

// ---- Tower ----
export type TargetingStrategy = 'first' | 'last' | 'closest' | 'strongest';

export interface TowerState {
  level: number;
  exp: number;
  expToNext: number;
  baseDamage: number;
  baseFireRate: number;
  baseRange: number;
  skills: OwnedSkill[];
  kills: number;
  targeting: TargetingStrategy;
}

// ---- Enemy ----
export type EnemyId = 'normal' | 'fast' | 'tank' | 'tiny' | 'boss';

export interface EnemyData {
  id: EnemyId;
  name: string;
  baseHp: number;
  speed: number;
  expReward: number;
  color: number;
  size: number;
  armor?: number;
}

export interface EnemyState {
  id: string;
  dataId: EnemyId;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  armor: number;
  expReward: number;
  pathProgress: number;
  laps: number;
  // Status effects
  slowed: number;
  slowTimer: number;
  poisonDps: number;
  poisonTimer: number;
  burnDps: number;
  burnTimer: number;
  bleedDps: number;
  bleedTimer: number;
  stunTimer: number;
  freezeTimer: number;
  chillStacks: number;
  fearTimer: number;
  // Visual
  x: number;
  y: number;
  size: number;
  color: number;
}

// ---- Shop ----
export interface ShopCard {
  skillId: SkillId;
  isUpgrade: boolean;
  currentLevel: number;
  rarity: SkillRarity;
  isEvolution?: boolean;  // 진화 카드 여부
}

// ---- Synergy ----
export interface TagRequirement {
  tag: SkillTag | ElementTag;
  count: number;
}

export interface SynergyData {
  id: string;
  name: string;
  description: string;
  requirements: TagRequirement[];
  tier: 'basic' | 'element' | 'advanced';
}

export interface ActiveSynergy {
  id: string;
  name: string;
  description: string;
  tier: 'basic' | 'element' | 'advanced';
  requirements: TagRequirement[];
}

// ---- Wave ----
export interface WaveEnemyGroup {
  type: EnemyId;
  count: number;
  interval: number;
  delay: number;
  hpMultiplier: number;
  speedMultiplier: number;
}

export interface WaveConfig {
  waveNumber: number;
  groups: WaveEnemyGroup[];
  isBossWave: boolean;
}

// ---- Layout ----
export type LayoutMode = 'landscape' | 'portrait';

export interface GameLayout {
  mode: LayoutMode;
  gameWidth: number;
  gameHeight: number;
  gameAreaWidth: number;
  gameAreaHeight: number;
  uiPanelX: number;
  uiPanelY: number;
  uiPanelWidth: number;
  uiPanelHeight: number;
  towerX: number;
  towerY: number;
  pathMargin: number;
  pathRect: { x1: number; y1: number; x2: number; y2: number };
}

// ---- Game Events ----
export enum GameEvent {
  ENEMY_SPAWNED = 'enemy_spawned',
  ENEMY_KILLED = 'enemy_killed',
  ENEMY_DAMAGED = 'enemy_damaged',
  PROJECTILE_FIRED = 'projectile_fired',
  PROJECTILE_HIT = 'projectile_hit',
  WAVE_START = 'wave_start',
  WAVE_COMPLETE = 'wave_complete',

  EXP_GAINED = 'exp_gained',
  LEVEL_UP = 'level_up',
  SKILL_PURCHASED = 'skill_purchased',
  SKILL_UPGRADED = 'skill_upgraded',
  SKILL_REPLACED = 'skill_replaced',
  SKILL_REMOVED = 'skill_removed',
  SYNERGY_ACTIVATED = 'synergy_activated',
  SYNERGY_DEACTIVATED = 'synergy_deactivated',
  SHOP_OPENED = 'shop_opened',
  SHOP_CLOSED = 'shop_closed',
  TARGETING_CHANGED = 'targeting_changed',
  GAME_OVER = 'game_over',
  GAME_START = 'game_start',
  INITIAL_SELECTION_DONE = 'initial_selection_done',
}

// ---- Helpers ----
export function getSkillEffect(skill: SkillData, level: number, key: string): number {
  const def = skill.effects[key];
  if (!def) return 0;
  return def.base + def.perLevel * (level - 1);
}

export const MAX_SKILL_SLOTS = 8;
