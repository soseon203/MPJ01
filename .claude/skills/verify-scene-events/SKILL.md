---
name: verify-scene-events
description: Phaser 씬 등록/전환과 GameEvent 이벤트 emit/on 매칭을 검증합니다. 씬 추가/이벤트 수정 후 사용.
---

# 씬/이벤트 배선 검증

## Purpose

Phaser 씬 시스템과 커스텀 이벤트 시스템의 연결 무결성을 검증합니다:

1. **씬 등록 검증** — `gameConfig.ts`의 `scene` 배열에 모든 씬 클래스가 등록되어 있는지
2. **씬 전환 키 검증** — `scene.start()` 호출에 사용된 키가 실제 씬 클래스의 `super({ key })` 값과 일치하는지
3. **GameEvent emit/on 매칭** — 발행(emit)된 이벤트에 대응하는 구독(on)이 존재하는지, 그 역도 성립하는지
4. **이벤트 핸들러 정리** — 씬 종료 시 `removeAllListeners()`가 호출되는지

## When to Run

- 새로운 씬을 추가한 후
- 씬 전환 로직을 수정한 후
- GameEvent enum에 새 이벤트를 추가한 후
- 이벤트 emit/on 코드를 수정한 후
- 씬 라이프사이클 메서드를 수정한 후

## Related Files

| File | Purpose |
|------|---------|
| `src/config/gameConfig.ts` | Phaser 게임 설정 — 씬 배열 등록 |
| `src/utils/types.ts` | `GameEvent` enum 정의 |
| `src/managers/EventManager.ts` | 커스텀 이벤트 시스템 (emit/on/off) |
| `src/scenes/BootScene.ts` | 부팅 씬 — `scene.start('MainMenuScene')` |
| `src/scenes/MainMenuScene.ts` | 메인 메뉴 — 씬 전환 |
| `src/scenes/StageSelectScene.ts` | 스테이지 선택 — 씬 전환 |
| `src/scenes/GameScene.ts` | 게임 메인 씬 — 이벤트 emit/on 핵심 |
| `src/scenes/UIScene.ts` | UI 오버레이 씬 — 이벤트 on |
| `src/scenes/GameOverScene.ts` | 게임 오버 씬 — 씬 전환 |

## Workflow

### Step 1: 씬 등록 완전성 검증

**파일:** `src/config/gameConfig.ts`, `src/scenes/*.ts`

**검사:** `gameConfig.ts`의 `scene` 배열에 나열된 씬과 실제 존재하는 씬 클래스가 일치하는지 확인.

```bash
# gameConfig.ts의 scene 배열 확인
grep "Scene" src/config/gameConfig.ts
```

**탐지:**
1. `src/scenes/` 디렉토리의 모든 `*Scene.ts` 파일 목록을 Glob으로 수집
2. `gameConfig.ts`의 `scene` 배열에서 import된 씬 클래스명 추출
3. 양방향 비교

**PASS 기준:** 모든 씬 파일의 클래스가 `scene` 배열에 등록됨.

**위반 시 수정:** 누락된 씬을 `gameConfig.ts`의 import와 `scene` 배열에 추가.

### Step 2: 씬 키 일관성 검증

**파일:** 모든 씬 파일

**검사:** 각 씬 클래스의 `super({ key: 'XxxScene' })` 값이 고유하고, `scene.start()` 호출에서 참조되는 문자열과 일치하는지 확인.

```bash
# 모든 씬의 key 값 추출
grep "key:" src/scenes/*.ts
```

```bash
# scene.start() 호출에서 사용된 씬 키 추출
grep "scene.start(" src/scenes/*.ts src/config/*.ts
```

**탐지:**
1. 각 씬의 `super({ key: '...' })` 값 추출 → 등록된 키 세트
2. 모든 파일에서 `scene.start('...')` / `scene.launch('...')` / `scene.stop('...')` 호출의 문자열 인수 추출 → 사용된 키 세트
3. 사용된 키가 모두 등록된 키 세트에 존재하는지 확인

**PASS 기준:** 모든 `scene.start()` 호출의 키가 등록된 씬 키에 존재.

**위반 시 수정:** 오타를 수정하거나 누락된 씬을 추가.

### Step 3: GameEvent enum 사용 검증

**파일:** `src/utils/types.ts`, 모든 소스 파일

**검사:** `GameEvent` enum의 모든 값이 최소 1회 emit되고 최소 1회 구독(on)되는지 확인.

