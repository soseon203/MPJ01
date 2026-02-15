// ============================================================
// 라스트타워 - 상수 정의
// ============================================================

import type { LayoutMode, GameLayout } from './types';

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
export const MAX_ENEMIES_ON_SCREEN = 100;
export const WAVE_TIME_LIMIT = 30; // 30초 후 다음 웨이브 강제 시작
export const ENEMIES_PER_WAVE = 50; // 웨이브당 기본 적 수 (웨이브에 따라 증가)

// ---- EXP Table ----
export const EXP_TABLE: number[] = [
  0, 28, 70, 126, 210, 322, 476, 672, 945, 1295,
];

// ---- Tower Level Stats ----
export const TOWER_LEVEL_STATS = [
  { damage: 12, fireRate: 2.0, range: 190 },
  { damage: 16, fireRate: 2.3, range: 198 },
  { damage: 21, fireRate: 2.6, range: 206 },
  { damage: 23, fireRate: 2.9, range: 210 },
  { damage: 28, fireRate: 3.2, range: 212 },
  { damage: 34, fireRate: 3.5, range: 220 },
  { damage: 40, fireRate: 3.8, range: 228 },
  { damage: 47, fireRate: 4.2, range: 236 },
  { damage: 55, fireRate: 4.6, range: 244 },
  { damage: 65, fireRate: 5.0, range: 255 },
];

// ---- Skill Costs ----
export const SKILL_COSTS: Record<string, number> = {
  normal: 50, magic: 130, rare: 350, unique: 800, mythic: 1800, legend: 4000,
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
  'w0':  [0.50, 0.35, 0.12, 0.03, 0.00, 0.00],
  'w10': [0.42, 0.35, 0.16, 0.06, 0.01, 0.00],
  'w20': [0.32, 0.33, 0.22, 0.10, 0.025, 0.005],
  'w30': [0.24, 0.30, 0.26, 0.14, 0.05, 0.01],
  'w50': [0.16, 0.26, 0.28, 0.18, 0.09, 0.03],
  'w70': [0.10, 0.22, 0.28, 0.22, 0.13, 0.05],
  'w100': [0.05, 0.15, 0.26, 0.26, 0.18, 0.10],
};

// Tower level bonus [rare, unique, mythic, legend]
// Levels 1-10 use table, 11+ use formula (diminishing returns)
export const LEVEL_SHOP_BONUS: number[][] = [
  [0, 0, 0, 0],       // Lv1
  [0, 0, 0, 0],       // Lv2
  [0.01, 0.005, 0, 0],  // Lv3
  [0.02, 0.01, 0, 0],   // Lv4
  [0.03, 0.015, 0.005, 0], // Lv5
  [0.04, 0.02, 0.01, 0],   // Lv6
  [0.05, 0.03, 0.015, 0.005], // Lv7
  [0.06, 0.04, 0.02, 0.01],   // Lv8
  [0.07, 0.05, 0.03, 0.015],  // Lv9
  [0.08, 0.06, 0.04, 0.02],   // Lv10
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

// ---- Layout Computation ----
export function computeGameLayout(mode: LayoutMode): GameLayout {
  if (mode === 'portrait') {
    const gw = PORTRAIT_WIDTH;
    const gh = PORTRAIT_HEIGHT;
    const gameAreaW = gw;
    const gameAreaH = gw; // square game area at top
    const towerX = gameAreaW / 2;
    const towerY = gameAreaH / 2;
    return {
      mode: 'portrait',
      gameWidth: gw, gameHeight: gh,
      gameAreaWidth: gameAreaW, gameAreaHeight: gameAreaH,
      uiPanelX: 0, uiPanelY: gameAreaH,
      uiPanelWidth: gw, uiPanelHeight: gh - gameAreaH,
      towerX, towerY,
      pathMargin: PATH_MARGIN,
      pathRect: {
        x1: towerX - PATH_MARGIN, y1: towerY - PATH_MARGIN,
        x2: towerX + PATH_MARGIN, y2: towerY + PATH_MARGIN,
      },
    };
  }
  // Landscape — identical to existing hardcoded values
  const gw = GAME_WIDTH;
  const gh = GAME_HEIGHT;
  const gameAreaW = gw - UI_PANEL_WIDTH;
  const towerX = gameAreaW / 2;
  const towerY = gh / 2;
  return {
    mode: 'landscape',
    gameWidth: gw, gameHeight: gh,
    gameAreaWidth: gameAreaW, gameAreaHeight: gh,
    uiPanelX: gameAreaW, uiPanelY: 0,
    uiPanelWidth: UI_PANEL_WIDTH, uiPanelHeight: gh,
    towerX, towerY,
    pathMargin: PATH_MARGIN,
    pathRect: {
      x1: towerX - PATH_MARGIN, y1: towerY - PATH_MARGIN,
      x2: towerX + PATH_MARGIN, y2: towerY + PATH_MARGIN,
    },
  };
}
