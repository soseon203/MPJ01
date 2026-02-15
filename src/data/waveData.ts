// ============================================================
// 라스트타워 - 웨이브 생성 (무한 웨이브)
// ============================================================
import { EnemyId, WaveConfig, WaveEnemyGroup } from '@/utils/types';
import { ENEMIES_PER_WAVE } from '@/utils/constants';

/**
 * 무한 웨이브를 생성합니다.
 *
 * 규칙:
 * - Wave  1~2 : normal만
 * - Wave  3~4 : normal + fast
 * - Wave  5~7 : normal + fast + tiny
 * - Wave  8+  : normal + fast + tiny + tank
 * - 10의 배수 웨이브: 보스 웨이브 (보스 1 + 추가 잡몹)
 *
 * 스케일링:
 * - HP 배율: 1 + (wave-1) * 0.15
 * - 속도 배율: 1 + (wave-1) * 0.02
 * - 적 수: ENEMIES_PER_WAVE (50)
 * - 보스 HP 배율: 1 + (wave-1) * 0.3
 * - 스폰 간격: 30초 안에 모두 스폰 (30000 / enemyCount ms)
 */
export function generateWave(waveNumber: number): WaveConfig {
  const isBossWave = waveNumber % 10 === 0;
  // HP 스케일링: 웨이브 1~5는 완만, 6부터 급격히 상승
  // 초기 4스킬로 5웨이브까지 클리어 가능, 이후 전략적 구매 필수
  const earlyScale = Math.pow(1.12, waveNumber - 1);
  const lateBoost = waveNumber > 5 ? Math.pow(1.15, waveNumber - 5) : 1;
  const hpMultiplier = earlyScale * lateBoost;
  // w1=1.0, w3=1.25, w5=1.57, w7=2.60, w10=5.6, w15=19.8

  const speedMultiplier = 1 + (waveNumber - 1) * 0.03 + Math.max(0, waveNumber - 5) * 0.02;
  const bossHpMultiplier = earlyScale * (waveNumber > 5 ? Math.pow(1.20, waveNumber - 5) : 1);

  // 적 수: 매 웨이브 100마리 고정
  const enemyCount = 100;
  const spawnInterval = Math.max(80, Math.floor(15000 / enemyCount));

  // 사용 가능한 적 타입 결정
  const availableTypes: EnemyId[] = ['normal'];

  if (waveNumber >= 3) {
    availableTypes.push('fast');
  }
  if (waveNumber >= 5) {
    availableTypes.push('tiny');
  }
  if (waveNumber >= 8) {
    availableTypes.push('tank');
  }

  const groups: WaveEnemyGroup[] = [];

  if (isBossWave) {
    // 보스 웨이브: 보스 1마리 + 잡몹 그룹들
    groups.push({
      type: 'boss',
      count: 1,
      interval: 0,
      delay: 0,
      hpMultiplier: bossHpMultiplier,
      speedMultiplier,
    });

    // 보스 호위 잡몹
    const escortCount = Math.floor(enemyCount * 0.6);
    if (escortCount > 0) {
      // 잡몹 타입에서 랜덤으로 분배
      const mobTypes = availableTypes.filter((t) => t !== 'boss');
      const perType = Math.max(1, Math.floor(escortCount / mobTypes.length));
      let delay = spawnInterval * 2; // 보스 뒤에 딜레이를 두고 스폰

      for (const mobType of mobTypes) {
        groups.push({
          type: mobType,
          count: perType,
          interval: spawnInterval,
          delay,
          hpMultiplier,
          speedMultiplier,
        });
        delay += spawnInterval * perType * 0.3;
      }
    }
  } else {
    // 일반 웨이브: 사용 가능한 적 타입으로 그룹 구성
    let remainingCount = enemyCount;
    let delay = 0;

    for (let i = 0; i < availableTypes.length; i++) {
      const type = availableTypes[i];
      const isLast = i === availableTypes.length - 1;

      // 마지막 타입에 남은 수를 모두 배정, 아니면 적당히 분배
      let count: number;
      if (isLast) {
        count = remainingCount;
      } else {
        // 첫 번째 타입(normal)에 더 많이 배정
        const ratio = i === 0 ? 0.4 : 1 / availableTypes.length;
        count = Math.max(1, Math.floor(enemyCount * ratio));
        count = Math.min(count, remainingCount - (availableTypes.length - i - 1));
      }

      if (count > 0) {
        groups.push({
          type,
          count,
          interval: spawnInterval,
          delay,
          hpMultiplier,
          speedMultiplier,
        });
        delay += count * spawnInterval * 0.5;
        remainingCount -= count;
      }
    }
  }

  return {
    waveNumber,
    groups,
    isBossWave,
  };
}