```bash
# GameEvent 사용처 검색
grep "GameEvent\." src/scenes/*.ts src/entities/*.ts src/systems/*.ts src/managers/*.ts
```

**탐지:**
1. `src/utils/types.ts`에서 `GameEvent` enum의 모든 멤버 추출
2. 모든 소스 파일에서 `eventManager.emit(GameEvent.XXX` 패턴 추출 → emit된 이벤트 세트
3. 모든 소스 파일에서 `eventManager.on(GameEvent.XXX` 패턴 추출 → 구독된 이벤트 세트

**PASS 기준:**
- 모든 enum 멤버가 최소 1회 emit됨
- 모든 enum 멤버가 최소 1회 구독됨 (emit만 되고 구독이 없으면 dead event)

**위반 시 수정:** 사용되지 않는 이벤트는 enum에서 제거하거나, 필요한 핸들러를 추가.

### Step 4: 이벤트 리스너 정리 검증

**파일:** `src/scenes/GameScene.ts`

**검사:** 씬 종료/전환 시 `eventManager.removeAllListeners()`가 호출되는지 확인.

```bash
# removeAllListeners 호출 확인
grep "removeAllListeners" src/scenes/GameScene.ts
```

**탐지:** `GameScene.ts`의 `cleanupAndGo()` 및 `shutdown()` 메서드에서 리스너 정리 호출 확인.

**PASS 기준:** 씬 전환 경로(cleanupAndGo, shutdown)에서 `removeAllListeners()`가 호출됨.

**위반:** 이벤트 리스너가 정리되지 않으면 중복 구독으로 인한 버그 발생 가능.

### Step 5: UIScene ↔ GameScene 이벤트 인터페이스 검증

**파일:** `src/scenes/GameScene.ts`, `src/scenes/UIScene.ts`

**검사:** `GameScene`이 `UIScene`을 launch할 때 전달하는 데이터 인터페이스가 `UIScene.init()`의 파라미터와 일치하는지 확인.

**탐지:**
1. `GameScene.ts`에서 `scene.launch('UIScene', { ... })` 호출의 전달 데이터 키 추출
2. `UIScene.ts`에서 `init(data: { ... })` 파라미터의 키 추출
3. 양방향 비교

**PASS 기준:** 전달 데이터의 키가 UIScene.init()의 파라미터 키와 정확히 일치.

### Step 6: 씬 전환 그래프 연결성 검증

**파일:** 모든 씬 파일

**검사:** 씬 전환 그래프에서 모든 씬이 도달 가능한지 확인. BootScene에서 시작하여 모든 씬에 도달할 수 있는 경로가 존재해야 함.

**탐지:**
1. 각 씬에서 `scene.start()` / `scene.launch()` 호출을 수집하여 방향 그래프 구성
2. `BootScene`에서 시작하여 BFS/DFS로 도달 가능한 씬 확인

**PASS 기준:** 모든 등록된 씬이 BootScene에서 도달 가능.

**위반:** 도달 불가능한 씬이 있으면 고아 씬(orphan scene)으로 보고.

## Output Format

```markdown
| # | 검사 항목 | 상태 | 상세 |
|---|----------|------|------|
| 1 | 씬 등록 완전성 | PASS/FAIL | 미등록 씬 목록 |
| 2 | 씬 키 일관성 | PASS/FAIL | 불일치 키 목록 |
| 3 | GameEvent emit/on 매칭 | PASS/FAIL | 미사용 이벤트 목록 |
| 4 | 이벤트 리스너 정리 | PASS/FAIL | 미정리 경로 |
| 5 | UIScene 인터페이스 일치 | PASS/FAIL | 불일치 키 목록 |
| 6 | 씬 전환 그래프 연결성 | PASS/FAIL | 고아 씬 목록 |
```

## Exceptions

다음은 **위반이 아닙니다**:

1. **UIScene이 `scene` 배열에 직접 포함** — UIScene은 GameScene에서 `scene.launch()`로 동적 실행되지만, Phaser가 인식하려면 `scene` 배열에도 등록되어야 함. 이는 정상
2. **`UI_SELECT_TOWER`, `UI_DESELECT`, `UI_SHOW_TOWER_INFO` 이벤트가 씬 간 통신에만 사용** — 이 이벤트들은 GameScene과 UIScene 사이의 UI 상태 동기화용으로, emit과 on이 다른 씬에 있는 것이 정상
3. **GameOverScene에서 `eventManager` 미사용** — GameOverScene은 단순 결과 표시 씬으로, 게임 이벤트를 구독할 필요 없음
