// ============================================================
// 라스트타워 - 적 데이터 정의
// ============================================================
import { EnemyData, EnemyId } from '@/utils/types';

export const ENEMY_DATA: Record<EnemyId, EnemyData> = {
  normal: {
    id: 'normal',
    name: '일반',
    baseHp: 50,
    speed: 60,
    goldReward: 5,
    expReward: 4,
    color: 0x44aa44,
    size: 12,
    armor: 0,
  },
  fast: {
    id: 'fast',
    name: '쾌속',
    baseHp: 30,
    speed: 120,
    goldReward: 4,
    expReward: 5,
    color: 0x44aaff,
    size: 8,
    armor: 0,
  },
  tank: {
    id: 'tank',
    name: '중장갑',
    baseHp: 200,
    speed: 35,
    goldReward: 10,
    expReward: 10,
    color: 0x888888,
    size: 18,
    armor: 3,
  },
  tiny: {
    id: 'tiny',
    name: '꼬마',
    baseHp: 15,
    speed: 90,
    goldReward: 2,
    expReward: 2,
    color: 0xffaa44,
    size: 6,
    armor: 0,
  },
  boss: {
    id: 'boss',
    name: '보스',
    baseHp: 1000,
    speed: 25,
    goldReward: 50,
    expReward: 40,
    color: 0xff4444,
    size: 28,
    armor: 5,
  },
};
