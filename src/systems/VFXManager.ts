import Phaser from 'phaser';
import { FONT_FAMILY, COLORS } from '../utils/constants';

/**
 * VFXManager - 시각 효과 관리자
 * 모든 그래픽은 프로시저럴 (스프라이트 없음)
 * 데미지 텍스트, 사망 폭발, 골드 획득, 스플래시 원, 체인 번개 등
 */
export class VFXManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ===== Text Effects =====

  /** Generic floating text that rises and fades */
  floatingText(x: number, y: number, text: string, color: number, size = 12): void {
    const colorStr = `#${color.toString(16).padStart(6, '0')}`;
    const txt = this.scene.add.text(x, y, text, {
      fontSize: `${size}px`,
      fontFamily: FONT_FAMILY,
      color: colorStr,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50);

    this.scene.tweens.add({
      targets: txt,
      y: y - 40,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  /** Floating damage number (yellow, red+larger if crit) */
  damageNumber(x: number, y: number, damage: number, isCrit: boolean): void {
    const displayText = `${Math.round(damage)}`;
    const color = isCrit ? '#ff4444' : '#ffff44';
    const size = isCrit ? 18 : 12;

    const txt = this.scene.add.text(
      x + (Math.random() - 0.5) * 10,
      y - 10,
      isCrit ? `${displayText}!` : displayText,
      {
        fontSize: `${size}px`,
        fontFamily: FONT_FAMILY,
        color,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: isCrit ? 3 : 2,
      }
    ).setOrigin(0.5).setDepth(50);

    if (isCrit) {
      txt.setScale(1.5);
    }

    this.scene.tweens.add({
      targets: txt,
      y: y - 45,
      alpha: 0,
      scaleX: isCrit ? 1.0 : 0.8,
      scaleY: isCrit ? 1.0 : 0.8,
      duration: 700,
      ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  /** Gold amount text in gold color */
  goldText(x: number, y: number, amount: number): void {
    const amtStr = amount % 1 === 0 ? `${amount}` : amount.toFixed(1);
    const txt = this.scene.add.text(x + 8, y - 8, `+${amtStr}G`, {
      fontSize: '11px',
      fontFamily: FONT_FAMILY,
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50);

    this.scene.tweens.add({
      targets: txt,
      y: y - 35,
      alpha: 0,
      duration: 900,
      ease: 'Power1',
      onComplete: () => txt.destroy(),
    });
  }

  /** EXP amount text in purple */
  expText(x: number, y: number, amount: number): void {
    const txt = this.scene.add.text(x - 8, y - 8, `+${amount}XP`, {
      fontSize: '10px',
      fontFamily: FONT_FAMILY,
      color: '#aa88ff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50);

    this.scene.tweens.add({
      targets: txt,
      y: y - 35,
      alpha: 0,
      duration: 900,
      ease: 'Power1',
      onComplete: () => txt.destroy(),
    });
  }

  // ===== Explosion Effects =====

  /** Particle burst on enemy death (8-12 particles flying outward) */
  deathExplosion(x: number, y: number, color: number, size: number): void {
    const count = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 40 + Math.random() * 60;
      const particleSize = 2 + Math.random() * 3;

      const particle = this.scene.add.circle(x, y, particleSize, color, 0.9);
      particle.setDepth(20);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 300 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    // Flash circle
    const flash = this.scene.add.circle(x, y, size * 1.5, 0xffffff, 0.6);
    flash.setDepth(19);
    this.scene.tweens.add({
      targets: flash,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  }

  /** Multi-ring spectacular explosion for boss death */
  bossDeathExplosion(x: number, y: number): void {
    // Multiple expanding rings
    const ringColors = [0xff4400, 0xffaa00, 0xff0000, 0xffd700, 0xff6600];
    for (let ring = 0; ring < 5; ring++) {
      this.scene.time.delayedCall(ring * 80, () => {
        const r = this.scene.add.circle(x, y, 10, ringColors[ring], 0.8);
        r.setDepth(21);
        this.scene.tweens.add({
          targets: r,
          scaleX: 5 + ring * 1.5,
          scaleY: 5 + ring * 1.5,
          alpha: 0,
          duration: 500,
          ease: 'Power2',
          onComplete: () => r.destroy(),
        });
      });
    }

    // Massive particle burst
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      const colors = [0xff4400, 0xffaa00, 0xff0000, 0xffd700, 0xffffff];
      const pColor = colors[Math.floor(Math.random() * colors.length)];
      const particle = this.scene.add.circle(x, y, 3 + Math.random() * 5, pColor, 1);
      particle.setDepth(22);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 600 + Math.random() * 400,
        ease: 'Power3',
        onComplete: () => particle.destroy(),
      });
    }

    // Central white flash
    const cFlash = this.scene.add.circle(x, y, 20, 0xffffff, 0.9);
    cFlash.setDepth(23);
    this.scene.tweens.add({
      targets: cFlash,
      scaleX: 4,
      scaleY: 4,
      alpha: 0,
      duration: 300,
      onComplete: () => cFlash.destroy(),
    });
  }

  // ===== Ring / Area Effects =====

  /** Expanding ring effect */
  splashRing(x: number, y: number, radius: number, color: number): void {
    const ring = this.scene.add.circle(x, y, 4, color, 0);
    ring.setStrokeStyle(2, color, 0.7);
    ring.setDepth(18);

    this.scene.tweens.add({
      targets: ring,
      scaleX: radius / 4,
      scaleY: radius / 4,
      alpha: 0,
      duration: 300,
      ease: 'Power1',
      onComplete: () => ring.destroy(),
    });
  }

  // ===== Line / Chain Effects =====

  /** Jagged lightning line between two points (4-6 segments with random offsets) */
  chainLightning(x1: number, y1: number, x2: number, y2: number, color = 0x44ddff): void {
    const gfx = this.scene.add.graphics();
    gfx.setDepth(17);

    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const segments = 4 + Math.floor(Math.random() * 3); // 4-6 segments

    // Perpendicular direction for offsets
    const nx = -dy / dist;
    const ny = dx / dist;

    // Main bolt
    gfx.lineStyle(2, color, 0.9);
    gfx.beginPath();
    gfx.moveTo(x1, y1);
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const offset = (Math.random() - 0.5) * 20;
      const px = x1 + dx * t + nx * offset;
      const py = y1 + dy * t + ny * offset;
      gfx.lineTo(px, py);
    }
    gfx.lineTo(x2, y2);
    gfx.strokePath();

    // Inner glow line (thinner, brighter)
    gfx.lineStyle(1, 0xffffff, 0.6);
    gfx.beginPath();
    gfx.moveTo(x1, y1);
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const offset = (Math.random() - 0.5) * 10;
      const px = x1 + dx * t + nx * offset;
      const py = y1 + dy * t + ny * offset;
      gfx.lineTo(px, py);
    }
    gfx.lineTo(x2, y2);
    gfx.strokePath();

    this.scene.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 200,
      onComplete: () => gfx.destroy(),
    });
  }

  // ===== Tower / Muzzle Effects =====

  /** Brief flash at tower position */
  muzzleFlash(x: number, y: number, color: number): void {
    const flash = this.scene.add.circle(x, y, 6, color, 0.8);
    flash.setDepth(16);

    this.scene.tweens.add({
      targets: flash,
      scaleX: 0.2,
      scaleY: 0.2,
      alpha: 0,
      duration: 100,
      onComplete: () => flash.destroy(),
    });

    // Outer glow
    const glow = this.scene.add.circle(x, y, 10, color, 0.3);
    glow.setDepth(15);
    this.scene.tweens.add({
      targets: glow,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 150,
      onComplete: () => glow.destroy(),
    });
  }

  // ===== Status Effect Visuals =====

  /** Ice crystal particles */
  freezeEffect(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const crystal = this.scene.add.rectangle(
        x + Math.cos(angle) * 8,
        y + Math.sin(angle) * 8,
        3, 8, 0x88ddff, 0.8
      );
      crystal.setRotation(angle);
      crystal.setDepth(20);

      this.scene.tweens.add({
        targets: crystal,
        x: x + Math.cos(angle) * 25,
        y: y + Math.sin(angle) * 25,
        alpha: 0,
        scaleX: 0.5,
        scaleY: 0.5,
        duration: 400,
        onComplete: () => crystal.destroy(),
      });
    }

    // Central ice flash
    const iceFlash = this.scene.add.circle(x, y, 8, 0x88ddff, 0.5);
    iceFlash.setDepth(19);
    this.scene.tweens.add({
      targets: iceFlash,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => iceFlash.destroy(),
    });
  }

  /** Green bubbles for poison effect */
  poisonEffect(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      const ox = (Math.random() - 0.5) * 16;
      const oy = (Math.random() - 0.5) * 16;
      const bubbleSize = 3 + Math.random() * 4;
      const bubble = this.scene.add.circle(x + ox, y + oy, bubbleSize, 0x44ff44, 0.6);
      bubble.setDepth(20);

      this.scene.tweens.add({
        targets: bubble,
        y: y + oy - 20 - Math.random() * 10,
        scaleX: 0.3,
        scaleY: 0.3,
        alpha: 0,
        duration: 500 + Math.random() * 300,
        ease: 'Power1',
        onComplete: () => bubble.destroy(),
      });
    }
  }

  /** Fire particles for burn effect */
  burnEffect(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const ox = (Math.random() - 0.5) * 12;
      const oy = (Math.random() - 0.5) * 12;
      const colors = [0xff4400, 0xff6600, 0xffaa00, 0xffcc00];
      const fColor = colors[Math.floor(Math.random() * colors.length)];
      const particleSize = 2 + Math.random() * 3;

      const flame = this.scene.add.circle(x + ox, y + oy, particleSize, fColor, 0.8);
      flame.setDepth(20);

      this.scene.tweens.add({
        targets: flame,
        y: y + oy - 18 - Math.random() * 12,
        x: x + ox + (Math.random() - 0.5) * 8,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 300 + Math.random() * 200,
        ease: 'Power1',
        onComplete: () => flame.destroy(),
      });
    }
  }

  // ===== Progression Effects =====

  /** Golden sparkles + "LEVEL UP!" text */
  levelUpEffect(x: number, y: number): void {
    // Golden sparkle burst
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.3;
      const speed = 40 + Math.random() * 60;
      const pSize = 2 + Math.random() * 3;
      const colors = [0xffd700, 0xffee88, 0xffffff, 0xffaa00];
      const pColor = colors[Math.floor(Math.random() * colors.length)];

      const particle = this.scene.add.circle(x, y, pSize, pColor, 0.9);
      particle.setDepth(52);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 500 + Math.random() * 300,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    // Glow ring
    const glow = this.scene.add.circle(x, y, 10, 0xffd700, 0.7);
    glow.setDepth(51);
    this.scene.tweens.add({
      targets: glow,
      scaleX: 5,
      scaleY: 5,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => glow.destroy(),
    });

    // "LEVEL UP!" text
    const txt = this.scene.add.text(x, y - 20, 'LEVEL UP!', {
      fontSize: '16px',
      fontFamily: FONT_FAMILY,
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(53);

    this.scene.tweens.add({
      targets: txt,
      y: y - 60,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  /** Sparkle ring effect for skill purchase */
  skillPurchaseEffect(x: number, y: number, color: number): void {
    // Ring pulse
    const ring = this.scene.add.circle(x, y, 8, color, 0);
    ring.setStrokeStyle(2, color, 0.8);
    ring.setDepth(51);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 4,
      scaleY: 4,
      alpha: 0,
      duration: 500,
      ease: 'Power1',
      onComplete: () => ring.destroy(),
    });

    // Sparkles along the ring
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      const radius = 30;
      const spark = this.scene.add.circle(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
        2, 0xffffff, 0.9
      );
      spark.setDepth(52);

      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * (radius + 20),
        y: y + Math.sin(angle) * (radius + 20),
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: 400 + Math.random() * 200,
        delay: i * 30,
        onComplete: () => spark.destroy(),
      });
    }
  }

  /** Rainbow flash for synergy activation */
  synergyActivateEffect(x: number, y: number): void {
    const rainbowColors = [0xff0000, 0xff8800, 0xffff00, 0x44ff44, 0x4488ff, 0x8844ff];

    // Concentric rainbow rings
    for (let i = 0; i < rainbowColors.length; i++) {
      this.scene.time.delayedCall(i * 40, () => {
        const ring = this.scene.add.circle(x, y, 6, rainbowColors[i], 0);
        ring.setStrokeStyle(3, rainbowColors[i], 0.8);
        ring.setDepth(51);

        this.scene.tweens.add({
          targets: ring,
          scaleX: 5 + i,
          scaleY: 5 + i,
          alpha: 0,
          duration: 500,
          ease: 'Power2',
          onComplete: () => ring.destroy(),
        });
      });
    }

    // Central white flash
    const flash = this.scene.add.circle(x, y, 15, 0xffffff, 0.8);
    flash.setDepth(52);
    this.scene.tweens.add({
      targets: flash,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    // "SYNERGY!" text
    const txt = this.scene.add.text(x, y - 25, 'SYNERGY!', {
      fontSize: '14px',
      fontFamily: FONT_FAMILY,
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(53);

    this.scene.tweens.add({
      targets: txt,
      y: y - 55,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  // ===== Orb Attack Effects =====

  /** Visual effect for orb attacks based on element type */
  orbAttackEffect(
    fromX: number, fromY: number,
    toX: number, toY: number,
    color: number, type: string
  ): void {
    switch (type) {
      case 'fire':
        this._fireOrbAttack(fromX, fromY, toX, toY);
        break;
      case 'ice':
        this._iceOrbAttack(fromX, fromY, toX, toY);
        break;
      case 'lightning':
        this._lightningOrbAttack(fromX, fromY, toX, toY);
        break;
      case 'poison':
        this._poisonOrbAttack(fromX, fromY, toX, toY);
        break;
      case 'dark':
        this._darkOrbAttack(fromX, fromY, toX, toY);
        break;
      case 'nature':
        this._natureOrbAttack(fromX, fromY, toX, toY);
        break;
      default:
        this._defaultOrbAttack(fromX, fromY, toX, toY, color);
        break;
    }
  }

  /** Fire: orange-red bolt */
  private _fireOrbAttack(fromX: number, fromY: number, toX: number, toY: number): void {
    const bolt = this.scene.add.circle(fromX, fromY, 4, 0xff4400, 0.9);
    bolt.setDepth(17);

    // Trail particles
    const trailTimer = this.scene.time.addEvent({
      delay: 20,
      repeat: -1,
      callback: () => {
        const trail = this.scene.add.circle(bolt.x, bolt.y, 2 + Math.random() * 2, 0xff6600, 0.6);
        trail.setDepth(16);
        this.scene.tweens.add({
          targets: trail,
          scaleX: 0,
          scaleY: 0,
          alpha: 0,
          duration: 200,
          onComplete: () => trail.destroy(),
        });
      },
    });

    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.max(80, dist * 1.5);

    this.scene.tweens.add({
      targets: bolt,
      x: toX,
      y: toY,
      duration,
      ease: 'Power1',
      onComplete: () => {
        trailTimer.destroy();
        bolt.destroy();
        // Impact flash
        this.burnEffect(toX, toY);
      },
    });
  }

  /** Ice: cyan shard */
  private _iceOrbAttack(fromX: number, fromY: number, toX: number, toY: number): void {
    const gfx = this.scene.add.graphics();
    gfx.setDepth(17);
    gfx.fillStyle(0x88ddff, 0.9);
    gfx.fillPoints([
      new Phaser.Geom.Point(0, -6),
      new Phaser.Geom.Point(3, 0),
      new Phaser.Geom.Point(0, 6),
      new Phaser.Geom.Point(-3, 0),
    ], true);
    gfx.setPosition(fromX, fromY);

    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.max(80, dist * 1.5);

    this.scene.tweens.add({
      targets: gfx,
      x: toX,
      y: toY,
      duration,
      ease: 'Linear',
      onComplete: () => {
        gfx.destroy();
        this.freezeEffect(toX, toY);
      },
    });
  }

  /** Lightning: yellow zigzag */
  private _lightningOrbAttack(fromX: number, fromY: number, toX: number, toY: number): void {
    this.chainLightning(fromX, fromY, toX, toY, 0xffff44);
    // Impact spark
    const spark = this.scene.add.circle(toX, toY, 5, 0xffff44, 0.8);
    spark.setDepth(18);
    this.scene.tweens.add({
      targets: spark,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 150,
      onComplete: () => spark.destroy(),
    });
  }

  /** Poison: green blob */
  private _poisonOrbAttack(fromX: number, fromY: number, toX: number, toY: number): void {
    const blob = this.scene.add.circle(fromX, fromY, 5, 0x44ff44, 0.8);
    blob.setDepth(17);

    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.max(100, dist * 2);

    // Wobbly motion
    this.scene.tweens.add({
      targets: blob,
      x: toX,
      y: toY,
      scaleX: { value: 1.3, duration: duration / 4, yoyo: true, repeat: 2 },
      scaleY: { value: 0.7, duration: duration / 4, yoyo: true, repeat: 2 },
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        blob.destroy();
        this.poisonEffect(toX, toY);
      },
    });
  }

  /** Dark: purple wisp */
  private _darkOrbAttack(fromX: number, fromY: number, toX: number, toY: number): void {
    const wisp = this.scene.add.circle(fromX, fromY, 4, 0x8844ff, 0.7);
    wisp.setDepth(17);

    const outerGlow = this.scene.add.circle(fromX, fromY, 8, 0x6622cc, 0.3);
    outerGlow.setDepth(16);

    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.max(100, dist * 2);

    // Wisp curves slightly
    const midX = (fromX + toX) / 2 + (Math.random() - 0.5) * 40;
    const midY = (fromY + toY) / 2 + (Math.random() - 0.5) * 40;

    // Use timeline for curved path
    this.scene.tweens.add({
      targets: [wisp, outerGlow],
      x: midX,
      y: midY,
      duration: duration / 2,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: [wisp, outerGlow],
          x: toX,
          y: toY,
          duration: duration / 2,
          ease: 'Sine.easeIn',
          onComplete: () => {
            wisp.destroy();
            outerGlow.destroy();
            // Dark impact
            const impact = this.scene.add.circle(toX, toY, 6, 0x6622cc, 0.6);
            impact.setDepth(18);
            this.scene.tweens.add({
              targets: impact,
              scaleX: 2.5,
              scaleY: 2.5,
              alpha: 0,
              duration: 300,
              onComplete: () => impact.destroy(),
            });
          },
        });
      },
    });
  }

  /** Nature: green leaf */
  private _natureOrbAttack(fromX: number, fromY: number, toX: number, toY: number): void {
    const gfx = this.scene.add.graphics();
    gfx.setDepth(17);
    // Leaf shape
    gfx.fillStyle(0x44cc44, 0.9);
    gfx.beginPath();
    gfx.moveTo(0, -5);
    gfx.lineTo(4, 0);
    gfx.lineTo(0, 5);
    gfx.lineTo(-4, 0);
    gfx.closePath();
    gfx.fillPath();
    // Stem
    gfx.lineStyle(1, 0x228822, 0.8);
    gfx.lineBetween(0, -3, 0, 3);
    gfx.setPosition(fromX, fromY);

    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.max(80, dist * 1.5);

    this.scene.tweens.add({
      targets: gfx,
      x: toX,
      y: toY,
      rotation: Math.PI * 2,
      duration,
      ease: 'Linear',
      onComplete: () => {
        gfx.destroy();
        // Leaf burst
        for (let i = 0; i < 4; i++) {
          const angle = (Math.PI * 2 * i) / 4 + Math.random() * 0.5;
          const leaf = this.scene.add.circle(toX, toY, 2, 0x44cc44, 0.7);
          leaf.setDepth(18);
          this.scene.tweens.add({
            targets: leaf,
            x: toX + Math.cos(angle) * 15,
            y: toY + Math.sin(angle) * 15,
            alpha: 0,
            duration: 300,
            onComplete: () => leaf.destroy(),
          });
        }
      },
    });
  }

  /** Default: colored bolt */
  private _defaultOrbAttack(fromX: number, fromY: number, toX: number, toY: number, color: number): void {
    const bolt = this.scene.add.circle(fromX, fromY, 3, color, 0.9);
    bolt.setDepth(17);

    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.max(60, dist * 1.2);

    this.scene.tweens.add({
      targets: bolt,
      x: toX,
      y: toY,
      duration,
      ease: 'Linear',
      onComplete: () => {
        bolt.destroy();
        const impact = this.scene.add.circle(toX, toY, 4, color, 0.6);
        impact.setDepth(18);
        this.scene.tweens.add({
          targets: impact,
          scaleX: 2,
          scaleY: 2,
          alpha: 0,
          duration: 200,
          onComplete: () => impact.destroy(),
        });
      },
    });
  }

  // ===== Projectile Effects =====

  /** Small fading dot trail */
  projectileTrail(x: number, y: number, color: number): void {
    const dot = this.scene.add.circle(x, y, 2, color, 0.5);
    dot.setDepth(14);

    this.scene.tweens.add({
      targets: dot,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 150,
      onComplete: () => dot.destroy(),
    });
  }

  /** Create a small projectile graphic (returns Graphics - caller manages lifecycle) */
  createProjectileVisual(color: number, isCrit: boolean): Phaser.GameObjects.Graphics {
    const gfx = this.scene.add.graphics();
    gfx.setDepth(15);

    const radius = isCrit ? 5 : 3;

    // Outer glow
    gfx.fillStyle(color, 0.3);
    gfx.fillCircle(0, 0, radius + 3);

    // Main body
    gfx.fillStyle(color, 0.9);
    gfx.fillCircle(0, 0, radius);

    // Inner bright core
    gfx.fillStyle(0xffffff, 0.6);
    gfx.fillCircle(0, 0, radius * 0.4);

    if (isCrit) {
      // Extra glow ring for crits
      gfx.lineStyle(1, 0xffffff, 0.5);
      gfx.strokeCircle(0, 0, radius + 1);
    }

    return gfx;
  }
}
