---
name: verify-type-sync
description: TypeScript 유니온 타입과 데이터 객체/switch 케이스 간 동기화를 검증합니다. 스킬/적/타겟팅 타입 추가 후 사용.
---

# 타입-데이터 동기화 검증

## Purpose

TypeScript 유니온 타입 정의와 실제 데이터 객체 간의 동기화를 검증합니다:

1. **SkillId 동기화** — `SkillId` 유니온 타입의 모든 값이 `SKILLS` 레코드의 키로 존재하는지, 그 역도 성립하는지
2. **EnemyId 동기화** — `EnemyId` 유니온 타입의 모든 값이 `ENEMY_DATA` 레코드의 키로 존재하는지, 그 역도 성립하는지
3. **EnemyId ↔ drawBody() switch** — `Enemy.drawBody()`의 switch 문이 모든 EnemyId를 case로 처리하는지
4. **SkillRarity 동기화** — `SkillRarity` 유니온의 모든 값이 `SKILL_COSTS`, `RARITY_COLORS`, `SHOP_PROBABILITIES`에서 사용되는지
5. **TargetingStrategy 동기화** — `TargetingStrategy` 유니온의 모든 값이 `TowerCombatSystem`에서 처리되는지
6. **SkillTag/ElementTag 사용** — 정의된 태그가 실제 `skillData.ts`에서 최소 1회 사용되는지

## When to Run

- 새로운 스킬(SkillId)을 추가한 후
- 새로운 적 종류(EnemyId)를 추가한 후
- SkillRarity, SkillTag, ElementTag를 수정한 후
- TargetingStrategy를 수정한 후
- `types.ts`의 유니온 타입을 수정한 후

## Related Files

| File | Purpose |
|------|---------|
| `src/utils/types.ts` | 모든 유니온 타입 정의 (SkillId, EnemyId, SkillRarity, SkillTag, ElementTag, TargetingStrategy) |
| `src/utils/constants.ts` | SKILL_COSTS, RARITY_COLORS, SHOP_PROBABILITIES, TOWER_LEVEL_STATS |
| `src/data/skillData.ts` | `SKILLS` 레코드 — SkillId 키로 인덱싱, 각 스킬의 tags 배열 |
| `src/data/enemyData.ts` | `ENEMY_DATA` 레코드 — EnemyId 키로 인덱싱 |
| `src/data/synergyData.ts` | `SYNERGIES` 배열 — TagRequirement에서 SkillTag/ElementTag 참조 |
| `src/entities/Enemy.ts` | `drawBody()` — EnemyId별 switch 문 |
| `src/systems/TowerCombatSystem.ts` | TargetingStrategy별 타겟 선택 로직 |
| `src/systems/ShopSystem.ts` | SkillRarity 확률 처리, RARITY_ORDER 배열 |

## Workflow

### Step 1: SkillId ↔ SKILLS 동기화

**파일:** `src/utils/types.ts`, `src/data/skillData.ts`

**검사:** `SkillId` 유니온의 모든 멤버가 `SKILLS` 레코드에 키로 존재하는지 확인.

```bash
# SkillId 유니온 멤버 추출 (types.ts에서 '...' 형태의 문자열 리터럴)
grep -oP "'\w+'" src/utils/types.ts | head -70
```

**탐지:**
1. `src/utils/types.ts`에서 `SkillId` 유니온의 모든 문자열 리터럴 멤버 추출
2. `src/data/skillData.ts`에서 `SKILLS` 레코드의 키(id 필드 값) 추출
3. 양방향 비교: SkillId에 있지만 SKILLS에 없는 값, SKILLS에 있지만 SkillId에 없는 값

**PASS 기준:** 양쪽 목록이 정확히 일치 (현재 64개 스킬).

**위반 시 수정:** 누락된 쪽에 해당 값/키를 추가.

### Step 2: EnemyId ↔ ENEMY_DATA 동기화

**파일:** `src/utils/types.ts`, `src/data/enemyData.ts`

**검사:** `EnemyId` 유니온의 모든 멤버가 `ENEMY_DATA` 레코드에 키로 존재하는지 확인.

**탐지:**
1. `EnemyId` 유니온에서 멤버 추출: `'normal' | 'fast' | 'tank' | 'tiny' | 'boss'`
2. `ENEMY_DATA` 레코드의 키 추출
3. 양방향 비교

**PASS 기준:** 양쪽 목록이 정확히 일치 (현재 5종).

### Step 3: EnemyId ↔ Enemy.drawBody() switch 동기화

**파일:** `src/utils/types.ts`, `src/entities/Enemy.ts`

**검사:** `Enemy.drawBody()`의 switch 문이 모든 `EnemyId` 값을 case로 처리하는지 확인.

```bash
# drawBody() 내 case 문 추출
grep "case '" src/entities/Enemy.ts
```

