// ============================================================
// 라스트타워 - 시너지 데이터 (45 synergies)
// ============================================================

import type { SynergyData } from '@/utils/types';

export const SYNERGIES: SynergyData[] = [
  // ============================================================
  // Basic Synergies (25, tier='basic')
  // ============================================================
  {
    id: 'compound_pollution',
    name: '복합 오염',
    description: 'DOT 합산 데미지 +30%',
    requirements: [{ tag: 'DOT', count: 2 }],
    tier: 'basic',
  },
  {
    id: 'pain_extension',
    name: '고통 연장',
    description: 'CC 상태의 적에게 DOT 데미지 2배',
    requirements: [
      { tag: 'DOT', count: 1 },
      { tag: 'CC', count: 1 },
    ],
    tier: 'basic',
  },
  {
    id: 'spread_infection',
    name: '확산 감염',
    description: 'DOT 사망 시 주변 적에게 DOT 전이',
    requirements: [
      { tag: 'DOT', count: 1 },
      { tag: 'AOE', count: 1 },
    ],
    tier: 'basic',
  },
  {
    id: 'plague_spread',
    name: '역병 전파',
    description: '체인 히트 시 DOT 전이',
    requirements: [
      { tag: 'DOT', count: 1 },
      { tag: 'CHAIN', count: 1 },
    ],
    tier: 'basic',
  },
  {
    id: 'corruption',
    name: '부패',
    description: 'DOT 상태의 적 방어력 -20%',
    requirements: [
      { tag: 'DOT', count: 1 },
      { tag: 'DEBUFF', count: 1 },
    ],
    tier: 'basic',
  },
  {
    id: 'binding',
    name: '속박',
    description: 'CC 중첩 시 완전 정지 확률 10%',
    requirements: [{ tag: 'CC', count: 2 }],
    tier: 'basic',
  },
  {
    id: 'weakness_strike',
    name: '약점 강타',
    description: 'CC 상태의 적에게 크리티컬 데미지 2배',
    requirements: [
      { tag: 'CC', count: 1 },
      { tag: 'CRIT', count: 1 },
    ],
    tier: 'basic',
  },
  {
    id: 'predator',
    name: '포식자',
    description: 'CC 상태의 적에게 데미지 +25%',
    requirements: [
      { tag: 'CC', count: 1 },
      { tag: 'SINGLE', count: 1 },
    ],
    tier: 'basic',
  },
  {
    id: 'wide_amplify',
    name: '광역 증폭',
    description: '범위 공격 범위 +25%',
    requirements: [{ tag: 'AOE', count: 2 }],
    tier: 'basic',
  },
  {
    id: 'chain_explosion',
    name: '연쇄 폭발',
    description: '체인 히트마다 범위 폭발 발생',
    requirements: [
      { tag: 'AOE', count: 1 },
      { tag: 'CHAIN', count: 1 },
    ],
    tier: 'basic',
  },
  {
    id: 'bomber',
    name: '폭격기',
    description: '범위 공격 주기 -20%',
    requirements: [
      { tag: 'AOE', count: 1 },
      { tag: 'SPEED', count: 1 },
    ],
    tier: 'basic',
  },
  {
    id: 'assassin',
    name: '암살자',
    description: '크리티컬 데미지 3배',
    requirements: [
      { tag: 'SINGLE', count: 1 },
      { tag: 'CRIT', count: 1 },
    ],
    tier: 'basic',
  },
  {
    id: 'shatter',
    name: '파쇄',
    description: '단일 대상 데미지 +30%',
    requirements: [
      { tag: 'SINGLE', count: 1 },
      { tag: 'FORCE', count: 1 },
    ],
    tier: 'basic',
  },
  {
    id: 'barrage',
    name: '난사',
    description: '투사체 속도 +50%',
    requirements: [
      { tag: 'SPEED', count: 1 },
      { tag: 'PROJECTILE', count: 1 },
    ],
    tier: 'basic',
  },
  {
    id: 'rapid_marksman',
    name: '속사 명사수',
    description: '크리티컬 시 0.5초간 공격 속도 2배',
    requirements: [
      { tag: 'SPEED', count: 1 },
      { tag: 'CRIT', count: 1 },
    ],
    tier: 'basic',
  },
  {
    id: 'infinite_chain',
    name: '무한 연쇄',
    description: '체인 데미지 감쇠 70% → 85%',
    requirements: [
      { tag: 'CHAIN', count: 1 },
      { tag: 'SCALE', count: 1 },
    ],
    tier: 'basic',
  },
  {
    id: 'tycoon',
    name: '재벌',
    description: '상점 카드 +1, 가격 -15%',
    requirements: [{ tag: 'ECONOMY', count: 2 }],
    tier: 'basic',
  },
  {
    id: 'jackpot',
    name: '잭팟',
    description: '크리티컬 처치 시 골드 3배',
    requirements: [
      { tag: 'ECONOMY', count: 1 },
      { tag: 'CRIT', count: 1 },
    ],
    tier: 'basic',
  },
  {
    id: 'proliferation',
    name: '증식',
    description: '복제 오브 효과 증폭',
    requirements: [
      { tag: 'SUMMON', count: 1 },
      { tag: 'SCALE', count: 1 },
    ],
    tier: 'basic',
  },
  {
    id: 'clone_chain',
    name: '분신 연쇄',
    description: '복제 오브가 체인 공격 발사',
    requirements: [
      { tag: 'SUMMON', count: 1 },
      { tag: 'CHAIN', count: 1 },
    ],
    tier: 'basic',
  },
  {
    id: 'neutralize',
    name: '무력화',
    description: '디버프 상태의 적이 받는 데미지 +25%',
    requirements: [{ tag: 'DEBUFF', count: 2 }],
    tier: 'basic',
  },
  {
    id: 'enhanced_curse',
    name: '강화된 저주',
    description: '디버프 효과 +40%',
    requirements: [
      { tag: 'DEBUFF', count: 1 },
      { tag: 'SCALE', count: 1 },
    ],
    tier: 'basic',
  },
  {
    id: 'crush',
    name: '분쇄',
    description: '적 밀침 + 경직 확률',
    requirements: [{ tag: 'FORCE', count: 2 }],
    tier: 'basic',
  },
  {
    id: 'bullet_hell',
    name: '탄막',
    description: '투사체 크기 2배',
    requirements: [{ tag: 'PROJECTILE', count: 3 }],
    tier: 'basic',
  },
  {
    id: 'fortress_economy',
    name: '요새 경제',
    description: '적 한도 여유분에 비례하여 골드 보너스',
    requirements: [
      { tag: 'DEFENSE', count: 1 },
      { tag: 'ECONOMY', count: 1 },
    ],
    tier: 'basic',
  },

  // ============================================================
  // Element Synergies (5, tier='element')
  // ============================================================
  {
    id: 'combustion_frenzy',
    name: '연소 폭주',
    description: '화염 DOT 중첩 가능 (최대 3중)',
    requirements: [{ tag: 'FIRE', count: 2 }],
    tier: 'element',
  },
  {
    id: 'permafrost',
    name: '영구 동토',
    description: '감속 해제 후 1초간 잔류',
    requirements: [{ tag: 'ICE', count: 2 }],
    tier: 'element',
  },
  {
    id: 'overload',
    name: '과부하',
    description: '전기 피해 적 연쇄 +30%',
    requirements: [{ tag: 'LIGHTNING', count: 2 }],
    tier: 'element',
  },
  {
    id: 'ecosystem',
    name: '생태계',
    description: '독 사망 시 회복 오브 생성 (한도 +1)',
    requirements: [{ tag: 'NATURE', count: 2 }],
    tier: 'element',
  },
  {
    id: 'abyss',
    name: '심연',
    description: '처치 시 5% 확률로 다음 처치 골드 10배',
    requirements: [{ tag: 'DARK', count: 2 }],
    tier: 'element',
  },

  // ============================================================
  // Advanced Synergies (15, tier='advanced')
  // ============================================================
  {
    id: 'hellfire',
    name: '지옥불',
    description: '범위 내 감속 + DOT + 방어 제거',
    requirements: [
      { tag: 'DOT', count: 1 },
      { tag: 'CC', count: 1 },
      { tag: 'AOE', count: 1 },
    ],
    tier: 'advanced',
  },
  {
    id: 'gatling_sniper',
    name: '기관총 스나이퍼',
    description: '크리티컬 시 1초간 공격 속도 3배',
    requirements: [
      { tag: 'CRIT', count: 1 },
      { tag: 'SINGLE', count: 1 },
      { tag: 'SPEED', count: 1 },
    ],
    tier: 'advanced',
  },
  {
    id: 'pandemic',
    name: '팬데믹',
    description: '체인 대상 모두에게 DOT 영구 중첩',
    requirements: [
      { tag: 'CHAIN', count: 1 },
      { tag: 'AOE', count: 1 },
      { tag: 'DOT', count: 1 },
    ],
    tier: 'advanced',
  },
  {
    id: 'bounty_hunter',
    name: '현상금 사냥꾼',
    description: '보스 처치 시 골드 5배',
    requirements: [
      { tag: 'ECONOMY', count: 1 },
      { tag: 'CRIT', count: 1 },
      { tag: 'SINGLE', count: 1 },
    ],
    tier: 'advanced',
  },
  {
    id: 'death_sentence',
    name: '사형 선고',
    description: 'CC 상태의 적 즉사 확률',
    requirements: [
      { tag: 'CC', count: 1 },
      { tag: 'CRIT', count: 1 },
      { tag: 'SINGLE', count: 1 },
    ],
    tier: 'advanced',
  },
  {
    id: 'rain_of_sorrow',
    name: '비탄의 소나기',
    description: '투사체가 화면을 가득 채움',
    requirements: [
      { tag: 'PROJECTILE', count: 2 },
      { tag: 'SPEED', count: 1 },
    ],
    tier: 'advanced',
  },
  {
    id: 'erosion',
    name: '침식',
    description: 'DOT 데미지가 시간에 따라 가속',
    requirements: [
      { tag: 'DOT', count: 1 },
      { tag: 'DEBUFF', count: 1 },
      { tag: 'SCALE', count: 1 },
    ],
    tier: 'advanced',
  },
  {
    id: 'thermal_storm',
    name: '열폭풍',
    description: '화상 + 감속 동시 적용 시 폭발',
    requirements: [
      { tag: 'FIRE', count: 1 },
      { tag: 'ICE', count: 1 },
    ],
    tier: 'advanced',
  },
  {
    id: 'wildfire_synergy',
    name: '산불',
    description: '화상 전이 범위 3배',
    requirements: [
      { tag: 'FIRE', count: 1 },
      { tag: 'NATURE', count: 1 },
    ],
    tier: 'advanced',
  },
  {
    id: 'ice_discharge',
    name: '얼음 방전',
    description: '빙결 적에게 전기 피해 시 주변 방전',
    requirements: [
      { tag: 'ICE', count: 1 },
      { tag: 'LIGHTNING', count: 1 },
    ],
    tier: 'advanced',
  },
  {
    id: 'dark_thunder',
    name: '암흑 뇌전',
    description: '번개가 가장 먼 적에게 즉시 도달',
    requirements: [
      { tag: 'LIGHTNING', count: 1 },
      { tag: 'DARK', count: 1 },
    ],
    tier: 'advanced',
  },
  {
    id: 'forest_of_decay',
    name: '부패의 숲',
    description: '독 사망 위치에 영구 독 지대 생성',
    requirements: [
      { tag: 'NATURE', count: 1 },
      { tag: 'DARK', count: 1 },
    ],
    tier: 'advanced',
  },
  {
    id: 'legion',
    name: '군단',
    description: '오브 수에 비례하여 전체 데미지 보너스',
    requirements: [
      { tag: 'SUMMON', count: 1 },
      { tag: 'AOE', count: 1 },
      { tag: 'SCALE', count: 1 },
    ],
    tier: 'advanced',
  },
  {
    id: 'iron_fortress',
    name: '철벽',
    description: '적 한도 직전 모든 적 3초 정지',
    requirements: [
      { tag: 'DEFENSE', count: 1 },
      { tag: 'CC', count: 1 },
      { tag: 'AOE', count: 1 },
    ],
    tier: 'advanced',
  },
  {
    id: 'transcendence',
    name: '초월',
    description: '모든 보너스 배율 +50%',
    requirements: [{ tag: 'SCALE', count: 2 }],
    tier: 'advanced',
  },
];
