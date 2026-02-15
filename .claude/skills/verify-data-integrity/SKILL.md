---
name: verify-data-integrity
description: 게임 데이터 파일의 구조적 무결성과 밸런스 규칙 준수를 검증합니다. 타워/적/카드/스테이지 데이터 수정 후 사용.
---

# 게임 데이터 무결성 검증

## Purpose

게임 데이터 파일이 구조적 규칙과 밸런스 제약 조건을 준수하는지 검증합니다:

1. **타워 레벨 구조** — 각 타워가 정확히 5개 레벨을 가지며, 마지막 레벨의 upgradeCost가 0인지
2. **타워 스킬 규칙** — 스킬 해금 레벨이 1-5 범위이고, 각 타워의 스킬이 3개인지
3. **데이터 값 유효성** — 비용/데미지/사거리 등 수치가 양수인지
4. **카드 데이터 규칙** — 카드 ID 고유성, rarity/category 유효 값, effects 배열 비어있지 않은지
5. **스테이지 데이터 규칙** — 레이아웃이 유효하고, 스폰/출구가 존재하며, 웨이브 데이터가 비어있지 않은지

## When to Run

- 타워 데이터(비용, 스탯, 스킬) 수정 후
- 적 데이터 수정 후
- 카드 데이터 추가/수정 후
- 스테이지 데이터 추가/수정 후
- 웨이브 생성기 로직 수정 후

## Related Files

| File | Purpose |
|------|---------|
| `src/data/towerData.ts` | `TOWER_DATA` — 10종 타워, 각 5레벨 스탯 + 3스킬 |
| `src/data/enemyData.ts` | `ENEMY_DATA` — 8종 적 기본 데이터 |
| `src/data/cardData.ts` | `CARD_POOL` — 32장 카드 (14 common, 9 rare, 5 epic, 4 legendary) |
| `src/data/stageData.ts` | `STAGES` — 5개 스테이지 설정 |
| `src/data/waveGenerator.ts` | `generateStageWaves()` — 웨이브 생성 로직 |
| `src/utils/types.ts` | 데이터 인터페이스 정의 (TowerData, EnemyData, CardData, StageConfig) |
| `src/utils/constants.ts` | 게임 상수 (MAX_TOWER_LEVEL, STARTING_GOLD 등) |

## Workflow

### Step 1: 타워 레벨 구조 검증

**파일:** `src/data/towerData.ts`

**검사:** 각 타워의 `levels` 배열이 정확히 5개 요소를 가지는지 확인.

```bash
# 각 타워의 levels 배열 크기 확인 (levels 배열 내 { 개수 세기)
grep -c "damage:" src/data/towerData.ts
```

**탐지:** 각 타워 객체를 파싱하여 `levels` 배열 길이를 확인.

**PASS 기준:**
- 모든 타워의 `levels.length === 5`
- 모든 타워의 `levels[4].upgradeCost === 0` (마지막 레벨)
- 레벨 1-4의 `upgradeCost > 0`

**위반 시 수정:** 누락된 레벨을 추가하거나, 마지막 레벨의 upgradeCost를 0으로 설정.

### Step 2: 타워 스킬 규칙 검증

**파일:** `src/data/towerData.ts`

**검사:** 각 타워의 `skills` 배열 규칙:
- 정확히 3개의 스킬 보유
- 스킬 해금 레벨이 1-5 범위
- 스킬 ID가 `TowerSkillId` 유니온에 정의된 값

**탐지:** 각 타워 객체에서 `skills` 배열을 파싱하여 검증.

```bash
# 각 타워의 skill 수 확인
grep "unlockLevel:" src/data/towerData.ts
```

**PASS 기준:**
- 모든 타워의 `skills.length === 3`
- 모든 스킬의 `unlockLevel`이 1, 2, 3, 4, 5 중 하나
- 같은 타워 내 스킬의 `unlockLevel` 값이 모두 다름

**위반 시 수정:** 스킬 수를 조정하거나 unlockLevel 값을 수정.

### Step 3: 타워 수치 유효성 검증

**파일:** `src/data/towerData.ts`

**검사:** 모든 수치 값이 유효한 범위인지 확인:
- `cost > 0`
- 모든 레벨의 `damage > 0`, `range > 0`, `fireRate > 0`, `projectileSpeed >= 0`
- `size.cols > 0`, `size.rows > 0`

