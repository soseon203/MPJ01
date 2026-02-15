---
name: verify-type-sync
description: TypeScript 유니온 타입과 데이터 객체/switch 케이스 간 동기화를 검증합니다. 새 타워/적/카드/스킬 타입 추가 후 사용.
---

# 타입-데이터 동기화 검증

## Purpose

TypeScript 유니온 타입 정의와 실제 데이터 객체 간의 동기화를 검증합니다:

1. **TowerId 동기화** — `TowerId` 유니온 타입의 모든 값이 `TOWER_DATA` 객체의 키로 존재하는지, 그 역도 성립하는지
2. **EnemyId 동기화** — `EnemyId` 유니온 타입의 모든 값이 `ENEMY_DATA` 객체의 키로 존재하는지, 그 역도 성립하는지
3. **TowerSkillId 동기화** — `TowerSkillId` 유니온 타입의 모든 값이 `TowerEngine`/`Tower.ts`에서 처리되는지
4. **CardEffectType 동기화** — `CardEffectType` 유니온 타입의 모든 값이 `RoguelikeEngine.applyEffect()` switch 문에서 처리되는지
5. **RoguelikeEffects 필드 동기화** — `RoguelikeEffects` 인터페이스의 모든 필드가 `computeEffects()` 초기값과 게임 로직에서 사용되는지

## When to Run

- 새로운 타워 종류를 추가한 후
- 새로운 적 종류를 추가한 후
- 새로운 카드 효과 타입을 추가한 후
- 새로운 타워 스킬을 추가한 후
- `types.ts`의 유니온 타입을 수정한 후

## Related Files

| File | Purpose |
|------|---------|
| `src/utils/types.ts` | 모든 유니온 타입 정의 (TowerId, EnemyId, TowerSkillId, CardEffectType, RoguelikeEffects) |
| `src/data/towerData.ts` | `TOWER_DATA` 객체 — TowerId 키로 인덱싱 |
| `src/data/enemyData.ts` | `ENEMY_DATA` 객체 — EnemyId 키로 인덱싱 |
| `src/data/cardData.ts` | `CARD_POOL` 배열 — CardEffectType 사용 |
| `src/systems/RoguelikeEngine.ts` | `applyEffect()` — CardEffectType switch 문, `computeEffects()` — RoguelikeEffects 초기화 |
| `src/systems/TowerEngine.ts` | TowerSkillId 참조하여 스킬 처리 |
| `src/systems/VFXManager.ts` | `drawEnemyShape()`, `drawTowerShape()` — 각 ID별 switch 문 |
| `src/entities/Tower.ts` | 타워 로직에서 TowerId/TowerSkillId 사용 |
| `src/entities/Enemy.ts` | 적 로직에서 EnemyId 사용 |
| `src/entities/Projectile.ts` | 투사체 로직에서 효과 타입 사용 |

## Workflow

### Step 1: TowerId ↔ TOWER_DATA 동기화

**파일:** `src/utils/types.ts`, `src/data/towerData.ts`

**검사:** `TowerId` 유니온의 모든 멤버가 `TOWER_DATA` 객체에 키로 존재하는지 확인.

```bash
# TowerId 유니온 멤버 추출
grep -oP "'\w+'" src/utils/types.ts | head -20
```

**탐지:** `src/utils/types.ts`에서 `TowerId` 유니온 멤버를 파싱하고, `src/data/towerData.ts`에서 `TOWER_DATA`의 키를 파싱하여 양방향 비교.

- `TowerId`에 있지만 `TOWER_DATA`에 없는 값 → **FAIL** (데이터 누락)
- `TOWER_DATA`에 있지만 `TowerId`에 없는 키 → **FAIL** (타입 누락)

**PASS 기준:** 양쪽 목록이 정확히 일치.

**위반 시 수정:** 누락된 쪽에 해당 값/키를 추가.

### Step 2: EnemyId ↔ ENEMY_DATA 동기화

**파일:** `src/utils/types.ts`, `src/data/enemyData.ts`

**검사:** `EnemyId` 유니온의 모든 멤버가 `ENEMY_DATA` 객체에 키로 존재하는지 확인.

**탐지:** Step 1과 동일한 방식으로 `EnemyId` 유니온 멤버와 `ENEMY_DATA` 키를 비교.

**PASS 기준:** 양쪽 목록이 정확히 일치.

### Step 3: TowerId ↔ VFX Switch 동기화

**파일:** `src/utils/types.ts`, `src/systems/VFXManager.ts`

**검사:** `drawTowerShape()` 및 `drawEnemyShape()`의 switch 문이 모든 TowerId/EnemyId를 case로 처리하는지 확인.

```bash
# drawTowerShape의 case 문 추출
grep "case '" src/systems/VFXManager.ts
```

**탐지:**
1. `drawTowerShape()` 함수 내 case 값을 추출하여 `TowerId` 유니온과 비교
2. `drawEnemyShape()` 함수 내 case 값을 추출하여 `EnemyId` 유니온과 비교

