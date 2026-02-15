// ============================================================
// 라스트타워 - 상점 시스템 (랜덤 카드 상점)
// ============================================================
import {
  SkillId,
  SkillRarity,
  ShopCard,
  OwnedSkill,
} from '@/utils/types';
import {
  SHOP_CARD_COUNT,
  SHOP_PROBABILITIES,
  LEVEL_SHOP_BONUS,
  INITIAL_SELECT_1,
} from '@/utils/constants';
import { SKILLS, SKILL_LIST, getSkillsByRarity, SKILL_EVOLUTION, EVOLUTION_LEVEL } from '@/data/skillData';

// 레어리티 순서 (확률 배열 인덱스 매핑)
const RARITY_ORDER: SkillRarity[] = ['normal', 'magic', 'rare', 'unique', 'mythic', 'legend'];

/**
 * 확률 가중치 배열로부터 레어리티를 뽑습니다.
 * weights: [normal, magic, rare, unique, mythic, legend] 각각의 확률 (합=1)
 */
function rollRarity(weights: number[]): SkillRarity {
  const roll = Math.random();
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) {
      return RARITY_ORDER[i];
    }
  }
  // 부동소수점 오차 방지: 마지막 레어리티 반환
  return RARITY_ORDER[weights.length - 1];
}

/**
 * 웨이브 번호에 해당하는 확률 브라켓 키를 반환합니다.
 * w0, w10, w20, w30, w40 중 현재 웨이브 이하의 가장 큰 키 사용.
 */
function getWaveBracketKey(currentWave: number): string {
  const brackets = [100, 70, 50, 30, 20, 10, 0];
  for (const b of brackets) {
    if (currentWave >= b) return `w${b}`;
  }
  return 'w0';
}

/**
 * 기본 확률에 타워 레벨 보너스를 적용합니다.
 * LEVEL_SHOP_BONUS[level-1] = [rare보너스, unique보너스, mythic보너스, legend보너스]
 * 보너스만큼 rare~legend에 추가, 동일 합계를 normal/magic에서 차감
 */
function applyLevelBonus(baseWeights: number[], towerLevel: number): number[] {
  const weights = [...baseWeights];
  if (towerLevel <= 0) return weights;

  let bonus: number[];
  if (towerLevel <= LEVEL_SHOP_BONUS.length) {
    bonus = LEVEL_SHOP_BONUS[towerLevel - 1];
  } else {
    // Level 11+: diminishing returns beyond table
    const maxBonus = LEVEL_SHOP_BONUS[LEVEL_SHOP_BONUS.length - 1];
    const extra = towerLevel - LEVEL_SHOP_BONUS.length;
    const dimFactor = 1 - Math.exp(-extra * 0.1); // approaches 1 slowly
    bonus = [
      maxBonus[0] + 0.03 * dimFactor,  // rare cap ~+11%
      maxBonus[1] + 0.02 * dimFactor,  // unique cap ~+8%
      maxBonus[2] + 0.015 * dimFactor, // mythic cap ~+5.5%
      maxBonus[3] + 0.01 * dimFactor,  // legend cap ~+3%
    ];
  }
  // bonus: [rare, unique, mythic, legend]
  const totalBonus = bonus[0] + bonus[1] + bonus[2] + bonus[3];

  // rare(2), unique(3), mythic(4), legend(5)에 보너스 추가
  weights[2] += bonus[0];
  weights[3] += bonus[1];
  weights[4] += bonus[2];
  weights[5] += bonus[3];

  // normal(0), magic(1)에서 차감 (반반)
  const halfBonus = totalBonus / 2;
  weights[0] = Math.max(0, weights[0] - halfBonus);
  weights[1] = Math.max(0, weights[1] - halfBonus);

  // 정규화 (합이 1이 되도록)
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (let i = 0; i < weights.length; i++) {
      weights[i] /= sum;
    }
  }

  return weights;
}

export class ShopSystem {

  /**
   * 상점에 표시할 카드를 생성합니다.
   * SHOP_CARD_COUNT(4)장의 랜덤 카드를 생성합니다.
   */
  generateCards(
    currentWave: number,
    towerLevel: number,
    ownedSkills: OwnedSkill[],
  ): ShopCard[] {
    // 확률 가중치 계산
    const bracketKey = getWaveBracketKey(currentWave);
    const baseWeights = SHOP_PROBABILITIES[bracketKey] || SHOP_PROBABILITIES['w0'];
    const weights = applyLevelBonus(baseWeights, towerLevel);

    // 진화 가능 스킬 수집 (레벨 5+ 보유 스킬의 진화 후보)
    const evolutionPool: SkillId[] = [];
    for (const owned of ownedSkills) {
      if (owned.level >= EVOLUTION_LEVEL && !owned.fusedFrom) {
        const candidates = SKILL_EVOLUTION[owned.id];
        if (candidates) {
          for (const evoId of candidates) {
            // 이미 보유 중이면 제외
            if (!ownedSkills.find(s => s.id === evoId)) {
              evolutionPool.push(evoId);
            }
          }
        }
      }
    }

    const cards: ShopCard[] = [];
    const usedSkillIds = new Set<SkillId>();

    for (let i = 0; i < SHOP_CARD_COUNT; i++) {
      // 진화 카드가 풀에 있으면 일정 확률(40%)로 진화 카드 생성
      if (evolutionPool.length > 0 && Math.random() < 0.4) {
        const evoIdx = Math.floor(Math.random() * evolutionPool.length);
        const evoId = evolutionPool[evoIdx];
        if (!usedSkillIds.has(evoId)) {
          const evoSkill = SKILLS[evoId];
          if (evoSkill) {
            cards.push({
              skillId: evoId,
              isUpgrade: false,
              currentLevel: 0,
              rarity: evoSkill.rarity,
              isEvolution: true,
            });
            usedSkillIds.add(evoId);
            evolutionPool.splice(evoIdx, 1);
            continue;
          }
        }
      }

      const card = this.generateSingleCard(weights, ownedSkills, usedSkillIds);
      if (card) {
        cards.push(card);
        usedSkillIds.add(card.skillId);
      }
    }

    return cards;
  }