**탐지:** 데이터 파일을 읽고 각 수치를 검증.

**PASS 기준:** 모든 수치가 유효 범위 내.

**위반:** 0 이하의 비용, 음수 데미지 등.

### Step 4: 적 데이터 유효성 검증

**파일:** `src/data/enemyData.ts`

**검사:**
- `maxHp > 0`, `speed > 0`, `reward >= 0`, `size > 0`
- `flying`은 boolean
- `splitId`가 사용된 경우 유효한 EnemyId 값인지
- `shieldHp` 사용 시 `shieldRegen`도 함께 정의되었는지

```bash
# 적 데이터 필드 확인
grep "id:" src/data/enemyData.ts
```

**PASS 기준:** 모든 적 데이터가 유효.

### Step 5: 카드 데이터 유효성 검증

**파일:** `src/data/cardData.ts`

**검사:**
- 모든 카드 ID가 고유한지
- `rarity` 값이 `common`, `rare`, `epic`, `legendary` 중 하나인지
- `category` 값이 `offense`, `defense`, `economy`, `utility` 중 하나인지
- `effects` 배열이 비어있지 않은지
- 카드 수 분포: common 10+, rare 5+, epic 3+, legendary 2+

```bash
# 카드 rarity 분포 확인
grep "rarity:" src/data/cardData.ts
```

**PASS 기준:** 모든 카드가 유효하고, rarity 분포가 적절.

### Step 6: 스테이지 데이터 유효성 검증

**파일:** `src/data/stageData.ts`

**검사:**
- 각 스테이지에 고유한 `id`가 있는지
- `layout.cols > 0`, `layout.rows > 0`
- `layout.spawns`가 비어있지 않고, 그리드 범위 내인지
- `layout.exits`가 비어있지 않고, 그리드 범위 내인지
- `waves`가 비어있지 않은지
- `difficulty` 값이 유효한지 (`normal`, `elite`, `boss`)

```bash
# 스테이지 ID 확인
grep "id:" src/data/stageData.ts
```

**PASS 기준:** 모든 스테이지 데이터가 유효.

### Step 7: 스테이지 레이아웃-그리드 정합성 검증

**파일:** `src/data/stageData.ts`, `src/utils/constants.ts`

**검사:**
- 스테이지의 `layout.cols`와 `layout.rows`가 `GRID_COLS`/`GRID_ROWS` 상수와 일치하는지
- `blocked` 좌표가 `spawns`/`exits`와 겹치지 않는지

```bash
# 그리드 상수 확인
grep "GRID_COLS\|GRID_ROWS" src/utils/constants.ts
```

**PASS 기준:** 모든 레이아웃이 그리드 상수와 정합.

**위반 시 수정:** 레이아웃 값을 그리드 상수에 맞게 조정.

## Output Format

```markdown
| # | 검사 항목 | 상태 | 상세 |
|---|----------|------|------|
| 1 | 타워 레벨 구조 (5레벨) | PASS/FAIL | 문제 타워 목록 |
| 2 | 타워 스킬 규칙 (3스킬, 유효 레벨) | PASS/FAIL | 문제 타워/스킬 목록 |
| 3 | 타워 수치 유효성 | PASS/FAIL | 유효하지 않은 값 목록 |
| 4 | 적 데이터 유효성 | PASS/FAIL | 유효하지 않은 적 목록 |
| 5 | 카드 데이터 유효성 | PASS/FAIL | 문제 카드 목록 |
| 6 | 스테이지 데이터 유효성 | PASS/FAIL | 문제 스테이지 목록 |
| 7 | 스테이지-그리드 정합성 | PASS/FAIL | 불일치 항목 |
```

## Exceptions

다음은 **위반이 아닙니다**:

1. **레이저 타워의 `projectileSpeed: 0`** — 레이저 타워(`isLaser: true`)는 투사체가 아닌 지속 빔을 사용하므로 `projectileSpeed: 0`이 정상
2. **splitter 적의 `splitId`가 다른 적 종류를 참조** — 분열 메커니즘으로 의도된 설계. `splitId`가 `ENEMY_DATA`에 존재하는 유효한 EnemyId이면 OK
3. **카드 효과의 음수 value** — `tower_cost_mult: -0.05` 등 할인 효과나 `range_add: -0.3` 등 트레이드오프는 의도된 밸런스 설계