**PASS 기준:** 모든 ID에 대한 case가 존재 (default 폴백은 허용하지만, 모든 ID에 전용 case 권장).

**위반 시 수정:** 누락된 ID에 대한 case를 switch 문에 추가.

### Step 4: CardEffectType ↔ applyEffect() switch 동기화

**파일:** `src/utils/types.ts`, `src/systems/RoguelikeEngine.ts`

**검사:** `CardEffectType` 유니온의 모든 멤버가 `RoguelikeEngine.applyEffect()` switch 문에서 처리되는지 확인.

```bash
# applyEffect의 case 문 추출
grep "case '" src/systems/RoguelikeEngine.ts
```

**탐지:** `CardEffectType` 유니온 멤버를 추출하고, `applyEffect()` 메서드의 case 값과 비교.

**PASS 기준:** 모든 `CardEffectType` 값에 대한 case가 존재.

**위반 시 수정:** 누락된 effect type에 대한 case를 switch 문에 추가.

### Step 5: CardEffectType ↔ CARD_POOL 사용 검증

**파일:** `src/utils/types.ts`, `src/data/cardData.ts`

**검사:** `CARD_POOL`에서 사용된 모든 effect type이 `CardEffectType` 유니온에 정의되어 있는지 확인.

```bash
# CARD_POOL에서 사용된 effect type 추출
grep "type:" src/data/cardData.ts
```

**탐지:** `CARD_POOL` 배열에서 `type:` 값을 모두 추출하고 `CardEffectType` 유니온과 비교.

**PASS 기준:** CARD_POOL에서 사용된 모든 type이 CardEffectType에 정의됨.

### Step 6: RoguelikeEffects 필드 ↔ computeEffects() 초기화 동기화

**파일:** `src/utils/types.ts`, `src/systems/RoguelikeEngine.ts`

**검사:** `RoguelikeEffects` 인터페이스의 모든 필드가 `computeEffects()` 메서드에서 초기화되는지 확인.

**탐지:** `RoguelikeEffects` 인터페이스의 필드명을 추출하고, `computeEffects()` 내부에서 초기화되는 필드명과 비교.

**PASS 기준:** 모든 필드가 초기화됨.

### Step 7: TowerSkillId ↔ TowerEngine 처리 동기화

**파일:** `src/utils/types.ts`, `src/systems/TowerEngine.ts`

**검사:** `TowerSkillId` 유니온에 정의된 스킬 ID 중 `none`을 제외한 모든 값이 `TowerEngine` 또는 `Tower.ts`에서 문자열 리터럴로 참조되는지 확인.

```bash
# TowerEngine에서 스킬 ID 참조 추출
grep -oP "'[a-z_]+'" src/systems/TowerEngine.ts
```

**탐지:** `TowerSkillId` 유니온 멤버('none' 제외)를 추출하고, `TowerEngine.ts` 및 `Tower.ts`에서 해당 문자열 리터럴이 사용되는지 확인.

**PASS 기준:** 모든 스킬 ID가 최소 1회 참조됨.

**위반 시 수정:** 참조되지 않는 스킬 ID가 있다면, 해당 스킬의 로직이 구현되어 있는지 확인 후 누락된 로직을 추가.

## Output Format

```markdown
| # | 검사 항목 | 상태 | 상세 |
|---|----------|------|------|
| 1 | TowerId ↔ TOWER_DATA | PASS/FAIL | 누락 항목 목록 |
| 2 | EnemyId ↔ ENEMY_DATA | PASS/FAIL | 누락 항목 목록 |
| 3 | TowerId/EnemyId ↔ VFX Switch | PASS/FAIL | 누락 case 목록 |
| 4 | CardEffectType ↔ applyEffect() | PASS/FAIL | 누락 case 목록 |
| 5 | CardEffectType ↔ CARD_POOL | PASS/FAIL | 미사용 type 목록 |
| 6 | RoguelikeEffects ↔ computeEffects() | PASS/FAIL | 미초기화 필드 목록 |
| 7 | TowerSkillId ↔ TowerEngine 참조 | PASS/FAIL | 미참조 스킬 목록 |
```

## Exceptions

다음은 **위반이 아닙니다**:

1. **`TowerSkillId`의 `'none'` 값** — 스킬 미보유 상태를 나타내는 센티넬 값으로, 로직에서 직접 참조할 필요 없음
2. **`drawTowerShape()`/`drawEnemyShape()`의 `default` case** — default가 존재하면 새로운 타입 추가 시 런타임 오류는 방지되므로, 전용 case가 없어도 기능적으로는 안전. 단, 전용 비주얼이 없다는 경고 수준으로 보고
3. **`createProjectileVisual()`의 `buff` 타워 누락** — buff 타워는 자체 공격이 매우 약하므로 전용 투사체 비주얼이 없어도 default 사용 가능
