// ============================================================
// 라스트타워 - 상점 시스템 (랜덤 카드 상점)
// ============================================================
import {
  SkillId,
  SkillRarity,
  ShopCard,
  OwnedSkill,
  getSkillUpgradeCost,
} from '@/utils/types';
import {
  SHOP_UNLOCK_WAVES,
  SHOP_UNLOCK_KILLS,
  SHOP_CARD_COUNT,
  SHOP_PROBABILITIES,
  LEVEL_SHOP_BONUS,
  INITIAL_SELECT_1,
  INITIAL_SELECT_2,
} from '@/utils/constants';
import { SKILLS, SKILL_LIST, getSkillsByRarity } from '@/data/skillData';

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
  const brackets = [40, 30, 20, 10, 0];
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
  const levelIndex = Math.min(towerLevel - 1, LEVEL_SHOP_BONUS.length - 1);
  if (levelIndex < 0) return weights;

  const bonus = LEVEL_SHOP_BONUS[levelIndex];
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
   * 상점이 열려야 하는지 확인합니다.
   * - 마지막 상점 이후 SHOP_UNLOCK_WAVES 웨이브가 경과했거나
   * - 마지막 상점 이후 SHOP_UNLOCK_KILLS 킬을 달성했을 때
   */
  shouldUnlockShop(
    currentWave: number,
    totalKills: number,
    lastShopWave: number,
    lastShopKills: number,
  ): boolean {
    const wavesSinceShop = currentWave - lastShopWave;
    const killsSinceShop = totalKills - lastShopKills;

    return wavesSinceShop >= SHOP_UNLOCK_WAVES || killsSinceShop >= SHOP_UNLOCK_KILLS;
  }

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

    const cards: ShopCard[] = [];
    const usedSkillIds = new Set<SkillId>();

    for (let i = 0; i < SHOP_CARD_COUNT; i++) {
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
   * 라운드 1: INITIAL_SELECT_1 확률, 라운드 2: INITIAL_SELECT_2 확률
   * Normal/Magic/Rare만 등장하며, 중복 없이 4장 생성
   */
  generateInitialCards(round: 1 | 2): ShopCard[] {
    const weights = round === 1 ? [...INITIAL_SELECT_1] : [...INITIAL_SELECT_2];
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
          cost: getSkillUpgradeCost(skillData.baseCost, owned.level),
          isUpgrade: true,
          currentLevel: owned.level,
          rarity: skillData.rarity,
        };
      }

      // 신규 스킬 카드
      return {
        skillId: skillData.id,
        cost: skillData.baseCost,
        isUpgrade: false,
        currentLevel: 0,
        rarity: skillData.rarity,
      };
    }

    return null;
  }
}
