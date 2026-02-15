// ============================================================
// 라스트타워 - 사각 경로 시스템
// ============================================================

export interface PathRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * 타워 주변의 사각형 경로를 관리합니다.
 *
 * 경로 진행(progress 0~1):
 *   0.00 ~ 0.25 : 상단 변 (x1,y1) -> (x2,y1) 좌->우
 *   0.25 ~ 0.50 : 우측 변 (x2,y1) -> (x2,y2) 상->하
 *   0.50 ~ 0.75 : 하단 변 (x2,y2) -> (x1,y2) 우->좌
 *   0.75 ~ 1.00 : 좌측 변 (x1,y2) -> (x1,y1) 하->상
 */
export class SquarePathSystem {
  private pathRect: PathRect;
  private width: number;
  private height: number;
  private perimeter: number;

  constructor(pathRect: PathRect) {
    this.pathRect = pathRect;
    this.width = pathRect.x2 - pathRect.x1;
    this.height = pathRect.y2 - pathRect.y1;
    this.perimeter = 2 * (this.width + this.height);
  }

  /** 전체 경로 길이(px) */
  getPerimeter(): number {
    return this.perimeter;
  }

  /**
   * progress(0~1) 위치의 좌표를 반환합니다.
   * progress는 0~1 범위로 순환합니다.
   */
  getPositionAt(progress: number): { x: number; y: number } {
    // 0~1 범위로 정규화 (음수나 1 초과 대응)
    let p = progress % 1;
    if (p < 0) p += 1;

    const { x1, y1, x2, y2 } = this.pathRect;

    if (p <= 0.25) {
      // 상단 변: (x1,y1) -> (x2,y1)
      const t = p / 0.25;
      return { x: x1 + this.width * t, y: y1 };
    } else if (p <= 0.5) {
      // 우측 변: (x2,y1) -> (x2,y2)
      const t = (p - 0.25) / 0.25;
      return { x: x2, y: y1 + this.height * t };
    } else if (p <= 0.75) {
      // 하단 변: (x2,y2) -> (x1,y2)
      const t = (p - 0.5) / 0.25;
      return { x: x2 - this.width * t, y: y2 };
    } else {
      // 좌측 변: (x1,y2) -> (x1,y1)
      const t = (p - 0.75) / 0.25;
      return { x: x1, y: y2 - this.height * t };
    }
  }

  /**
   * progress 위치에서의 이동 방향 각도(라디안)를 반환합니다.
   * 0: 우, π/2: 하, π: 좌, 3π/2 (-π/2): 상
   */
  getDirectionAt(progress: number): number {
    let p = progress % 1;
    if (p < 0) p += 1;

    if (p < 0.25) {
      // 상단 변: 좌->우 (0 rad)
      return 0;
    } else if (p < 0.5) {
      // 우측 변: 상->하 (π/2 rad)
      return Math.PI / 2;
    } else if (p < 0.75) {
      // 하단 변: 우->좌 (π rad)
      return Math.PI;
    } else {
      // 좌측 변: 하->상 (3π/2 rad = -π/2)
      return (3 * Math.PI) / 2;
    }
  }

  /** 사각 경로의 4개 꼭짓점을 반환합니다 (좌상, 우상, 우하, 좌하). */
  getCorners(): { x: number; y: number }[] {
    const { x1, y1, x2, y2 } = this.pathRect;
    return [
      { x: x1, y: y1 }, // 좌상 (progress 0)
      { x: x2, y: y1 }, // 우상 (progress 0.25)
      { x: x2, y: y2 }, // 우하 (progress 0.5)
      { x: x1, y: y2 }, // 좌하 (progress 0.75)
    ];
  }

  /**
   * px/s 속도를 progress/s 속도로 변환합니다.
   * progress/s = (px/s) / perimeter
   */
  getProgressSpeed(pixelsPerSecond: number): number {
    if (this.perimeter === 0) return 0;
    return pixelsPerSecond / this.perimeter;
  }
}
