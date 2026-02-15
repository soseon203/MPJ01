// ============================================================
// 라스트타워 - 웨이브 생성 (무한 웨이브)
// ============================================================
import { EnemyId, WaveConfig, WaveEnemyGroup } from '@/utils/types';

/**
 * 무한 웨이브를 생성합니다.
 *
 * 규칙:
 * - Wave  1~5 : normal만
 * - Wave  6~10: normal + fast
 * - Wave 11~15: normal + fast + tiny
 * - Wave 16+  : normal + fast + tiny + tank
 * - 10의 배수 웨이브: 보스 웨이브 (보스 1 + 추가 잡몹)
 *
 * 스케일링:
 * - HP 배율: 1 + (wave-1) * 0.15
 * - 속도 배율: 1 + (wave-1) * 0.02
 * - 적 수: Math.floor(3 + wave * 0.8)
 * - 보스 HP 배율: 1 + (wave-1) * 0.3
 * - 스폰 간격: Math.max(400, 1500 - wave * 20) ms
 */
export function generateWave(waveNumber: number): WaveConfig {
  const isBossWave = waveNumber % 10 === 0;
  const hpMultiplier = 1 + (waveNumber - 1) * 0.15;
  const speedMultiplier = 1 + (waveNumber - 1) * 0.02;
  const bossHpMultiplier = 1 + (waveNumber - 1) * 0.3;
  const enemyCount = Math.floor(3 + waveNumber * 0.8);
  const spawnInterval = Math.max(400, 1500 - waveNumber * 20);

  // 사용 가능한 적 타입 결정
  const availableTypes: EnemyId[] = ['normal'];

  if (waveNumber >= 6) {
    availableTypes.push('fast');
  }
  if (waveNumber >= 11) {
    availableTypes.push('tiny');
  }
  if (waveNumber >= 16) {
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
