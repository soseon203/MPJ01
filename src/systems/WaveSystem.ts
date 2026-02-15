// ============================================================
// 라스트타워 - WaveSystem: 웨이브 스폰 관리
// ============================================================

import {
  WaveConfig,
  WaveEnemyGroup,
  EnemyId,
  GameEvent,
} from '@/utils/types';
import { eventManager } from '@/managers/EventManager';

interface SpawnTimer {
  type: EnemyId;
  interval: number;
  count: number;
  spawned: number;
  elapsed: number;
  hpMultiplier: number;
  speedMultiplier: number;
}

type SpawnCallback = (type: EnemyId, hpMult: number, speedMult: number) => void;

export class WaveSystem {
  currentWave = 0;
  isSpawning = false;
  enemiesRemaining = 0;
  totalKillCount = 0;

  private spawnTimers: SpawnTimer[] = [];
  private delayTimers: { group: WaveEnemyGroup; delay: number }[] = [];
  private spawnCallback: SpawnCallback | null = null;

  // ---- Public API ----

  /** Begin spawning enemies from a wave configuration */
  startWave(waveConfig: WaveConfig): void {
    this.currentWave++;
    this.isSpawning = true;

    // Calculate total enemies in this wave
    let totalEnemies = 0;
    for (const group of waveConfig.groups) {
      totalEnemies += group.count;
    }
    this.enemiesRemaining += totalEnemies;

    // Set up spawn timers for each group (delays are in ms, convert to seconds)
    for (const group of waveConfig.groups) {
      if (group.delay > 0) {
        this.delayTimers.push({ group, delay: group.delay / 1000 });
      } else {
        this.addSpawnTimer(group);
      }
    }

    eventManager.emit(GameEvent.WAVE_START, this.currentWave);
  }

  /** Process spawn timers each frame */
  update(delta: number): void {
    if (!this.isSpawning) return;

    // Process delay timers
    for (let i = this.delayTimers.length - 1; i >= 0; i--) {
      this.delayTimers[i].delay -= delta;
      if (this.delayTimers[i].delay <= 0) {
        this.addSpawnTimer(this.delayTimers[i].group);
        this.delayTimers.splice(i, 1);
      }
    }

    // Process spawn timers
    for (let i = this.spawnTimers.length - 1; i >= 0; i--) {
      const timer = this.spawnTimers[i];
      timer.elapsed += delta;

      if (timer.elapsed >= timer.interval && timer.spawned < timer.count) {
        timer.elapsed -= timer.interval;
        timer.spawned++;

        if (this.spawnCallback) {
          this.spawnCallback(
            timer.type,
            timer.hpMultiplier,
            timer.speedMultiplier,
          );
        }

        // Remove completed timers
        if (timer.spawned >= timer.count) {
          this.spawnTimers.splice(i, 1);
        }
      }
    }

    // Check if all spawning is done
    if (this.spawnTimers.length === 0 && this.delayTimers.length === 0) {
      this.isSpawning = false;
    }
  }

  /** Called when an enemy from this wave is killed */
  onEnemyKilled(): void {
    this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);
    this.totalKillCount++;

    if (this.enemiesRemaining <= 0 && !this.isSpawning) {
      eventManager.emit(GameEvent.WAVE_COMPLETE, this.currentWave);
    }
  }

  /** Set the callback invoked whenever a spawn timer fires */
  setSpawnCallback(cb: SpawnCallback): void {
    this.spawnCallback = cb;
  }

  /** Reset all state for a new game */
  reset(): void {
    this.currentWave = 0;
    this.isSpawning = false;
    this.enemiesRemaining = 0;
    this.totalKillCount = 0;
    this.spawnTimers = [];
    this.delayTimers = [];
    this.spawnCallback = null;
  }

  getCurrentWave(): number {
    return this.currentWave;
  }

  getTotalKills(): number {
    return this.totalKillCount;
  }

  // ---- Private ----

  private addSpawnTimer(group: WaveEnemyGroup): void {
    const intervalSec = group.interval / 1000; // convert ms to seconds
    this.spawnTimers.push({
      type: group.type,
      interval: intervalSec,
      count: group.count,
      spawned: 0,
      elapsed: intervalSec, // spawn first enemy immediately
      hpMultiplier: group.hpMultiplier,
      speedMultiplier: group.speedMultiplier,
    });
  }
}
