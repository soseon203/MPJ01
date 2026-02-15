## Skills

커스텀 검증 및 유지보수 스킬은 `.claude/skills/`에 정의되어 있습니다.

| Skill | Purpose |
|-------|---------|
| `verify-implementation` | 프로젝트의 모든 verify 스킬을 순차 실행하여 통합 검증 보고서를 생성합니다 |
| `manage-skills` | 세션 변경사항을 분석하고, 검증 스킬을 생성/업데이트하며, CLAUDE.md를 관리합니다 |
| `verify-type-sync` | SkillId/EnemyId/SkillRarity/SkillTag/ElementTag/TargetingStrategy 유니온 타입과 데이터 객체/switch 케이스 간 동기화를 검증합니다 |
| `verify-data-integrity` | 64개 스킬, 45개 시너지, 5종 적, 상점 확률, 레벨 테이블의 구조적 무결성과 밸런스 규칙을 검증합니다 |
| `verify-scene-events` | 5개 Phaser 씬 등록/전환과 23개 GameEvent 이벤트 emit/on 매칭을 검증합니다 |
