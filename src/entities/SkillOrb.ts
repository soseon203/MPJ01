import Phaser from 'phaser';
import { SkillId } from '../utils/types';
import {
  ORB_ORBIT_RADIUS,
  ORB_ORBIT_SPEED,
  ORB_BASE_SIZE,
  ORB_MAX_SIZE,
} from '../utils/constants';

/**
 * SkillOrb - 타워 주위를 도는 스킬 오브
 * 활성 스킬의 시각적 표현. 2.5D 타원 궤도를 돌며 깊이감을 연출
 */
export class SkillOrb extends Phaser.GameObjects.Container {
  public orbitAngle: number = 0;
  public orbitRadius: number;
  public orbitSpeed: number;
  public skillId: SkillId;
  public skillLevel: number;
  public attackCooldown: number = 0;

  private bodyGraphics: Phaser.GameObjects.Graphics;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private shadowGraphics: Phaser.GameObjects.Graphics;
  private skillColor: number;
  private currentSize: number;
  private glowPulse = 0;
  private glowPulseTween: Phaser.Tweens.Tween | null = null;

  constructor(
    scene: Phaser.Scene,
    towerX: number,
    towerY: number,
    skillId: SkillId,
    skillColor: number,
    orbitIndex: number,
    totalOrbs: number
  ) {
    super(scene, towerX, towerY);
    scene.add.existing(this);

    this.skillId = skillId;
    this.skillColor = skillColor;
    this.skillLevel = 1;
    this.orbitRadius = ORB_ORBIT_RADIUS;
    this.orbitSpeed = ORB_ORBIT_SPEED;
    this.currentSize = ORB_BASE_SIZE;

    // Set starting angle for even spacing
    this.setOrbitPosition(orbitIndex, totalOrbs);

    // Create visual layers: shadow -> glow -> body
    this.shadowGraphics = scene.add.graphics();
    this.add(this.shadowGraphics);

    this.glowGraphics = scene.add.graphics();
    this.add(this.glowGraphics);

    this.bodyGraphics = scene.add.graphics();
    this.add(this.bodyGraphics);

    // Start glow pulse tween
    this.glowPulseTween = scene.tweens.add({
      targets: this,
      glowPulse: { from: 0, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Initial draw
    this._drawOrb();
    this._drawShadow();

    // Set initial position
    const posX = towerX + Math.cos(this.orbitAngle) * this.orbitRadius;
    const posY = towerY + Math.sin(this.orbitAngle) * this.orbitRadius * 0.6;
    this.setPosition(posX, posY);
  }

  // ===== Orbit Positioning =====

  /** Set starting angle for even spacing among orbs */
  setOrbitPosition(index: number, total: number): void {
    this.orbitAngle = (index / total) * Math.PI * 2;
  }

  // ===== Level Management =====

  /** Update orb size based on skill level */
  setLevel(level: number): void {
    this.skillLevel = level;
    this.currentSize = Math.min(ORB_BASE_SIZE + level * 2, ORB_MAX_SIZE);
    this._drawOrb();
  }

  // ===== Visual Drawing =====

  /** Draw the main orb body with glow */
  private _drawOrb(): void {
    const size = this.currentSize;
    const color = this.skillColor;
    const glowSize = size + 4 + this.glowPulse * 3;

    // Draw glow (larger, lower alpha, behind body)
    this.glowGraphics.clear();
    this.glowGraphics.fillStyle(color, 0.15 + this.glowPulse * 0.1);
    this.glowGraphics.fillCircle(0, 0, glowSize);
    // Second glow ring
    this.glowGraphics.fillStyle(color, 0.08);
    this.glowGraphics.fillCircle(0, 0, glowSize + 4);

    // Draw main body
    this.bodyGraphics.clear();

    // Outer ring
    this.bodyGraphics.fillStyle(color, 0.85);
    this.bodyGraphics.fillCircle(0, 0, size);

    // Inner highlight (gives it a sphere look)
    const highlightColor = Phaser.Display.Color.IntegerToColor(color);
    const lighter = Phaser.Display.Color.GetColor(
      Math.min(255, highlightColor.red + 80),
      Math.min(255, highlightColor.green + 80),
      Math.min(255, highlightColor.blue + 80)
    );
    this.bodyGraphics.fillStyle(lighter, 0.6);
    this.bodyGraphics.fillCircle(-size * 0.2, -size * 0.2, size * 0.5);

    // Core bright spot
    this.bodyGraphics.fillStyle(0xffffff, 0.5);
    this.bodyGraphics.fillCircle(-size * 0.15, -size * 0.25, size * 0.25);

    // Outer edge ring
    this.bodyGraphics.lineStyle(1, 0xffffff, 0.3);
    this.bodyGraphics.strokeCircle(0, 0, size);
  }

  /** Draw the shadow below the orb */
  private _drawShadow(): void {
    this.shadowGraphics.clear();
    // Small dark ellipse below
    this.shadowGraphics.fillStyle(0x000000, 0.2);
    this.shadowGraphics.fillEllipse(0, this.currentSize + 6, this.currentSize * 1.2, this.currentSize * 0.4);
  }

  // ===== Update =====

  /** Update orbit position, 2.5D scale, depth sort */
  update(delta: number, towerX: number, towerY: number): void {
    // Update angle
    this.orbitAngle += this.orbitSpeed * delta;
    if (this.orbitAngle > Math.PI * 2) {
      this.orbitAngle -= Math.PI * 2;
    }

    // Calculate position on elliptical orbit (compressed Y for 2.5D)
    const posX = towerX + Math.cos(this.orbitAngle) * this.orbitRadius;
    const posY = towerY + Math.sin(this.orbitAngle) * this.orbitRadius * 0.6;
    this.setPosition(posX, posY);

    // 2.5D scale effect:
    // At bottom (angle=PI/2, sin=1): scale=1.0 (close to viewer)
    // At top (angle=3PI/2, sin=-1): scale=0.7 (far from viewer)
    const scaleFactor = 0.7 + 0.3 * (Math.sin(this.orbitAngle) + 1) / 2;
    this.setScale(scaleFactor);

    // Update shadow position (below orb, squished by perspective)
    this.shadowGraphics.clear();
    this.shadowGraphics.fillStyle(0x000000, 0.15 * scaleFactor);
    const shadowY = this.currentSize + 6;
    this.shadowGraphics.fillEllipse(0, shadowY, this.currentSize * 1.2, this.currentSize * 0.35);

    // Depth sort: higher y = higher depth (closer to viewer = rendered on top)
    // Use a depth range that interacts well with tower (depth 10) and other entities
    const depthBase = 9; // Slightly below tower
    const depthOffset = Math.sin(this.orbitAngle) > 0 ? 2 : -2; // Front orbs above tower, back orbs below
    this.setDepth(depthBase + depthOffset);

    // Redraw orb with updated glow pulse
    this._drawOrb();

    // Update attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }
  }

  // ===== Cleanup =====

  destroy(fromScene?: boolean): void {
    if (this.glowPulseTween) {
      this.glowPulseTween.destroy();
      this.glowPulseTween = null;
    }
    super.destroy(fromScene);
  }
}