  /**
   * 초기 선택 카드를 생성합니다.
   * Normal/Magic/Rare만 등장하며, 중복 없이 4장 생성 → 전부 획득
   */
  generateInitialCards(): ShopCard[] {
    const weights = [...INITIAL_SELECT_1];
    const cards: ShopCard[] = [];
    const usedSkillIds = new Set<SkillId>();

    for (let i = 0; i < SHOP_CARD_COUNT; i++) {
      const card = this.generateSingleCard(weights, [], usedSkillIds);
      if (card) {
        cards.push(card);
        usedSkillIds.add(card.skillId);
      }
    }

    return cards;
  }

  /** 초기 선택 시 단일 카드를 새로고침합니다. */
  rerollInitialCard(excludeSkillIds: Set<SkillId>): ShopCard | null {
    const weights = [...INITIAL_SELECT_1];
    return this.generateSingleCard(weights, [], excludeSkillIds);
  }

  /** 레벨업 상점에서 단일 카드를 새로고침합니다. */
  rerollShopCard(
    currentWave: number,
    towerLevel: number,
    ownedSkills: OwnedSkill[],
    excludeSkillIds: Set<SkillId>,
  ): ShopCard | null {
    const bracketKey = getWaveBracketKey(currentWave);
    const baseWeights = SHOP_PROBABILITIES[bracketKey] || SHOP_PROBABILITIES['w0'];
    const weights = applyLevelBonus(baseWeights, towerLevel);
    return this.generateSingleCard(weights, ownedSkills, excludeSkillIds);
  }

  /**
   * 보스 처치 보상 카드를 생성합니다.
   * rare 이상 레어리티만 등장, 3장 생성
   */
  generateBossCards(
    currentWave: number,
    towerLevel: number,
    ownedSkills: OwnedSkill[],
  ): ShopCard[] {
    // rare+ only weights: [normal=0, magic=0, rare, unique, mythic, legend]
    const weights = [0, 0, 0.30, 0.35, 0.25, 0.10];
    const cards: ShopCard[] = [];
    const usedSkillIds = new Set<SkillId>();

    for (let i = 0; i < 3; i++) {
      const card = this.generateSingleCard(weights, ownedSkills, usedSkillIds);
      if (card) {
        cards.push(card);
        usedSkillIds.add(card.skillId);
      }
    }

    return cards;
  }

  /**
   * 단일 카드를 생성합니다.
   * 최대 레벨에 도달한 이미 보유한 스킬은 건너뜁니다.
   * 보유 중이지만 최대 레벨이 아닌 스킬은 업그레이드 카드로 표시합니다.
   */
  private generateSingleCard(
    weights: number[],
    ownedSkills: OwnedSkill[],
    usedSkillIds: Set<SkillId>,
  ): ShopCard | null {
    // 최대 시도 횟수 (무한 루프 방지)
    const maxAttempts = 50;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const rarity = rollRarity(weights);
      const skillsOfRarity = getSkillsByRarity(rarity);

      if (skillsOfRarity.length === 0) continue;

      // 랜덤 스킬 선택
      const skillData = skillsOfRarity[Math.floor(Math.random() * skillsOfRarity.length)];

      // 이미 이번 생성에서 사용한 스킬이면 건너뛰기
      if (usedSkillIds.has(skillData.id)) continue;

      // 보유 여부 확인
      const owned = ownedSkills.find((s) => s.id === skillData.id);

      if (owned) {
        // 최대 레벨이면 건너뛰기
        if (owned.level >= skillData.maxLevel) continue;

        // 업그레이드 카드
        return {
          skillId: skillData.id,
          isUpgrade: true,
          currentLevel: owned.level,
          rarity: skillData.rarity,
        };
      }

      // 신규 스킬 카드
      return {
        skillId: skillData.id,
        isUpgrade: false,
        currentLevel: 0,
        rarity: skillData.rarity,
      };
    }

    return null;
  }
}
