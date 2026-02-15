---
name: verify-data-integrity
description: 게임 데이터 파일의 구조적 무결성과 밸런스 규칙 준수를 검증합니다. 스킬/적/상점/상수 데이터 수정, 진화 체인 추가 후 사용.
---

# 게임 데이터 무결성 검증

## Purpose

게임 데이터 파일이 구조적 규칙과 밸런스 제약 조건을 준수하는지 검증합니다:

1. **스킬 데이터 유효성** — 60개 스킬의 baseCost, maxLevel, effects, tags, rarity가 유효한지
2. **시너지 데이터 유효성** — 41개 시너지의 requirements가 유효한 태그를 참조하는지
3. **적 데이터 유효성** — 5종 적의 baseHp, speed, size, reward가 유효한지
4. **상점 확률 합계** — 각 확률 브라켓의 합이 1.0인지
5. **레벨 보너스 구조** — LEVEL_SHOP_BONUS가 10개 배열이며 각각 4개 요소인지
6. **EXP/레벨 테이블** — EXP_TABLE 10개, TOWER_LEVEL_STATS 10개, 값 유효성
7. **스킬 레어리티 분포** — 각 레어리티별 최소 스킬 수 충족
8. **RARITY_MAX_LEVEL 일관성** — 각 스킬의 maxLevel이 RARITY_MAX_LEVEL[rarity]와 일치하는지
9. **스킬 진화 체인 유효성** — SKILL_EVOLUTION의 소스/타겟 SkillId 유효성, EVOLUTION_LEVEL 값 검증
10. **액티브 스킬 이펙트 키 유효성** — passive:false 스킬이 orbDamage/orbFireRate/orbRange 또는 thunderDuration 키를 보유하는지

## When to Run

- 스킬 데이터(효과, 비용, 태그) 수정 후
- 적 데이터 수정 후
- 시너지 데이터 추가/수정 후
- 상점 확률/레벨 보너스 수정 후
- EXP 테이블, 타워 레벨 스탯 수정 후
- SKILL_EVOLUTION 진화 체인 추가/수정 후
- RARITY_MAX_LEVEL 수정 후

## Related Files

| File | Purpose |
|------|---------|
| `src/data/skillData.ts` | `SKILLS` 레코드 — 60개 스킬 정의, `SKILL_LIST`, `getSkillsByRarity()` |
| `src/data/synergyData.ts` | `SYNERGIES` 배열 — 41개 시너지 정의 |
| `src/data/enemyData.ts` | `ENEMY_DATA` 레코드 — 5종 적 데이터 |
| `src/data/waveData.ts` | `generateWave()` — 무한 웨이브 생성 함수 |
| `src/utils/types.ts` | 데이터 인터페이스 (SkillData, EnemyData, SynergyData, SkillRarity 등) |
| `src/utils/constants.ts` | 상수 (SHOP_PROBABILITIES, LEVEL_SHOP_BONUS, EXP_TABLE, TOWER_LEVEL_STATS 등) |

## Workflow

### Step 1: 스킬 데이터 구조 검증

**파일:** `src/data/skillData.ts`

**검사:** 각 스킬의 필수 필드가 유효한지 확인:
- `baseCost > 0`
- `maxLevel > 0` (일반적으로 3~10)
- `effects` 객체가 비어있지 않음 (최소 1개 효과 키)
- `tags` 배열이 비어있지 않음 (최소 1개 태그)
- `rarity`가 유효한 SkillRarity 값
- `color`가 유효한 hex 색상 (양수 정수)
- `passive`가 boolean

```bash
# 스킬 수 확인
grep "id:" src/data/skillData.ts | wc -l
```

**탐지:** `skillData.ts`를 읽고 각 스킬 객체를 파싱하여 필드 검증.

**PASS 기준:** 모든 60개 스킬이 유효.

**위반 시 수정:** 유효하지 않은 필드를 적절한 값으로 수정.

### Step 2: 스킬 레어리티 분포 검증

**파일:** `src/data/skillData.ts`

**검사:** 각 레어리티별 스킬 수가 최소 기준을 충족하는지:
- normal: 10개 이상
- magic: 10개 이상
- rare: 8개 이상
- unique: 6개 이상
- mythic: 5개 이상
- legend: 5개 이상

```bash
# 레어리티별 스킬 수 확인
grep "rarity:" src/data/skillData.ts
```

**PASS 기준:** 모든 레어리티가 최소 기준 충족.

