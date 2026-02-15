// ============================================================
// 라스트타워 - 경제 시스템 (골드 관리)
// ============================================================
import { GameEvent } from '@/utils/types';
import { STARTING_GOLD } from '@/utils/constants';
import { eventManager } from '@/managers/EventManager';

export class EconomySystem {
  private gold: number;

  constructor() {
    this.gold = STARTING_GOLD;
  }

  /** 골드를 추가하고 GOLD_CHANGED 이벤트를 발행합니다. */
  addGold(amount: number): void {
    this.gold += amount;
    eventManager.emit(GameEvent.GOLD_CHANGED, this.gold);
  }

  /**
   * 골드를 사용합니다.
   * 잔액이 부족하면 false를 반환하고 차감하지 않습니다.
   * 성공 시 GOLD_CHANGED 이벤트를 발행합니다.
   */
  spendGold(amount: number): boolean {
    if (!this.canAfford(amount)) return false;
    this.gold -= amount;
    eventManager.emit(GameEvent.GOLD_CHANGED, this.gold);
    return true;
  }

  /** 해당 금액을 지불할 수 있는지 확인합니다. */
  canAfford(amount: number): boolean {
    return this.gold >= amount;
  }

  /** 현재 보유 골드를 반환합니다. */
  getGold(): number {
    return this.gold;
  }

  /** 골드를 초기값으로 리셋합니다. */
  reset(): void {
    this.gold = STARTING_GOLD;
    eventManager.emit(GameEvent.GOLD_CHANGED, this.gold);
  }
}