**탐지:** switch 문의 case 값을 추출하여 `EnemyId` 유니온과 비교.

**PASS 기준:** 모든 EnemyId에 대한 case가 존재 (default 폴백은 허용하지만 전용 case 권장).

### Step 4: SkillRarity ↔ 상수 객체 동기화

**파일:** `src/utils/types.ts`, `src/utils/constants.ts`, `src/systems/ShopSystem.ts`

**검사:** `SkillRarity` 유니온의 모든 값이 다음 상수에서 키로 사용되는지:
- `SKILL_COSTS` (constants.ts)
- `RARITY_COLORS` (constants.ts)
- `RARITY_COLOR_STRINGS` (constants.ts)
- `RARITY_ORDER` (ShopSystem.ts)

```bash
# SkillRarity 유니온 값 확인
grep "SkillRarity" src/utils/types.ts
# SKILL_COSTS 키 확인
grep -A6 "SKILL_COSTS" src/utils/constants.ts
# RARITY_ORDER 확인
grep "RARITY_ORDER" src/systems/ShopSystem.ts
```

**PASS 기준:** 모든 SkillRarity 값('normal', 'magic', 'rare', 'unique', 'mythic', 'legend')이 각 상수에 키로 존재.

### Step 5: TargetingStrategy ↔ TowerCombatSystem 동기화

**파일:** `src/utils/types.ts`, `src/systems/TowerCombatSystem.ts`

**검사:** `TargetingStrategy` 유니온의 모든 값이 `TowerCombatSystem`의 타겟 선택 로직에서 처리되는지 확인.

```bash
# TargetingStrategy 유니온 값
grep "TargetingStrategy" src/utils/types.ts
# TowerCombatSystem에서 전략별 처리 확인
grep "'first'\|'last'\|'closest'\|'strongest'" src/systems/TowerCombatSystem.ts
```

**PASS 기준:** 'first', 'last', 'closest', 'strongest' 모두 TowerCombatSystem에서 처리됨.

### Step 6: SkillTag/ElementTag 사용 검증

**파일:** `src/utils/types.ts`, `src/data/skillData.ts`, `src/data/synergyData.ts`

**검사:** 정의된 모든 `SkillTag`와 `ElementTag` 값이 `skillData.ts`의 tags 배열이나 `synergyData.ts`의 requirements에서 최소 1회 사용되는지 확인.

```bash
# SkillTag/ElementTag 값이 skillData에서 사용되는지
grep "'DOT'\|'CC'\|'AOE'\|'SINGLE'\|'SPEED'\|'CRIT'" src/data/skillData.ts
grep "'CHAIN'\|'PROJECTILE'\|'ECONOMY'\|'SUMMON'\|'SCALE'" src/data/skillData.ts
grep "'DEBUFF'\|'DEFENSE'\|'FORCE'" src/data/skillData.ts
grep "'FIRE'\|'ICE'\|'LIGHTNING'\|'NATURE'\|'DARK'" src/data/skillData.ts
```

**PASS 기준:** 모든 태그가 최소 1개 스킬의 tags 배열이나 1개 시너지의 requirements에서 사용됨.

**위반 시 수정:** 사용되지 않는 태그는 유니온에서 제거하거나, 해당 태그를 사용하는 스킬/시너지를 추가.

## Output Format

```markdown
| # | 검사 항목 | 상태 | 상세 |
|---|----------|------|------|
| 1 | SkillId ↔ SKILLS | PASS/FAIL | 누락 항목 목록 |
| 2 | EnemyId ↔ ENEMY_DATA | PASS/FAIL | 누락 항목 목록 |
| 3 | EnemyId ↔ drawBody() switch | PASS/FAIL | 누락 case 목록 |
| 4 | SkillRarity ↔ 상수 객체 | PASS/FAIL | 누락 키 목록 |
| 5 | TargetingStrategy ↔ TowerCombatSystem | PASS/FAIL | 미처리 전략 목록 |
| 6 | SkillTag/ElementTag 사용 | PASS/FAIL | 미사용 태그 목록 |
```

## Exceptions

다음은 **위반이 아닙니다**:

1. **`drawBody()`의 `default` case** — default가 존재하면 새로운 타입 추가 시 런타임 오류는 방지되므로, 전용 case가 없어도 기능적으로는 안전. 단, 전용 비주얼이 없다는 경고 수준으로 보고
2. **`RARITY_COLORS`/`SKILL_COSTS`의 키가 Record<string, ...>로 선언** — 타입 시스템상 문자열 키이므로, 런타임에 누락을 감지해야 함. 키 목록의 수동 비교가 필요
3. **`SkillTag`/`ElementTag` 값이 synergyData.ts에서만 사용** — skillData.ts의 tags 배열에 없더라도 synergyData.ts의 requirements에서 사용되면 유효함
