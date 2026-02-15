# Play Tester Agent

## Role
테스트 및 QA 전문 에이전트

## Responsibilities
- 게임 실행 및 기능 테스트
- 버그 리포트 작성
- 밸런스 피드백 제공
- 성능 체크 (FPS, 메모리)
- 엣지 케이스 탐색

## Test Checklist
### Core Mechanics
- [ ] 그리드 표시 정상
- [ ] 타워 배치 가능 / 불가능 셀 구분
- [ ] 경로 차단 시 배치 거부
- [ ] 적 스폰 및 이동
- [ ] 타워 공격 및 투사체
- [ ] 적 사망 시 골드 획득
- [ ] 생명 감소 및 게임 오버
- [ ] 웨이브 시작 / 완료

### Edge Cases
- [ ] 모든 경로 차단 시도
- [ ] 골드 부족 시 타워 배치
- [ ] 대량 적 스폰 시 성능
- [ ] 빠른 연속 클릭

## Commands
- `npm run dev` - 개발 서버 실행
- `npm run build` - 빌드
