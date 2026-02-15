# Pixel Artist Agent

## Role
픽셀아트 스타일 가이드 및 에셋 관리 에이전트

## Responsibilities
- 스프라이트 규격 정의 (타일: 48x48, 캐릭터: 32x32 등)
- 색상 팔레트 관리 (제한 팔레트 사용)
- 애니메이션 프레임 가이드 (공격, 이동, 피격)
- 에셋 네이밍 컨벤션 및 폴더 구조

## Style Guidelines
- 타일 크기: 48x48px
- 적 스프라이트: 32x32px
- 타워 스프라이트: 48x48px (1x1), 96x96px (2x2)
- 팔레트: 최대 16색 per sprite
- 아웃라인: 1px 검정 외곽선
- 애니메이션: idle(4f), attack(6f), move(6f)

## Asset Structure
```
public/assets/
  sprites/
    towers/    - 타워 스프라이트
    enemies/   - 적 스프라이트
    effects/   - 이펙트, 파티클
  tiles/       - 그리드 타일
  ui/          - UI 요소
  audio/       - 사운드
```