### Step 3: 시너지 데이터 유효성 검증

**파일:** `src/data/synergyData.ts`, `src/utils/types.ts`

**검사:**
- 각 시너지의 `id`가 고유한지
- `requirements` 배열이 비어있지 않은지
- 각 requirement의 `tag`가 유효한 `SkillTag` 또는 `ElementTag` 값인지
- 각 requirement의 `count > 0`
- `tier`가 'basic', 'element', 'advanced' 중 하나인지

```bash
# 시너지 수 확인
grep "id:" src/data/synergyData.ts | wc -l
```

**PASS 기준:** 모든 시너지 데이터가 유효.

### Step 4: 적 데이터 유효성 검증

**파일:** `src/data/enemyData.ts`

**검사:**
- `baseHp > 0`
- `speed > 0`
- `expReward >= 0`
- `size > 0`
- `color`가 유효한 hex 색상 (양수 정수)
- `id`가 유효한 `EnemyId` 값

```bash
# 적 데이터 필드 확인
grep "baseHp:" src/data/enemyData.ts
```

**PASS 기준:** 모든 5종 적 데이터가 유효.

### Step 5: 상점 확률 합계 검증

**파일:** `src/utils/constants.ts`

**검사:** `SHOP_PROBABILITIES`의 각 브라켓(w0, w10, w20, w30, w40)의 6개 확률값 합이 1.0인지 확인 (부동소수점 오차 허용: ±0.001).

```bash
# SHOP_PROBABILITIES 확인
grep -A1 "w0\|w10\|w20\|w30\|w40" src/utils/constants.ts
```

**추가 검사:**
- `INITIAL_SELECT_1`의 합이 1.0인지
- `INITIAL_SELECT_2`의 합이 1.0인지
- 각 배열이 정확히 6개 요소인지

**PASS 기준:** 모든 확률 배열의 합이 1.0 (±0.001).

### Step 6: 레벨 보너스 구조 검증

**파일:** `src/utils/constants.ts`

**검사:**
- `LEVEL_SHOP_BONUS`가 정확히 10개 배열 (타워 레벨 1~10)
- 각 배열이 정확히 4개 요소 [rare, unique, mythic, legend]
- 모든 값이 0 이상
- 레벨이 올라갈수록 보너스가 비감소 (단조 증가)

```bash
# LEVEL_SHOP_BONUS 구조 확인
grep -c "\[" src/utils/constants.ts
```

**PASS 기준:** 구조와 값이 모두 유효.

### Step 7: EXP/레벨 테이블 검증

**파일:** `src/utils/constants.ts`

**검사:**
- `EXP_TABLE`이 정확히 10개 요소 (레벨 1~10)
- 값이 단조 증가 (각 레벨이 이전 레벨보다 큼)
- `EXP_TABLE[0] === 0` (레벨 1 시작)
- `TOWER_LEVEL_STATS`가 정확히 10개 요소
- 각 요소의 `damage > 0`, `fireRate > 0`, `range > 0`
- 레벨이 올라갈수록 damage, fireRate, range가 비감소

```bash
# EXP_TABLE, TOWER_LEVEL_STATS 확인
grep "EXP_TABLE\|TOWER_LEVEL_STATS" src/utils/constants.ts
```

**PASS 기준:** 모든 테이블이 유효한 구조와 값.

### Step 8: RARITY_MAX_LEVEL 일관성 검증

**파일:** `src/data/skillData.ts`

**검사:** 각 스킬의 `maxLevel` 값이 해당 레어리티의 `RARITY_MAX_LEVEL[rarity]`와 일치하는지 확인:
- normal: 10
- magic: 8
- rare: 5
- unique: 3
- mythic: 2
- legend: 1

```bash
# RARITY_MAX_LEVEL 정의 확인
grep -A6 "RARITY_MAX_LEVEL" src/data/skillData.ts
# 각 스킬의 maxLevel과 rarity 확인
grep "maxLevel\|rarity:" src/data/skillData.ts
```

**탐지:** 각 스킬의 `rarity`를 읽고 `maxLevel`이 `RARITY_MAX_LEVEL[rarity]` 값과 일치하는지 비교.

**PASS 기준:** 모든 60개 스킬의 maxLevel이 RARITY_MAX_LEVEL과 일치.

**위반 시 수정:** maxLevel을 RARITY_MAX_LEVEL[rarity] 값으로 변경.

### Step 9: 스킬 진화 체인 유효성 검증

