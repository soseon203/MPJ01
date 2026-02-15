// ============================================================
// 라스트타워 - 상수 정의
// ============================================================

// ---- Screen ----
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const PORTRAIT_WIDTH = 720;
export const PORTRAIT_HEIGHT = 1280;

// ---- Tower ----
export const TOWER_MAX_LEVEL = 10;

// ---- Square Path ----
export const PATH_MARGIN = 180;

// ---- Game Rules ----
export const MAX_ENEMIES_ON_SCREEN = 50;
export const STARTING_GOLD = 0;

// ---- EXP Table ----
export const EXP_TABLE: number[] = [
  0, 200, 500, 1000, 1800, 3000, 5000, 8000, 13000, 20000,
];

// ---- Tower Level Stats ----
export const TOWER_LEVEL_STATS = [
  { damage: 10, fireRate: 1.0, range: 150 },
  { damage: 14, fireRate: 1.1, range: 158 },
  { damage: 18, fireRate: 1.2, range: 166 },
  { damage: 23, fireRate: 1.3, range: 174 },
  { damage: 28, fireRate: 1.4, range: 182 },
  { damage: 34, fireRate: 1.5, range: 190 },
  { damage: 40, fireRate: 1.6, range: 198 },
  { damage: 47, fireRate: 1.8, range: 206 },
  { damage: 55, fireRate: 2.0, range: 214 },
  { damage: 65, fireRate: 2.2, range: 225 },
];

// ---- Skill Costs ----
export const SKILL_COSTS: Record<string, number> = {
  normal: 20, magic: 60, rare: 150, unique: 400, mythic: 750, legend: 1000,
};

// ---- Rarity Colors ----
export const RARITY_COLORS: Record<string, number> = {
  normal: 0xcccccc, magic: 0x4488ff, rare: 0xffcc00,
  unique: 0x44dd44, mythic: 0xcc44ff, legend: 0xff8800,
};

export const RARITY_COLOR_STRINGS: Record<string, string> = {
  normal: '#cccccc', magic: '#4488ff', rare: '#ffcc00',
  unique: '#44dd44', mythic: '#cc44ff', legend: '#ff8800',
};

// ---- Shop Probabilities [normal, magic, rare, unique, mythic, legend] ----
export const SHOP_PROBABILITIES: Record<string, number[]> = {
  'w0':  [0.40, 0.35, 0.18, 0.06, 0.01, 0.00],
  'w10': [0.40, 0.35, 0.18, 0.06, 0.01, 0.00],
  'w20': [0.25, 0.35, 0.25, 0.12, 0.025, 0.005],
  'w30': [0.15, 0.28, 0.30, 0.18, 0.07, 0.02],
  'w40': [0.08, 0.20, 0.30, 0.22, 0.14, 0.06],
};

// Tower level bonus [rare, unique, mythic, legend]
export const LEVEL_SHOP_BONUS: number[][] = [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0.02, 0.01, 0, 0],
  [0.04, 0.02, 0.01, 0],
  [0.05, 0.04, 0.02, 0],
  [0.06, 0.05, 0.03, 0.01],
  [0.07, 0.07, 0.05, 0.02],
  [0.08, 0.09, 0.07, 0.03],
  [0.10, 0.12, 0.10, 0.05],
];

// Initial selection (Normal~Rare only)
export const INITIAL_SELECT_1: number[] = [0.60, 0.35, 0.05, 0, 0, 0];
export const INITIAL_SELECT_2: number[] = [0.40, 0.45, 0.15, 0, 0, 0];

// ---- Shop ----
export const SHOP_UNLOCK_WAVES = 5;
export const SHOP_UNLOCK_KILLS = 30;
export const SHOP_CARD_COUNT = 4;

export const EXP_PURCHASE_OPTIONS = [
  { exp: 50,  cost: 30,  label: 'EXP +50' },
  { exp: 150, cost: 80,  label: 'EXP +150' },
  { exp: 500, cost: 250, label: 'EXP +500' },
];

// ---- UI ----
export const UI_PANEL_WIDTH = 240;

// ---- Orb System ----
export const ORB_ORBIT_RADIUS = 80;
export const ORB_ORBIT_SPEED = 0.5;
export const ORB_BASE_SIZE = 12;
export const ORB_MAX_SIZE = 24;

// ---- Colors ----
export const COLORS = {
  BG: 0x0f0f23,
  UI_BG: 0x1a1a35,
  UI_BORDER: 0x3a3a5c,
  PATH_COLOR: 0x2a2a4a,
  PATH_BORDER: 0x4a4a7a,
  TOWER_BASE: 0xffd700,
  TOWER_GLOW: 0xffee88,
  HP_BAR_BG: 0x333333,
  HP_BAR_FILL: 0x44ff44,
  HP_BAR_LOW: 0xff4444,
  EXP_BAR_BG: 0x333355,
  EXP_BAR_FILL: 0x8888ff,
  GOLD: 0xffd700,
  TEXT: 0xffffff,
  TEXT_DIM: 0x888888,
  BUTTON: 0x4466aa,
  BUTTON_HOVER: 0x5577bb,
  BUTTON_DISABLED: 0x333344,
  SHOP_BG: 0x000000,
  SHOP_CARD_BG: 0x1a1a2e,
};

export const FONT_FAMILY = 'monospace';