**파일:** `src/data/skillData.ts`

**검사:**
- `SKILL_EVOLUTION`의 각 소스 키가 유효한 `SkillId`이며 `SKILLS`에 존재하는지
- 각 타겟 배열의 모든 `SkillId`가 `SKILLS`에 존재하는지
- 타겟 스킬의 rarity가 소스 스킬보다 높거나 같은지
- `EVOLUTION_LEVEL`이 양의 정수인지

```bash
# SKILL_EVOLUTION 정의 확인
grep -A20 "SKILL_EVOLUTION" src/data/skillData.ts
# EVOLUTION_LEVEL 확인
grep "EVOLUTION_LEVEL" src/data/skillData.ts
```

**PASS 기준:** 모든 소스/타겟 SkillId가 유효하고, EVOLUTION_LEVEL > 0.

**위반 시 수정:** 유효하지 않은 SkillId를 제거하거나 수정.

### Step 10: 액티브 스킬 이펙트 키 유효성 검증

**파일:** `src/data/skillData.ts`

**검사:** `passive: false`인 모든 스킬이 오브 시스템과 연동 가능한 이펙트 키를 보유하는지:
- **투사체 오브**: `orbDamage`, `orbFireRate`, `orbRange` 3개 모두 필요
- **영역 DOT 오브**: `thunderDuration`, `thunderRadius`, `thunderTicks` 3개 모두 필요
- 둘 중 하나의 패턴을 충족해야 함

```bash
# 액티브 스킬 목록 확인
grep -B2 "passive: false" src/data/skillData.ts
# 각 액티브 스킬의 effects 키 확인
grep "orbDamage\|orbFireRate\|orbRange\|thunderDuration" src/data/skillData.ts
```

**PASS 기준:** 모든 passive:false 스킬이 투사체 또는 영역 DOT 이펙트 키 세트를 보유.

**위반 시 수정:** 누락된 이펙트 키를 추가 (orbDamage/orbFireRate/orbRange 기본값 또는 thunderDuration/thunderRadius/thunderTicks 기본값).

## Output Format

```markdown
| # | 검사 항목 | 상태 | 상세 |
|---|----------|------|------|
| 1 | 스킬 데이터 구조 (64개) | PASS/FAIL | 유효하지 않은 스킬 목록 |
| 2 | 스킬 레어리티 분포 | PASS/FAIL | 미달 레어리티 목록 |
| 3 | 시너지 데이터 유효성 (45개) | PASS/FAIL | 문제 시너지 목록 |
| 4 | 적 데이터 유효성 (5종) | PASS/FAIL | 유효하지 않은 적 목록 |
| 5 | 상점 확률 합계 | PASS/FAIL | 합계가 1.0이 아닌 브라켓 |
| 6 | 레벨 보너스 구조 | PASS/FAIL | 구조 문제 상세 |
| 7 | EXP/레벨 테이블 | PASS/FAIL | 테이블 문제 상세 |
| 8 | RARITY_MAX_LEVEL 일관성 | PASS/FAIL | 불일치 스킬 목록 |
| 9 | 스킬 진화 체인 유효성 | PASS/FAIL | 유효하지 않은 SkillId 목록 |
| 10 | 액티브 스킬 이펙트 키 유효성 | PASS/FAIL | 누락 키 스킬 목록 |
```

## Exceptions

다음은 **위반이 아닙니다**:

1. **패시브 스킬의 빈 effects** — `passive: true`인 스킬이라도 `effects` 객체에 수치 정의가 있어야 함. 단, 효과가 단순 퍼센트 증가인 경우 `{ damage: { base: 0.15, perLevel: 0.05 } }` 형태의 비율값도 유효
2. **적의 `armor` 필드 생략** — `armor`는 선택적 필드(`armor?: number`)이므로, 정의하지 않으면 기본값 0으로 처리됨. 이는 정상
3. **상점 확률의 미세한 부동소수점 오차** — 합계가 0.999~1.001 범위이면 허용 (부동소수점 연산 오차)
4. **진화 체인의 rarity 역진** — SKILL_EVOLUTION에서 타겟 스킬이 소스 스킬보다 낮은 rarity인 경우는 경고 수준으로만 보고 (게임 디자인 의도일 수 있음)
5. **RARITY_MAX_LEVEL이 코드 내 비-export** — RARITY_MAX_LEVEL은 skillData.ts 내 `const`로 정의되어 내부 사용만 됨. export 여부는 위반이 아님
