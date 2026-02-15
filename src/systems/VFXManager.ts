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

  /** Ice crystal particles with frost ring + sparkles */
  freezeEffect(x: number, y: number): void {
    // Crystal shards outward (8 instead of 6)
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.2;
      const crystal = this.scene.add.rectangle(
        x + Math.cos(angle) * 6,
        y + Math.sin(angle) * 6,
        2.5, 7 + Math.random() * 4, 0x88ddff, 0.85
      );
      crystal.setRotation(angle);
      crystal.setDepth(20);

      this.scene.tweens.add({
        targets: crystal,
        x: x + Math.cos(angle) * (22 + Math.random() * 10),
        y: y + Math.sin(angle) * (22 + Math.random() * 10),
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 350 + Math.random() * 150,
        onComplete: () => crystal.destroy(),
      });
    }

    // Central ice flash (brighter)
    const iceFlash = this.scene.add.circle(x, y, 10, 0xaaeeff, 0.7);
    iceFlash.setDepth(19);
    this.scene.tweens.add({
      targets: iceFlash,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 250,
      onComplete: () => iceFlash.destroy(),
    });

    // Frost mist ring
    const frostRing = this.scene.add.circle(x, y, 5, 0x88ddff, 0);
    frostRing.setStrokeStyle(2, 0x88ddff, 0.6);
    frostRing.setDepth(19);
    this.scene.tweens.add({
      targets: frostRing,
      scaleX: 3, scaleY: 3, alpha: 0,
      duration: 350,
      onComplete: () => frostRing.destroy(),
    });

    // Ice dust sparkles
    for (let i = 0; i < 5; i++) {
      const spark = this.scene.add.circle(
        x + (Math.random() - 0.5) * 16,
        y + (Math.random() - 0.5) * 16,
        1, 0xffffff, 0.9
      );
      spark.setDepth(21);
      this.scene.tweens.add({
        targets: spark,
        y: spark.y - 8 - Math.random() * 8,
        alpha: 0,
        duration: 300 + Math.random() * 200,
        onComplete: () => spark.destroy(),
      });
    }
  }

  /** Toxic bubbles + dripping acid + green mist */
  poisonEffect(x: number, y: number): void {
    // Rising toxic bubbles (more, varied)
    for (let i = 0; i < 8; i++) {
      const ox = (Math.random() - 0.5) * 18;
      const oy = (Math.random() - 0.5) * 18;
      const colors = [0x44ff44, 0x22cc22, 0x88ff44, 0x66ee44];
      const bubbleSize = 2.5 + Math.random() * 4;
      const bubble = this.scene.add.circle(x + ox, y + oy, bubbleSize,
        colors[Math.floor(Math.random() * colors.length)], 0.7);
      bubble.setDepth(20);

      this.scene.tweens.add({
        targets: bubble,
        y: y + oy - 18 - Math.random() * 14,
        x: x + ox + (Math.random() - 0.5) * 10,
        scaleX: 0.2,
        scaleY: 0.2,
        alpha: 0,
        duration: 400 + Math.random() * 300,
        ease: 'Power1',
        onComplete: () => bubble.destroy(),
      });
    }

    // Toxic mist cloud
    const mist = this.scene.add.circle(x, y, 8, 0x228822, 0.35);
    mist.setDepth(19);
    this.scene.tweens.add({
      targets: mist,
      scaleX: 2.5, scaleY: 2, alpha: 0,
      duration: 400,
      ease: 'Power1',
      onComplete: () => mist.destroy(),
    });

    // Dripping acid drops
    for (let i = 0; i < 3; i++) {
      const drop = this.scene.add.circle(
        x + (Math.random() - 0.5) * 12,
        y,
        1.5, 0x88ff44, 0.8
      );
      drop.setDepth(20);
      this.scene.tweens.add({
        targets: drop,
        y: y + 10 + Math.random() * 8,
        scaleY: 2, alpha: 0,
        duration: 300 + Math.random() * 200,
        ease: 'Power1',
        onComplete: () => drop.destroy(),
      });
    }
  }

  /** Fire particles for burn effect */
  burnEffect(x: number, y: number): void {
    // Core flame burst (large, bright)
    for (let i = 0; i < 10; i++) {
      const ox = (Math.random() - 0.5) * 16;
      const oy = (Math.random() - 0.5) * 16;
      const colors = [0xff2200, 0xff4400, 0xff6600, 0xffaa00, 0xffcc00, 0xffee44];
      const fColor = colors[Math.floor(Math.random() * colors.length)];
      const particleSize = 3 + Math.random() * 4;

      const flame = this.scene.add.circle(x + ox, y + oy, particleSize, fColor, 0.9);
      flame.setDepth(20);

      this.scene.tweens.add({
        targets: flame,
        y: y + oy - 22 - Math.random() * 18,
        x: x + ox + (Math.random() - 0.5) * 14,
        scaleX: 0.2,
        scaleY: 0.2,
        alpha: 0,
        duration: 350 + Math.random() * 250,
        ease: 'Power1',
        onComplete: () => flame.destroy(),
      });
    }

    // Ember sparks (tiny, fast, upward)
    for (let i = 0; i < 6; i++) {
      const spark = this.scene.add.circle(
        x + (Math.random() - 0.5) * 10,
        y + (Math.random() - 0.5) * 6,
        1 + Math.random(), 0xffee44, 1
      );
      spark.setDepth(21);
      this.scene.tweens.add({
        targets: spark,
        y: y - 30 - Math.random() * 20,
        x: x + (Math.random() - 0.5) * 24,
        alpha: 0,
        duration: 400 + Math.random() * 300,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      });
    }

    // Heat distortion ring
    const heatRing = this.scene.add.circle(x, y, 6, 0xff6600, 0.3);
    heatRing.setDepth(19);
    this.scene.tweens.add({
      targets: heatRing,
      scaleX: 3, scaleY: 2.5, alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => heatRing.destroy(),
    });
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

  private getRarityMultiplier(rarity: string): number {
    switch (rarity) {
      case 'rare': return 1.3;
      case 'unique': return 1.6;
      case 'mythic': return 2.0;
      case 'legend': return 2.5;
      default: return 1.0;
    }
  }

  /** Visual effect for orb attacks based on element type and rarity */
  orbAttackEffect(
    fromX: number, fromY: number,
    toX: number, toY: number,
    color: number, type: string, rarity = 'normal'
  ): void {
    switch (type) {
      case 'fire':
        this._fireOrbAttack(fromX, fromY, toX, toY, rarity);
        break;
      case 'ice':
        this._iceOrbAttack(fromX, fromY, toX, toY, rarity);
        break;
      case 'lightning':
        this._lightningOrbAttack(fromX, fromY, toX, toY, rarity);
        break;
      case 'poison':
        this._poisonOrbAttack(fromX, fromY, toX, toY, rarity);
        break;
      case 'dark':
        this._darkOrbAttack(fromX, fromY, toX, toY, rarity);
        break;
      case 'nature':
        this._natureOrbAttack(fromX, fromY, toX, toY, rarity);
        break;
      default:
        this._defaultOrbAttack(fromX, fromY, toX, toY, color, rarity);
        break;
    }
  }

  /** Fire: blazing fireball with trailing embers */
  private _fireOrbAttack(fromX: number, fromY: number, toX: number, toY: number, rarity: string): void {
    const m = this.getRarityMultiplier(rarity);

    // Main fireball (bright core + outer glow)
    const glow = this.scene.add.circle(fromX, fromY, 8 * m, 0xff4400, 0.3);
    glow.setDepth(16);
    const bolt = this.scene.add.circle(fromX, fromY, 4 * m, 0xffaa00, 1);
    bolt.setDepth(17);
    const core = this.scene.add.circle(fromX, fromY, 2 * m, 0xffee88, 1);
    core.setDepth(18);

    // Flame trail particles (dense, multi-colored)
    const trailTimer = this.scene.time.addEvent({
      delay: Math.max(8, Math.round(15 / m)),
      repeat: -1,
      callback: () => {
        const colors = [0xff2200, 0xff4400, 0xff6600, 0xffaa00];
        const trail = this.scene.add.circle(
          bolt.x + (Math.random() - 0.5) * 4 * m,
          bolt.y + (Math.random() - 0.5) * 4 * m,
          (2 + Math.random() * 3) * m,
          colors[Math.floor(Math.random() * colors.length)],
          0.7
        );
        trail.setDepth(16);
        this.scene.tweens.add({
          targets: trail,
          y: trail.y - (6 + Math.random() * 8) * m,
          scaleX: 0,
          scaleY: 0,
          alpha: 0,
          duration: 150 + Math.random() * 100,
          onComplete: () => trail.destroy(),
        });

        // Occasional ember spark
        if (Math.random() < Math.min(0.6, 0.3 * m)) {
          const spark = this.scene.add.circle(bolt.x, bolt.y, 1 * m, 0xffee44, 1);
          spark.setDepth(17);
          this.scene.tweens.add({
            targets: spark,
            x: spark.x + (Math.random() - 0.5) * 16 * m,
            y: spark.y - (8 + Math.random() * 12) * m,
            alpha: 0,
            duration: 200 + Math.random() * 150,
            onComplete: () => spark.destroy(),
          });
        }
      },
    });

    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.max(80, dist * 1.5);

    // Animate all layers
    [glow, bolt, core].forEach(obj => {
      this.scene.tweens.add({
        targets: obj,
        x: toX, y: toY,
        duration,
        ease: 'Power1',
      });
    });

    this.scene.tweens.add({
      targets: glow,
      x: toX, y: toY,
      duration,
      ease: 'Power1',
      onComplete: () => {
        trailTimer.destroy();
        glow.destroy();
        bolt.destroy();
        core.destroy();

        // Impact explosion
        this.burnEffect(toX, toY);

        // Extra impact flash ring
        const impact = this.scene.add.circle(toX, toY, 5 * m, 0xffaa00, 0.8);
        impact.setDepth(22);
        this.scene.tweens.add({
          targets: impact,
          scaleX: 4 * m, scaleY: 4 * m, alpha: 0,
          duration: 200,
          ease: 'Power2',
          onComplete: () => impact.destroy(),
        });

        // Mythic+: extra fire pillar ring
        if (m >= 2.0) {
          const pillar = this.scene.add.circle(toX, toY, 3, 0xff6600, 0.9);
          pillar.setDepth(23);
          this.scene.tweens.add({
            targets: pillar,
            scaleX: 6 * m, scaleY: 6 * m, alpha: 0,
            duration: 350,
            ease: 'Power2',
            onComplete: () => pillar.destroy(),
          });
        }

        // Legend: double impact + lingering ember particles
        if (m >= 2.5) {
          this.scene.time.delayedCall(80, () => {
            const secondImpact = this.scene.add.circle(toX, toY, 8, 0xff2200, 0.7);
            secondImpact.setDepth(22);
            this.scene.tweens.add({
              targets: secondImpact,
              scaleX: 5, scaleY: 5, alpha: 0,
              duration: 300,
              ease: 'Power2',
              onComplete: () => secondImpact.destroy(),
            });
          });
          for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.4;
            const ember = this.scene.add.circle(toX, toY, 2 + Math.random() * 2, 0xffaa00, 0.9);
            ember.setDepth(21);
            this.scene.tweens.add({
              targets: ember,
              x: toX + Math.cos(angle) * (20 + Math.random() * 15),
              y: toY + Math.sin(angle) * (20 + Math.random() * 15),
              alpha: 0, scaleX: 0.3, scaleY: 0.3,
              duration: 400 + Math.random() * 200,
              ease: 'Power1',
              onComplete: () => ember.destroy(),
            });
          }
        }
      },
    });
  }

  /** Ice: multi-layered frost shard with crystalline trail */
  private _iceOrbAttack(fromX: number, fromY: number, toX: number, toY: number, rarity: string): void {
    const m = this.getRarityMultiplier(rarity);

    // Outer frost glow
    const glow = this.scene.add.circle(fromX, fromY, 9 * m, 0x4488ff, 0.25);
    glow.setDepth(16);
    // Core shard (diamond shape via graphics)
    const gfx = this.scene.add.graphics();
    gfx.setDepth(17);
    gfx.fillStyle(0x88ddff, 0.9);
    gfx.fillPoints([
      new Phaser.Geom.Point(0, -7 * m),
      new Phaser.Geom.Point(4 * m, 0),
      new Phaser.Geom.Point(0, 7 * m),
      new Phaser.Geom.Point(-4 * m, 0),
    ], true);
    // Inner bright core
    gfx.fillStyle(0xcceeFF, 0.8);
    gfx.fillPoints([
      new Phaser.Geom.Point(0, -4 * m),
      new Phaser.Geom.Point(2 * m, 0),
      new Phaser.Geom.Point(0, 4 * m),
      new Phaser.Geom.Point(-2 * m, 0),
    ], true);
    gfx.setPosition(fromX, fromY);

    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.max(80, dist * 1.5);

    // Frost crystal trail
    const trailTimer = this.scene.time.addEvent({
      delay: Math.max(10, Math.round(20 / m)),
      repeat: -1,
      callback: () => {
        const colors = [0x88ddff, 0xaaeeff, 0x66bbee, 0xcceeFF];
        const trail = this.scene.add.circle(
          gfx.x + (Math.random() - 0.5) * 6 * m,
          gfx.y + (Math.random() - 0.5) * 6 * m,
          (1.5 + Math.random() * 2) * m,
          colors[Math.floor(Math.random() * colors.length)],
          0.7
        );
        trail.setDepth(16);
        this.scene.tweens.add({
          targets: trail,
          scaleX: 0, scaleY: 0, alpha: 0,
          duration: 180 + Math.random() * 120,
          onComplete: () => trail.destroy(),
        });

        // Occasional ice sparkle
        if (Math.random() < Math.min(0.5, 0.25 * m)) {
          const sparkle = this.scene.add.circle(gfx.x, gfx.y, 1 * m, 0xffffff, 0.9);
          sparkle.setDepth(17);
          this.scene.tweens.add({
            targets: sparkle,
            x: sparkle.x + (Math.random() - 0.5) * 14 * m,
            y: sparkle.y + (Math.random() - 0.5) * 14 * m,
            alpha: 0,
            duration: 150,
            onComplete: () => sparkle.destroy(),
          });
        }
      },
    });

    // Animate shard + glow
    [gfx, glow].forEach(obj => {
      this.scene.tweens.add({
        targets: obj,
        x: toX, y: toY,
        duration,
        ease: 'Linear',
      });
    });

    this.scene.tweens.add({
      targets: gfx,
      x: toX, y: toY,
      rotation: Math.PI,
      duration,
      ease: 'Linear',
      onComplete: () => {
        trailTimer.destroy();
        gfx.destroy();
        glow.destroy();

        // Enhanced freeze impact
        this.freezeEffect(toX, toY);

        // Additional frost shatter ring
        const frostRing = this.scene.add.circle(toX, toY, 5 * m, 0x88ddff, 0.7);
        frostRing.setDepth(22);
        this.scene.tweens.add({
          targets: frostRing,
          scaleX: 3.5 * m, scaleY: 3.5 * m, alpha: 0,
          duration: 250,
          ease: 'Power2',
          onComplete: () => frostRing.destroy(),
        });

        // Ice shard burst on impact
        const shardCount = Math.floor(8 * m);
        for (let i = 0; i < shardCount; i++) {
          const angle = (Math.PI * 2 * i) / shardCount + (Math.random() - 0.5) * 0.3;
          const shard = this.scene.add.rectangle(
            toX, toY, 2 * m, (5 + Math.random() * 4) * m, 0xaaeeff, 0.8
          );
          shard.setRotation(angle);
          shard.setDepth(21);
          this.scene.tweens.add({
            targets: shard,
            x: toX + Math.cos(angle) * (18 + Math.random() * 12) * m,
            y: toY + Math.sin(angle) * (18 + Math.random() * 12) * m,
            alpha: 0, scaleX: 0.3, scaleY: 0.3,
            duration: 300 + Math.random() * 150,
            onComplete: () => shard.destroy(),
          });
        }

        // Mythic+: freezing area circle
        if (m >= 2.0) {
          const freezeRing = this.scene.add.circle(toX, toY, 4, 0x4488ff, 0.6);
          freezeRing.setDepth(23);
          this.scene.tweens.add({
            targets: freezeRing,
            scaleX: 7 * m, scaleY: 7 * m, alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => freezeRing.destroy(),
          });
        }

        // Legend: crystal shatter burst + frost residue
        if (m >= 2.5) {
          for (let i = 0; i < 16; i++) {
            const angle = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.2;
            const crystal = this.scene.add.rectangle(
              toX, toY, 1.5, 4 + Math.random() * 3, 0xcceeFF, 0.9
            );
            crystal.setRotation(angle);
            crystal.setDepth(22);
            this.scene.tweens.add({
              targets: crystal,
              x: toX + Math.cos(angle) * (25 + Math.random() * 20),
              y: toY + Math.sin(angle) * (25 + Math.random() * 20),
              alpha: 0, scaleX: 0.2, scaleY: 0.2,
              duration: 350 + Math.random() * 200,
              onComplete: () => crystal.destroy(),
            });
          }
          // Frost residue
          for (let i = 0; i < 4; i++) {
            const frost = this.scene.add.circle(
              toX + (Math.random() - 0.5) * 20,
              toY + (Math.random() - 0.5) * 20,
              6 + Math.random() * 4, 0x88ddff, 0.25
            );
            frost.setDepth(19);
            this.scene.tweens.add({
              targets: frost,
              scaleX: 2, scaleY: 2, alpha: 0,
              duration: 500 + Math.random() * 300,
              onComplete: () => frost.destroy(),
            });
          }
        }
      },
    });
  }

  /** Lightning: electric ball with forking bolts + massive impact */
  private _lightningOrbAttack(fromX: number, fromY: number, toX: number, toY: number, rarity: string): void {
    const m = this.getRarityMultiplier(rarity);

    // Electric orb (glowing ball that travels)
    const glow = this.scene.add.circle(fromX, fromY, 10 * m, 0xffff44, 0.2);
    glow.setDepth(16);
    const core = this.scene.add.circle(fromX, fromY, 4 * m, 0xffff88, 0.9);
    core.setDepth(17);
    const innerCore = this.scene.add.circle(fromX, fromY, 2 * m, 0xffffff, 1);
    innerCore.setDepth(18);

    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.max(60, dist * 1.0); // Lightning is fast

    // Electric crackling around the ball
    const crackleTimer = this.scene.time.addEvent({
      delay: Math.max(12, Math.round(25 / m)),
      repeat: -1,
      callback: () => {
        // Mini lightning arcs around the orb
        const arcAngle = Math.random() * Math.PI * 2;
        const arcLen = (6 + Math.random() * 8) * m;
        const sx = core.x + Math.cos(arcAngle) * 4 * m;
        const sy = core.y + Math.sin(arcAngle) * 4 * m;
        const arcGfx = this.scene.add.graphics();
        arcGfx.setDepth(17);
        arcGfx.lineStyle(1 * m, 0xffffaa, 0.8);
        arcGfx.beginPath();
        arcGfx.moveTo(sx, sy);
        const midAng = arcAngle + (Math.random() - 0.5) * 1.5;
        arcGfx.lineTo(
          sx + Math.cos(midAng) * arcLen * 0.5,
          sy + Math.sin(midAng) * arcLen * 0.5
        );
        arcGfx.lineTo(
          sx + Math.cos(arcAngle) * arcLen,
          sy + Math.sin(arcAngle) * arcLen
        );
        arcGfx.strokePath();
        this.scene.tweens.add({
          targets: arcGfx, alpha: 0, duration: 80,
          onComplete: () => arcGfx.destroy(),
        });
      },
    });

    // Pulsing glow
    this.scene.tweens.add({
      targets: glow,
      scaleX: { from: 1, to: 1.4 },
      scaleY: { from: 1, to: 1.4 },
      alpha: { from: 0.2, to: 0.35 },
      duration: 60, yoyo: true, repeat: -1,
    });

    // Animate all layers
    [glow, core, innerCore].forEach(obj => {
      this.scene.tweens.add({
        targets: obj, x: toX, y: toY,
        duration, ease: 'Power2',
      });
    });

    this.scene.tweens.add({
      targets: glow,
      x: toX, y: toY,
      duration, ease: 'Power2',
      onComplete: () => {
        crackleTimer.destroy();
        glow.destroy();
        core.destroy();
        innerCore.destroy();

        // Main chain lightning to target
        this.chainLightning(fromX, fromY, toX, toY, 0xffff44);

        // Impact: bright electric flash
        const flash = this.scene.add.circle(toX, toY, 8 * m, 0xffffaa, 0.9);
        flash.setDepth(22);
        this.scene.tweens.add({
          targets: flash,
          scaleX: 3.5 * m, scaleY: 3.5 * m, alpha: 0,
          duration: 180,
          onComplete: () => flash.destroy(),
        });

        // Forking sparks outward
        const sparkCount = Math.floor(6 * m);
        for (let i = 0; i < sparkCount; i++) {
          const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.5;
          const sparkLen = (12 + Math.random() * 16) * m;
          const sparkGfx = this.scene.add.graphics();
          sparkGfx.setDepth(21);
          sparkGfx.lineStyle(1.5 * m, 0xffff44, 0.9);
          sparkGfx.beginPath();
          sparkGfx.moveTo(toX, toY);
          const midX2 = toX + Math.cos(angle) * sparkLen * 0.5 + (Math.random() - 0.5) * 8 * m;
          const midY2 = toY + Math.sin(angle) * sparkLen * 0.5 + (Math.random() - 0.5) * 8 * m;
          sparkGfx.lineTo(midX2, midY2);
          sparkGfx.lineTo(
            toX + Math.cos(angle) * sparkLen,
            toY + Math.sin(angle) * sparkLen
          );
          sparkGfx.strokePath();
          this.scene.tweens.add({
            targets: sparkGfx, alpha: 0, duration: 150,
            delay: 30,
            onComplete: () => sparkGfx.destroy(),
          });
        }

        // Electric residue particles
        const residueCount = Math.floor(5 * m);
        for (let i = 0; i < residueCount; i++) {
          const spark = this.scene.add.circle(
            toX + (Math.random() - 0.5) * 12 * m,
            toY + (Math.random() - 0.5) * 12 * m,
            1.5 * m, 0xffff88, 1
          );
          spark.setDepth(20);
          this.scene.tweens.add({
            targets: spark,
            x: spark.x + (Math.random() - 0.5) * 20 * m,
            y: spark.y + (Math.random() - 0.5) * 20 * m,
            alpha: 0,
            duration: 200 + Math.random() * 150,
            onComplete: () => spark.destroy(),
          });
        }

        // Mythic+: extra chain lightning bolts in random directions
        if (m >= 2.0) {
          for (let i = 0; i < 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const boltLen = 40 + Math.random() * 30;
            this.chainLightning(toX, toY,
              toX + Math.cos(angle) * boltLen,
              toY + Math.sin(angle) * boltLen,
              0xffff88
            );
          }
        }

        // Legend: radial lightning bolts + electric field residue
        if (m >= 2.5) {
          for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const boltLen = 30 + Math.random() * 25;
            this.scene.time.delayedCall(i * 20, () => {
              this.chainLightning(toX, toY,
                toX + Math.cos(angle) * boltLen,
                toY + Math.sin(angle) * boltLen,
                0xffff44
              );
            });
          }
          // Electric field
          const field = this.scene.add.circle(toX, toY, 6, 0xffff44, 0.3);
          field.setDepth(19);
          this.scene.tweens.add({
            targets: field,
            scaleX: 5, scaleY: 5, alpha: 0,
            duration: 600,
            ease: 'Power1',
            onComplete: () => field.destroy(),
          });
        }
      },
    });
  }

  /** Poison: toxic glob with dripping trail + splatter impact */
  private _poisonOrbAttack(fromX: number, fromY: number, toX: number, toY: number, rarity: string): void {
    const m = this.getRarityMultiplier(rarity);

    // Outer toxic glow
    const glow = this.scene.add.circle(fromX, fromY, 10 * m, 0x22aa22, 0.2);
    glow.setDepth(16);
    // Main blob
    const blob = this.scene.add.circle(fromX, fromY, 5 * m, 0x44ff44, 0.85);
    blob.setDepth(17);
    // Inner core (brighter)
    const core = this.scene.add.circle(fromX, fromY, 2.5 * m, 0x88ff88, 0.9);
    core.setDepth(18);

    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.max(100, dist * 1.8);

    // Dripping toxic trail
    const trailTimer = this.scene.time.addEvent({
      delay: Math.max(12, Math.round(25 / m)),
      repeat: -1,
      callback: () => {
        const colors = [0x44ff44, 0x22cc22, 0x88ff44, 0x66dd44];
        const drip = this.scene.add.circle(
          blob.x + (Math.random() - 0.5) * 6 * m,
          blob.y + (Math.random() - 0.5) * 6 * m,
          (2 + Math.random() * 2) * m,
          colors[Math.floor(Math.random() * colors.length)],
          0.6
        );
        drip.setDepth(16);
        // Drips fall downward slightly
        this.scene.tweens.add({
          targets: drip,
          y: drip.y + (4 + Math.random() * 8) * m,
          scaleX: 0.8, scaleY: 1.5,
          alpha: 0,
          duration: 200 + Math.random() * 150,
          onComplete: () => drip.destroy(),
        });

        // Occasional toxic mist
        if (Math.random() < Math.min(0.5, 0.2 * m)) {
          const mist = this.scene.add.circle(blob.x, blob.y, (4 + Math.random() * 3) * m, 0x44dd44, 0.3);
          mist.setDepth(15);
          this.scene.tweens.add({
            targets: mist,
            scaleX: 1.8 * m, scaleY: 1.8 * m, alpha: 0,
            duration: 250,
            onComplete: () => mist.destroy(),
          });
        }
      },
    });

    // Wobbly motion for all layers
    [glow, blob, core].forEach(obj => {
      this.scene.tweens.add({
        targets: obj,
        x: toX, y: toY,
        duration,
        ease: 'Sine.easeInOut',
      });
    });

    // Wobbly pulsing
    this.scene.tweens.add({
      targets: blob,
      scaleX: { value: 1.3, duration: duration / 4, yoyo: true, repeat: 2 },
      scaleY: { value: 0.7, duration: duration / 4, yoyo: true, repeat: 2 },
      duration,
    });

    this.scene.tweens.add({
      targets: blob,
      x: toX, y: toY,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        trailTimer.destroy();
        glow.destroy();
        blob.destroy();
        core.destroy();

        // Poison splatter on impact
        this.poisonEffect(toX, toY);

        // Toxic burst ring
        const toxicRing = this.scene.add.circle(toX, toY, 5 * m, 0x44ff44, 0.7);
        toxicRing.setDepth(22);
        this.scene.tweens.add({
          targets: toxicRing,
          scaleX: 3 * m, scaleY: 3 * m, alpha: 0,
          duration: 250,
          ease: 'Power2',
          onComplete: () => toxicRing.destroy(),
        });

        // Splatter droplets outward
        const splatCount = Math.floor(8 * m);
        for (let i = 0; i < splatCount; i++) {
          const angle = (Math.PI * 2 * i) / splatCount + (Math.random() - 0.5) * 0.4;
          const splatDist = (10 + Math.random() * 15) * m;
          const droplet = this.scene.add.circle(
            toX, toY, (1.5 + Math.random() * 2) * m, 0x44ff44, 0.8
          );
          droplet.setDepth(21);
          this.scene.tweens.add({
            targets: droplet,
            x: toX + Math.cos(angle) * splatDist,
            y: toY + Math.sin(angle) * splatDist,
            alpha: 0, scaleY: 0.4,
            duration: 300 + Math.random() * 200,
            ease: 'Power1',
            onComplete: () => droplet.destroy(),
          });
        }

        // Mythic+: lingering toxic cloud
        if (m >= 2.0) {
          const cloud = this.scene.add.circle(toX, toY, 8, 0x22aa22, 0.4);
          cloud.setDepth(19);
          this.scene.tweens.add({
            targets: cloud,
            scaleX: 4 * m, scaleY: 4 * m, alpha: 0,
            duration: 600,
            ease: 'Power1',
            onComplete: () => cloud.destroy(),
          });
        }

        // Legend: toxic explosion + ground contamination circles
        if (m >= 2.5) {
          // Secondary toxic burst
          this.scene.time.delayedCall(100, () => {
            const toxicBurst = this.scene.add.circle(toX, toY, 6, 0x88ff44, 0.8);
            toxicBurst.setDepth(22);
            this.scene.tweens.add({
              targets: toxicBurst,
              scaleX: 5, scaleY: 5, alpha: 0,
              duration: 350,
              ease: 'Power2',
              onComplete: () => toxicBurst.destroy(),
            });
          });
          // Ground contamination
          for (let i = 0; i < 2; i++) {
            const contam = this.scene.add.circle(
              toX + (Math.random() - 0.5) * 30,
              toY + (Math.random() - 0.5) * 30,
              8 + Math.random() * 6, 0x44ff44, 0.2
            );
            contam.setDepth(14);
            this.scene.tweens.add({
              targets: contam,
              scaleX: 1.5, scaleY: 1.5, alpha: 0,
              duration: 800 + Math.random() * 400,
              onComplete: () => contam.destroy(),
            });
          }
        }
      },
    });
  }

  /** Dark: shadow orb with void trail + soul-rending impact */
  private _darkOrbAttack(fromX: number, fromY: number, toX: number, toY: number, rarity: string): void {
    const m = this.getRarityMultiplier(rarity);

    // Outer shadow aura (large, dark)
    const aura = this.scene.add.circle(fromX, fromY, 12 * m, 0x220044, 0.25);
    aura.setDepth(15);
    // Main wisp
    const wisp = this.scene.add.circle(fromX, fromY, 5 * m, 0x8844ff, 0.8);
    wisp.setDepth(17);
    // Outer glow
    const outerGlow = this.scene.add.circle(fromX, fromY, 8 * m, 0x6622cc, 0.35);
    outerGlow.setDepth(16);
    // Inner void core
    const voidCore = this.scene.add.circle(fromX, fromY, 2 * m, 0x110022, 1);
    voidCore.setDepth(18);

    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.max(100, dist * 1.8);

    // Wisp curves (S-curve path) — more dramatic at higher rarity
    const midX = (fromX + toX) / 2 + (Math.random() - 0.5) * 50 * m;
    const midY = (fromY + toY) / 2 + (Math.random() - 0.5) * 50 * m;

    // Shadow trail particles
    const trailTimer = this.scene.time.addEvent({
      delay: Math.max(10, Math.round(20 / m)),
      repeat: -1,
      callback: () => {
        const colors = [0x8844ff, 0x6622cc, 0xaa66ee, 0x442288, 0x220044];
        const trail = this.scene.add.circle(
          wisp.x + (Math.random() - 0.5) * 8 * m,
          wisp.y + (Math.random() - 0.5) * 8 * m,
          (2 + Math.random() * 3) * m,
          colors[Math.floor(Math.random() * colors.length)],
          0.5
        );
        trail.setDepth(16);
        this.scene.tweens.add({
          targets: trail,
          scaleX: 0, scaleY: 0, alpha: 0,
          duration: 200 + Math.random() * 150,
          onComplete: () => trail.destroy(),
        });

        // Occasional void wisp
        if (Math.random() < Math.min(0.5, 0.25 * m)) {
          const voidWispP = this.scene.add.circle(
            wisp.x, wisp.y, 3 * m, 0x110022, 0.4
          );
          voidWispP.setDepth(15);
          this.scene.tweens.add({
            targets: voidWispP,
            scaleX: 2 * m, scaleY: 2 * m, alpha: 0,
            duration: 180,
            onComplete: () => voidWispP.destroy(),
          });
        }
      },
    });

    // Pulsing aura
    this.scene.tweens.add({
      targets: aura,
      scaleX: { from: 1, to: 1.3 },
      scaleY: { from: 1, to: 1.3 },
      alpha: { from: 0.25, to: 0.15 },
      duration: 100, yoyo: true, repeat: -1,
    });

    const allObjs = [aura, wisp, outerGlow, voidCore];

    // Phase 1: Curve to midpoint
    allObjs.forEach(obj => {
      this.scene.tweens.add({
        targets: obj,
        x: midX, y: midY,
        duration: duration / 2,
        ease: 'Sine.easeOut',
      });
    });

    this.scene.time.delayedCall(duration / 2, () => {
      // Phase 2: Curve to target
      allObjs.forEach(obj => {
        this.scene.tweens.add({
          targets: obj,
          x: toX, y: toY,
          duration: duration / 2,
          ease: 'Sine.easeIn',
        });
      });
    });

    this.scene.time.delayedCall(duration, () => {
      trailTimer.destroy();
      allObjs.forEach(o => o.destroy());

      // Void implosion (particles drawn inward then explode)
      const voidFlash = this.scene.add.circle(toX, toY, 15 * m, 0x110022, 0.7);
      voidFlash.setDepth(21);
      this.scene.tweens.add({
        targets: voidFlash,
        scaleX: 0.3, scaleY: 0.3, alpha: 0,
        duration: 150,
        onComplete: () => {
          voidFlash.destroy();
          // Then purple explosion outward
          const burst = this.scene.add.circle(toX, toY, 6 * m, 0x8844ff, 0.8);
          burst.setDepth(22);
          this.scene.tweens.add({
            targets: burst,
            scaleX: 4 * m, scaleY: 4 * m, alpha: 0,
            duration: 250,
            ease: 'Power2',
            onComplete: () => burst.destroy(),
          });
        },
      });

      // Shadow tendrils outward
      const tendrilCount = Math.floor(8 * m);
      for (let i = 0; i < tendrilCount; i++) {
        const angle = (Math.PI * 2 * i) / tendrilCount + (Math.random() - 0.5) * 0.4;
        const tendrilLen = (15 + Math.random() * 12) * m;
        const tendril = this.scene.add.circle(
          toX, toY, 2 * m, 0xaa66ee, 0.8
        );
        tendril.setDepth(20);
        this.scene.tweens.add({
          targets: tendril,
          x: toX + Math.cos(angle) * tendrilLen,
          y: toY + Math.sin(angle) * tendrilLen,
          scaleX: 0.3, scaleY: 0.3, alpha: 0,
          duration: 250 + Math.random() * 150,
          ease: 'Power1',
          onComplete: () => tendril.destroy(),
        });
      }

      // Dark mist residue
      const mistCount = Math.floor(4 * m);
      for (let i = 0; i < mistCount; i++) {
        const mist = this.scene.add.circle(
          toX + (Math.random() - 0.5) * 16 * m,
          toY + (Math.random() - 0.5) * 16 * m,
          (5 + Math.random() * 4) * m, 0x220044, 0.3
        );
        mist.setDepth(19);
        this.scene.tweens.add({
          targets: mist,
          scaleX: 2 * m, scaleY: 2 * m, alpha: 0,
          duration: 400 + Math.random() * 200,
          onComplete: () => mist.destroy(),
        });
      }

      // Mythic+: additional void implosion phase
      if (m >= 2.0) {
        this.scene.time.delayedCall(150, () => {
          const voidPulse = this.scene.add.circle(toX, toY, 20, 0x6622cc, 0.5);
          voidPulse.setDepth(23);
          this.scene.tweens.add({
            targets: voidPulse,
            scaleX: 0.1, scaleY: 0.1, alpha: 0.8,
            duration: 120,
            yoyo: true,
            onComplete: () => voidPulse.destroy(),
          });
        });
      }

      // Legend: soul-split effect (multiple purple orbs radiating outward)
      if (m >= 2.5) {
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 * i) / 6;
          this.scene.time.delayedCall(i * 30, () => {
            const soul = this.scene.add.circle(toX, toY, 4, 0xaa66ee, 0.9);
            soul.setDepth(23);
            const soulGlow = this.scene.add.circle(toX, toY, 8, 0x6622cc, 0.3);
            soulGlow.setDepth(22);
            const soulDist = 35 + Math.random() * 20;
            [soul, soulGlow].forEach(s => {
              this.scene.tweens.add({
                targets: s,
                x: toX + Math.cos(angle) * soulDist,
                y: toY + Math.sin(angle) * soulDist,
                alpha: 0, scaleX: 0.2, scaleY: 0.2,
                duration: 400 + Math.random() * 200,
                ease: 'Power2',
                onComplete: () => s.destroy(),
              });
            });
          });
        }
      }
    });
  }

  /** Nature: swirling leaf cluster with vine trail + bloom impact */
  private _natureOrbAttack(fromX: number, fromY: number, toX: number, toY: number, rarity: string): void {
    const m = this.getRarityMultiplier(rarity);

    // Nature glow
    const glow = this.scene.add.circle(fromX, fromY, 9 * m, 0x228822, 0.2);
    glow.setDepth(16);
    // Main leaf cluster (graphics)
    const gfx = this.scene.add.graphics();
    gfx.setDepth(17);
    gfx.fillStyle(0x44cc44, 0.9);
    gfx.beginPath();
    gfx.moveTo(0, -7 * m);
    gfx.lineTo(5 * m, 0);
    gfx.lineTo(0, 7 * m);
    gfx.lineTo(-5 * m, 0);
    gfx.closePath();
    gfx.fillPath();
    gfx.fillStyle(0x66ee66, 0.7);
    gfx.beginPath();
    gfx.moveTo(0, -4 * m);
    gfx.lineTo(2.5 * m, 0);
    gfx.lineTo(0, 4 * m);
    gfx.lineTo(-2.5 * m, 0);
    gfx.closePath();
    gfx.fillPath();
    gfx.lineStyle(1.5 * m, 0x228822, 0.8);
    gfx.lineBetween(0, -5 * m, 0, 5 * m);
    gfx.setPosition(fromX, fromY);

    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.max(80, dist * 1.4);

    const trailTimer = this.scene.time.addEvent({
      delay: Math.max(12, Math.round(25 / m)),
      repeat: -1,
      callback: () => {
        const colors = [0x44cc44, 0x66ee66, 0x22aa22, 0x88ff88];
        const trailLeaf = this.scene.add.circle(
          gfx.x + (Math.random() - 0.5) * 6 * m,
          gfx.y + (Math.random() - 0.5) * 6 * m,
          (1.5 + Math.random() * 2) * m,
          colors[Math.floor(Math.random() * colors.length)],
          0.6
        );
        trailLeaf.setDepth(16);
        this.scene.tweens.add({
          targets: trailLeaf,
          y: trailLeaf.y + (3 + Math.random() * 6) * m,
          x: trailLeaf.x + (Math.random() - 0.5) * 10 * m,
          scaleX: 0, scaleY: 0, alpha: 0,
          rotation: Math.random() * Math.PI,
          duration: 200 + Math.random() * 150,
          onComplete: () => trailLeaf.destroy(),
        });

        if (Math.random() < Math.min(0.5, 0.2 * m)) {
          const pollen = this.scene.add.circle(
            gfx.x + (Math.random() - 0.5) * 8 * m,
            gfx.y + (Math.random() - 0.5) * 8 * m,
            1 * m, 0xffee44, 0.9
          );
          pollen.setDepth(17);
          this.scene.tweens.add({
            targets: pollen,
            y: pollen.y - (6 + Math.random() * 8) * m,
            alpha: 0, duration: 300,
            onComplete: () => pollen.destroy(),
          });
        }
      },
    });

    [gfx, glow].forEach(obj => {
      this.scene.tweens.add({
        targets: obj, x: toX, y: toY, duration, ease: 'Linear',
      });
    });

    this.scene.tweens.add({
      targets: gfx,
      rotation: Math.PI * 3,
      duration,
      ease: 'Linear',
      onComplete: () => {
        trailTimer.destroy();
        gfx.destroy();
        glow.destroy();

        const bloomFlash = this.scene.add.circle(toX, toY, 6 * m, 0x88ff88, 0.8);
        bloomFlash.setDepth(22);
        this.scene.tweens.add({
          targets: bloomFlash,
          scaleX: 3 * m, scaleY: 3 * m, alpha: 0,
          duration: 250, ease: 'Power2',
          onComplete: () => bloomFlash.destroy(),
        });

        const leafCount = Math.floor(10 * m);
        for (let i = 0; i < leafCount; i++) {
          const angle = (Math.PI * 2 * i) / leafCount + (Math.random() - 0.5) * 0.3;
          const leafDist = (12 + Math.random() * 14) * m;
          const colors = [0x44cc44, 0x66ee66, 0x22aa22, 0x88ff44];
          const leaf = this.scene.add.circle(
            toX, toY, (1.5 + Math.random() * 2) * m,
            colors[Math.floor(Math.random() * colors.length)], 0.8
          );
          leaf.setDepth(21);
          this.scene.tweens.add({
            targets: leaf,
            x: toX + Math.cos(angle) * leafDist,
            y: toY + Math.sin(angle) * leafDist,
            alpha: 0, scaleX: 0.3, scaleY: 0.3,
            duration: 300 + Math.random() * 200, ease: 'Power1',
            onComplete: () => leaf.destroy(),
          });
        }

        const pollenCount = Math.floor(4 * m);
        for (let i = 0; i < pollenCount; i++) {
          const pol = this.scene.add.circle(
            toX + (Math.random() - 0.5) * 10 * m,
            toY + (Math.random() - 0.5) * 10 * m,
            1 * m, 0xffee44, 1
          );
          pol.setDepth(22);
          this.scene.tweens.add({
            targets: pol,
            y: pol.y - (12 + Math.random() * 10) * m,
            x: pol.x + (Math.random() - 0.5) * 16 * m,
            alpha: 0, duration: 500 + Math.random() * 300, ease: 'Cubic.easeOut',
            onComplete: () => pol.destroy(),
          });
        }

        // Mythic+: petal vortex swirl
        if (m >= 2.0) {
          for (let i = 0; i < 8; i++) {
            const sAngle = (Math.PI * 2 * i) / 8;
            const petal = this.scene.add.circle(toX, toY, 2, 0xff88cc, 0.8);
            petal.setDepth(23);
            const sDist = 25 + Math.random() * 15;
            this.scene.tweens.add({
              targets: petal,
              x: toX + Math.cos(sAngle + Math.PI) * sDist,
              y: toY + Math.sin(sAngle + Math.PI) * sDist,
              alpha: 0, scaleX: 0.2, scaleY: 0.2,
              duration: 400 + Math.random() * 200, ease: 'Cubic.easeOut',
              onComplete: () => petal.destroy(),
            });
          }
        }

        // Legend: tree silhouette flash + forest energy ring
        if (m >= 2.5) {
          const treeGfx = this.scene.add.graphics();
          treeGfx.setDepth(24);
          treeGfx.lineStyle(3, 0x88ff88, 0.6);
          treeGfx.lineBetween(toX, toY, toX, toY - 40);
          treeGfx.lineStyle(2, 0x66ee66, 0.5);
          treeGfx.lineBetween(toX, toY - 25, toX - 15, toY - 35);
          treeGfx.lineBetween(toX, toY - 25, toX + 15, toY - 35);
          treeGfx.lineBetween(toX, toY - 15, toX - 10, toY - 28);
          treeGfx.lineBetween(toX, toY - 15, toX + 10, toY - 28);
          this.scene.tweens.add({
            targets: treeGfx, alpha: 0, duration: 500, ease: 'Power2',
            onComplete: () => treeGfx.destroy(),
          });
          const forestRing = this.scene.add.circle(toX, toY, 5, 0x44cc44, 0.7);
          forestRing.setDepth(23);
          this.scene.tweens.add({
            targets: forestRing,
            scaleX: 8, scaleY: 8, alpha: 0, duration: 500, ease: 'Power2',
            onComplete: () => forestRing.destroy(),
          });
        }
      },
    });
  }

  /** Default: colored bolt */
  private _defaultOrbAttack(fromX: number, fromY: number, toX: number, toY: number, color: number, rarity: string): void {
    const m = this.getRarityMultiplier(rarity);
    const bolt = this.scene.add.circle(fromX, fromY, 3 * m, color, 0.9);
    bolt.setDepth(17);

    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.max(60, dist * 1.2);

    // Add glow for rare+
    let glowObj: Phaser.GameObjects.Arc | null = null;
    if (m > 1) {
      glowObj = this.scene.add.circle(fromX, fromY, 6 * m, color, 0.2);
      glowObj.setDepth(16);
      this.scene.tweens.add({
        targets: glowObj, x: toX, y: toY, duration, ease: 'Linear',
      });
    }

    this.scene.tweens.add({
      targets: bolt,
      x: toX, y: toY, duration, ease: 'Linear',
      onComplete: () => {
        bolt.destroy();
        glowObj?.destroy();
        const impact = this.scene.add.circle(toX, toY, 4 * m, color, 0.6);
        impact.setDepth(18);
        this.scene.tweens.add({
          targets: impact,
          scaleX: 2 * m, scaleY: 2 * m, alpha: 0, duration: 200,
          onComplete: () => impact.destroy(),
        });
      },
    });
  }

  // ===== Missile Effects =====

  /** Missile barrage: staggered muzzle flashes at launch point */
  missileBarrage(fromX: number, fromY: number, targets: { x: number; y: number }[]): void {
    targets.forEach((_tgt, i) => {
      this.scene.time.delayedCall(i * 50, () => {
        this.muzzleFlash(fromX, fromY, 0xff4444);
      });
    });
  }

  /** Missile explosion: bright flash + fire ring + debris particles */
  missileExplosion(x: number, y: number): void {
    // Bright white flash
    const flash = this.scene.add.circle(x, y, 8, 0xffffff, 0.9);
    flash.setDepth(20);
    this.scene.tweens.add({
      targets: flash,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 180,
      onComplete: () => flash.destroy(),
    });

    // Fire ring expanding
    const ring = this.scene.add.circle(x, y, 6, 0xff6600, 0);
    ring.setStrokeStyle(3, 0xff4444, 0.8);
    ring.setDepth(19);
    this.scene.tweens.add({
      targets: ring,
      scaleX: 4,
      scaleY: 4,
      alpha: 0,
      duration: 320,
      onComplete: () => ring.destroy(),
    });

    // Inner fireball
    const fireball = this.scene.add.circle(x, y, 5, 0xff8800, 0.7);
    fireball.setDepth(19);
    this.scene.tweens.add({
      targets: fireball,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: 220,
      onComplete: () => fireball.destroy(),
    });

    // Debris/spark particles
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const dist = 14 + Math.random() * 16;
      const colors = [0xffaa00, 0xff6600, 0xff4444, 0xffcc00];
      const c = colors[Math.floor(Math.random() * colors.length)];
      const spark = this.scene.add.circle(x, y, 1.5 + Math.random(), c, 0.9);
      spark.setDepth(20);
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 200 + Math.random() * 150,
        onComplete: () => spark.destroy(),
      });
    }

    // Smoke puffs (delayed slightly)
    this.scene.time.delayedCall(50, () => {
      for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const smoke = this.scene.add.circle(
          x + Math.cos(angle) * 4,
          y + Math.sin(angle) * 4,
          3 + Math.random() * 2, 0x666666, 0.35
        );
        smoke.setDepth(18);
        this.scene.tweens.add({
          targets: smoke,
          scaleX: 2.5,
          scaleY: 2.5,
          alpha: 0,
          x: x + Math.cos(angle) * 12,
          y: y + Math.sin(angle) * 12,
          duration: 400,
          onComplete: () => smoke.destroy(),
        });
      }
    });
  }

  // ===== Thunder Effects =====

  /** Thunder strike: massive bolt + forking branches + electric storm field */
  thunderStrike(x: number, y: number, radius: number, duration: number): void {
    const durationMs = duration * 1000;

    // === 1) Main lightning bolt from above ===
    const boltGfx = this.scene.add.graphics();
    boltGfx.setDepth(20);

    const segments = 8;
    const startY = y - 180;
    const segH = 180 / segments;
    const points: { x: number; y: number }[] = [{ x, y: startY }];
    for (let i = 1; i < segments; i++) {
      points.push({
        x: x + (Math.random() - 0.5) * 35,
        y: startY + segH * i,
      });
    }
    points.push({ x, y });

    // Wide outer glow
    boltGfx.lineStyle(6, 0xffff44, 0.3);
    boltGfx.beginPath();
    boltGfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      boltGfx.lineTo(points[i].x, points[i].y);
    }
    boltGfx.strokePath();

    // Main bolt
    boltGfx.lineStyle(3, 0xffff44, 0.8);
    boltGfx.beginPath();
    boltGfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      boltGfx.lineTo(points[i].x, points[i].y);
    }
    boltGfx.strokePath();

    // Inner bright core
    boltGfx.lineStyle(1.5, 0xffffff, 1);
    boltGfx.beginPath();
    boltGfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      boltGfx.lineTo(points[i].x, points[i].y);
    }
    boltGfx.strokePath();

    // Branch bolts (forking from main bolt)
    for (let b = 0; b < 3; b++) {
      const branchIdx = 2 + Math.floor(Math.random() * (segments - 3));
      const branchPt = points[branchIdx];
      const branchAngle = (Math.random() - 0.5) * Math.PI * 0.6;
      const branchLen = 30 + Math.random() * 40;
      const bEndX = branchPt.x + Math.cos(branchAngle + Math.PI / 2) * branchLen;
      const bEndY = branchPt.y + Math.sin(branchAngle + Math.PI / 2) * branchLen * 0.5 + branchLen * 0.3;
      const bMidX = (branchPt.x + bEndX) / 2 + (Math.random() - 0.5) * 15;
      const bMidY = (branchPt.y + bEndY) / 2;

      boltGfx.lineStyle(2, 0xffff88, 0.6);
      boltGfx.beginPath();
      boltGfx.moveTo(branchPt.x, branchPt.y);
      boltGfx.lineTo(bMidX, bMidY);
      boltGfx.lineTo(bEndX, bEndY);
      boltGfx.strokePath();
    }

    // Bolt flash and fade
    this.scene.tweens.add({
      targets: boltGfx,
      alpha: 0,
      duration: 300,
      delay: 100,
      onComplete: () => boltGfx.destroy(),
    });

    // === 2) Multi-layer impact flash ===
    const flash1 = this.scene.add.circle(x, y, 8, 0xffffff, 1);
    flash1.setDepth(23);
    this.scene.tweens.add({
      targets: flash1,
      scaleX: 4, scaleY: 4, alpha: 0,
      duration: 150,
      onComplete: () => flash1.destroy(),
    });
    const flash2 = this.scene.add.circle(x, y, 15, 0xffff88, 0.8);
    flash2.setDepth(22);
    this.scene.tweens.add({
      targets: flash2,
      scaleX: 3, scaleY: 3, alpha: 0,
      duration: 250,
      onComplete: () => flash2.destroy(),
    });

    // Spark explosion on impact
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.4;
      const sparkDist = 15 + Math.random() * 20;
      const spark = this.scene.add.circle(x, y, 1.5, 0xffff44, 1);
      spark.setDepth(22);
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * sparkDist,
        y: y + Math.sin(angle) * sparkDist,
        alpha: 0,
        duration: 200 + Math.random() * 100,
        onComplete: () => spark.destroy(),
      });
    }

    // === 3) Lingering electric field ===
    const field = this.scene.add.circle(x, y, radius, 0xffff44, 0.15);
    field.setDepth(14);
    field.setStrokeStyle(2, 0xffff44, 0.45);

    const innerField = this.scene.add.circle(x, y, radius * 0.4, 0xffffaa, 0.08);
    innerField.setDepth(14);

    // Pulsing glow
    this.scene.tweens.add({
      targets: field,
      alpha: { from: 0.15, to: 0.28 },
      duration: 150, yoyo: true,
      repeat: Math.floor(durationMs / 300),
    });
    this.scene.tweens.add({
      targets: innerField,
      alpha: { from: 0.08, to: 0.18 },
      scaleX: { from: 1, to: 1.15 },
      scaleY: { from: 1, to: 1.15 },
      duration: 200, yoyo: true,
      repeat: Math.floor(durationMs / 400),
    });

    // Fade out
    [field, innerField].forEach(f => {
      this.scene.tweens.add({
        targets: f, alpha: 0, duration: 250,
        delay: durationMs - 250,
        onComplete: () => f.destroy(),
      });
    });

    // === 4) Periodic mini lightning arcs + sparks ===
    const sparkTimer = this.scene.time.addEvent({
      delay: 70,
      repeat: Math.floor(durationMs / 70) - 1,
      callback: () => {
        const sx = x + (Math.random() - 0.5) * radius * 1.6;
        const sy = y + (Math.random() - 0.5) * radius * 1.6;

        // Small spark line (zigzag)
        const sparkGfx = this.scene.add.graphics();
        sparkGfx.setDepth(19);
        const colors = [0xffffaa, 0xffff44, 0xffffff];
        sparkGfx.lineStyle(1.5, colors[Math.floor(Math.random() * colors.length)], 0.8);
        const len = 4 + Math.random() * 8;
        const angle = Math.random() * Math.PI * 2;
        const midAngle = angle + (Math.random() - 0.5) * 1.5;
        sparkGfx.beginPath();
        sparkGfx.moveTo(sx, sy);
        sparkGfx.lineTo(
          sx + Math.cos(midAngle) * len * 0.5,
          sy + Math.sin(midAngle) * len * 0.5
        );
        sparkGfx.lineTo(
          sx + Math.cos(angle) * len,
          sy + Math.sin(angle) * len,
        );
        sparkGfx.strokePath();

        this.scene.tweens.add({
          targets: sparkGfx,
          alpha: 0,
          duration: 80,
          onComplete: () => sparkGfx.destroy(),
        });
      },
    });

    // === 5) Periodic re-strikes (small bolts hitting the zone) ===
    const restrikeTimer = this.scene.time.addEvent({
      delay: 500,
      repeat: Math.floor(durationMs / 500) - 1,
      callback: () => {
        const rx = x + (Math.random() - 0.5) * radius;
        const ry = y + (Math.random() - 0.5) * radius;
        // Mini bolt from above
        const miniBolt = this.scene.add.graphics();
        miniBolt.setDepth(20);
        miniBolt.lineStyle(2, 0xffff44, 0.7);
        const mStartY = ry - 40;
        miniBolt.beginPath();
        miniBolt.moveTo(rx + (Math.random() - 0.5) * 10, mStartY);
        miniBolt.lineTo(rx + (Math.random() - 0.5) * 12, mStartY + 15);
        miniBolt.lineTo(rx + (Math.random() - 0.5) * 8, mStartY + 30);
        miniBolt.lineTo(rx, ry);
        miniBolt.strokePath();
        // Inner glow
        miniBolt.lineStyle(1, 0xffffff, 0.5);
        miniBolt.beginPath();
        miniBolt.moveTo(rx, mStartY);
        miniBolt.lineTo(rx, ry);
        miniBolt.strokePath();

        this.scene.tweens.add({
          targets: miniBolt, alpha: 0, duration: 120,
          onComplete: () => miniBolt.destroy(),
        });

        // Mini impact flash
        const miniFlash = this.scene.add.circle(rx, ry, 4, 0xffff88, 0.7);
        miniFlash.setDepth(21);
        this.scene.tweens.add({
          targets: miniFlash, scaleX: 2, scaleY: 2, alpha: 0,
          duration: 150,
          onComplete: () => miniFlash.destroy(),
        });
      },
    });

    // Clean up timers
    this.scene.time.delayedCall(durationMs, () => {
      sparkTimer.destroy();
      restrikeTimer.destroy();
    });
  }

  // ===== Element Area Effects =====

  /** Fire area: erupting flames + lingering burn zone */
  fireArea(x: number, y: number, radius: number, duration: number): void {
    const durationMs = duration * 1000;

    // 1) Initial eruption: multi-layer flash + shockwave
    const flash1 = this.scene.add.circle(x, y, 10, 0xffee44, 1);
    flash1.setDepth(22);
    this.scene.tweens.add({
      targets: flash1,
      scaleX: 4, scaleY: 4, alpha: 0,
      duration: 200, ease: 'Power2',
      onComplete: () => flash1.destroy(),
    });
    const flash2 = this.scene.add.circle(x, y, 14, 0xff4400, 0.8);
    flash2.setDepth(21);
    this.scene.tweens.add({
      targets: flash2,
      scaleX: 3.5, scaleY: 3.5, alpha: 0,
      duration: 300, ease: 'Power1',
      onComplete: () => flash2.destroy(),
    });

    // Eruption sparks outward
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.4;
      const dist = radius * 0.5 + Math.random() * radius * 0.6;
      const colors = [0xff2200, 0xff6600, 0xffaa00, 0xffee44];
      const spark = this.scene.add.circle(x, y, 2 + Math.random() * 2,
        colors[Math.floor(Math.random() * colors.length)], 1);
      spark.setDepth(22);
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0, scaleX: 0.3, scaleY: 0.3,
        duration: 300 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => spark.destroy(),
      });
    }

    // 2) Lingering burn zone with pulsing glow
    const field = this.scene.add.circle(x, y, radius, 0xff4400, 0.15);
    field.setDepth(14);
    field.setStrokeStyle(2, 0xff6600, 0.4);

    // Inner hot zone
    const innerField = this.scene.add.circle(x, y, radius * 0.5, 0xffaa00, 0.1);
    innerField.setDepth(14);

    // Pulsing glow
    this.scene.tweens.add({
      targets: field,
      alpha: { from: 0.15, to: 0.28 },
      duration: 250, yoyo: true,
      repeat: Math.floor(durationMs / 500),
    });
    this.scene.tweens.add({
      targets: innerField,
      alpha: { from: 0.1, to: 0.2 },
      scaleX: { from: 1, to: 1.1 },
      scaleY: { from: 1, to: 1.1 },
      duration: 300, yoyo: true,
      repeat: Math.floor(durationMs / 600),
    });

    // Fade out
    [field, innerField].forEach(f => {
      this.scene.tweens.add({
        targets: f, alpha: 0, duration: 300,
        delay: durationMs - 300,
        onComplete: () => f.destroy(),
      });
    });

    // 3) Rising flames (larger, denser)
    const flameTimer = this.scene.time.addEvent({
      delay: 60,
      repeat: Math.floor(durationMs / 60) - 1,
      callback: () => {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius * 0.9;
        const fx = x + Math.cos(angle) * dist;
        const fy = y + Math.sin(angle) * dist;
        const colors = [0xff2200, 0xff4400, 0xff6600, 0xffaa00, 0xffcc00];
        const size = 2 + Math.random() * 4;
        const p = this.scene.add.circle(fx, fy, size,
          colors[Math.floor(Math.random() * colors.length)], 0.8);
        p.setDepth(19);
        this.scene.tweens.add({
          targets: p,
          y: fy - 12 - Math.random() * 16,
          x: fx + (Math.random() - 0.5) * 8,
          scaleX: 0.1, scaleY: 0.1, alpha: 0,
          duration: 250 + Math.random() * 200,
          ease: 'Power1',
          onComplete: () => p.destroy(),
        });
      },
    });
    this.scene.time.delayedCall(durationMs, () => flameTimer.destroy());

    // 4) Occasional ember bursts
    const emberTimer = this.scene.time.addEvent({
      delay: 300,
      repeat: Math.floor(durationMs / 300) - 1,
      callback: () => {
        for (let i = 0; i < 4; i++) {
          const ex = x + (Math.random() - 0.5) * radius;
          const ey = y + (Math.random() - 0.5) * radius;
          const ember = this.scene.add.circle(ex, ey, 1, 0xffee44, 1);
          ember.setDepth(21);
          this.scene.tweens.add({
            targets: ember,
            y: ey - 20 - Math.random() * 15,
            x: ex + (Math.random() - 0.5) * 12,
            alpha: 0,
            duration: 500 + Math.random() * 300,
            ease: 'Cubic.easeOut',
            onComplete: () => ember.destroy(),
          });
        }
      },
    });
    this.scene.time.delayedCall(durationMs, () => emberTimer.destroy());
  }

  /** Ice area: blizzard burst + crystalline field + falling snowflakes */
  iceArea(x: number, y: number, radius: number, duration: number): void {
    const durationMs = duration * 1000;

    // 1) Multi-layer frost burst
    const flash1 = this.scene.add.circle(x, y, 10, 0xcceeFF, 1);
    flash1.setDepth(22);
    this.scene.tweens.add({
      targets: flash1,
      scaleX: 3.5, scaleY: 3.5, alpha: 0,
      duration: 200, ease: 'Power2',
      onComplete: () => flash1.destroy(),
    });
    const flash2 = this.scene.add.circle(x, y, 14, 0x88ccff, 0.8);
    flash2.setDepth(21);
    this.scene.tweens.add({
      targets: flash2,
      scaleX: 3, scaleY: 3, alpha: 0,
      duration: 300, ease: 'Power1',
      onComplete: () => flash2.destroy(),
    });

    // Ice shard burst outward
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.3;
      const shardDist = radius * 0.4 + Math.random() * radius * 0.5;
      const shard = this.scene.add.rectangle(
        x, y, 2, 6 + Math.random() * 4, 0xaaeeff, 0.8
      );
      shard.setRotation(angle);
      shard.setDepth(22);
      this.scene.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * shardDist,
        y: y + Math.sin(angle) * shardDist,
        alpha: 0, scaleX: 0.3, scaleY: 0.3,
        duration: 300 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => shard.destroy(),
      });
    }

    // 2) Lingering ice field with inner frost
    const field = this.scene.add.circle(x, y, radius, 0x4488ff, 0.15);
    field.setDepth(14);
    field.setStrokeStyle(2, 0x88ccff, 0.5);

    const innerField = this.scene.add.circle(x, y, radius * 0.5, 0xaaddff, 0.08);
    innerField.setDepth(14);

    // Pulsing glow
    this.scene.tweens.add({
      targets: field,
      alpha: { from: 0.15, to: 0.28 },
      duration: 250, yoyo: true,
      repeat: Math.floor(durationMs / 500),
    });
    this.scene.tweens.add({
      targets: innerField,
      alpha: { from: 0.08, to: 0.18 },
      scaleX: { from: 1, to: 1.1 },
      scaleY: { from: 1, to: 1.1 },
      duration: 300, yoyo: true,
      repeat: Math.floor(durationMs / 600),
    });

    // Fade out
    [field, innerField].forEach(f => {
      this.scene.tweens.add({
        targets: f, alpha: 0, duration: 300,
        delay: durationMs - 300,
        onComplete: () => f.destroy(),
      });
    });

    // 3) Crystal sparkles + snowflakes
    const sparkTimer = this.scene.time.addEvent({
      delay: 70,
      repeat: Math.floor(durationMs / 70) - 1,
      callback: () => {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius * 0.9;
        const sx = x + Math.cos(angle) * dist;
        const sy = y + Math.sin(angle) * dist;
        const colors = [0xccddff, 0xaaeeff, 0x88ccff, 0xffffff];
        const shard = this.scene.add.circle(sx, sy, 1 + Math.random() * 2.5,
          colors[Math.floor(Math.random() * colors.length)], 0.8);
        shard.setDepth(19);
        this.scene.tweens.add({
          targets: shard,
          y: sy - 6 - Math.random() * 8,
          scaleX: 0.3, scaleY: 0.3, alpha: 0,
          duration: 200 + Math.random() * 150,
          onComplete: () => shard.destroy(),
        });
      },
    });
    this.scene.time.delayedCall(durationMs, () => sparkTimer.destroy());

    // 4) Periodic frost crystal formation
    const crystalTimer = this.scene.time.addEvent({
      delay: 350,
      repeat: Math.floor(durationMs / 350) - 1,
      callback: () => {
        const cx = x + (Math.random() - 0.5) * radius * 1.2;
        const cy = y + (Math.random() - 0.5) * radius * 1.2;
        // Six-pointed star crystal
        for (let i = 0; i < 6; i++) {
          const cAngle = (Math.PI * 2 * i) / 6;
          const crystal = this.scene.add.rectangle(
            cx, cy, 1.5, 4, 0x88ddff, 0.7
          );
          crystal.setRotation(cAngle);
          crystal.setDepth(20);
          this.scene.tweens.add({
            targets: crystal,
            scaleX: 1.5, scaleY: 1.5, alpha: 0,
            duration: 500,
            onComplete: () => crystal.destroy(),
          });
        }
      },
    });
    this.scene.time.delayedCall(durationMs, () => crystalTimer.destroy());
  }

  /** Poison area: toxic eruption + swirling miasma + dripping acid */
  poisonArea(x: number, y: number, radius: number, duration: number): void {
    const durationMs = duration * 1000;

    // 1) Toxic eruption: multi-layer burst
    const flash1 = this.scene.add.circle(x, y, 10, 0x88ff44, 0.9);
    flash1.setDepth(22);
    this.scene.tweens.add({
      targets: flash1,
      scaleX: 3.5, scaleY: 3.5, alpha: 0,
      duration: 200, ease: 'Power2',
      onComplete: () => flash1.destroy(),
    });
    const flash2 = this.scene.add.circle(x, y, 14, 0x44dd44, 0.7);
    flash2.setDepth(21);
    this.scene.tweens.add({
      targets: flash2,
      scaleX: 3, scaleY: 3, alpha: 0,
      duration: 300, ease: 'Power1',
      onComplete: () => flash2.destroy(),
    });

    // Toxic splatter outward
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.4;
      const splatDist = radius * 0.3 + Math.random() * radius * 0.5;
      const colors = [0x44dd44, 0x88ff44, 0x22aa22, 0x66ee44];
      const splat = this.scene.add.circle(x, y, 2 + Math.random() * 2,
        colors[Math.floor(Math.random() * colors.length)], 0.9);
      splat.setDepth(22);
      this.scene.tweens.add({
        targets: splat,
        x: x + Math.cos(angle) * splatDist,
        y: y + Math.sin(angle) * splatDist,
        alpha: 0, scaleY: 0.4,
        duration: 300 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => splat.destroy(),
      });
    }

    // 2) Lingering poison cloud with inner miasma
    const field = this.scene.add.circle(x, y, radius, 0x228822, 0.12);
    field.setDepth(14);
    field.setStrokeStyle(2, 0x44dd44, 0.35);

    const innerField = this.scene.add.circle(x, y, radius * 0.5, 0x44dd44, 0.08);
    innerField.setDepth(14);

    // Pulsing glow
    this.scene.tweens.add({
      targets: field,
      alpha: { from: 0.12, to: 0.22 },
      duration: 300, yoyo: true,
      repeat: Math.floor(durationMs / 600),
    });
    this.scene.tweens.add({
      targets: innerField,
      alpha: { from: 0.08, to: 0.16 },
      scaleX: { from: 1, to: 1.15 },
      scaleY: { from: 1, to: 1.15 },
      duration: 350, yoyo: true,
      repeat: Math.floor(durationMs / 700),
    });

    // Fade out
    [field, innerField].forEach(f => {
      this.scene.tweens.add({
        targets: f, alpha: 0, duration: 300,
        delay: durationMs - 300,
        onComplete: () => f.destroy(),
      });
    });

    // 3) Rising toxic bubbles (denser)
    const bubbleTimer = this.scene.time.addEvent({
      delay: 80,
      repeat: Math.floor(durationMs / 80) - 1,
      callback: () => {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius * 0.9;
        const bx = x + Math.cos(angle) * dist;
        const by = y + Math.sin(angle) * dist;
        const colors = [0x44dd44, 0x88ff44, 0x22aa22, 0x66ee44, 0x44cc22];
        const size = 2 + Math.random() * 3;
        const b = this.scene.add.circle(bx, by, size,
          colors[Math.floor(Math.random() * colors.length)], 0.7);
        b.setDepth(19);
        this.scene.tweens.add({
          targets: b,
          y: by - 10 - Math.random() * 12,
          x: bx + (Math.random() - 0.5) * 8,
          scaleX: 1.6, scaleY: 0.6,
          alpha: 0,
          duration: 250 + Math.random() * 200,
          ease: 'Power1',
          onComplete: () => b.destroy(),
        });
      },
    });
    this.scene.time.delayedCall(durationMs, () => bubbleTimer.destroy());

    // 4) Periodic acid drip bursts
    const dripTimer = this.scene.time.addEvent({
      delay: 400,
      repeat: Math.floor(durationMs / 400) - 1,
      callback: () => {
        // Acid puddle spot
        const px = x + (Math.random() - 0.5) * radius;
        const py = y + (Math.random() - 0.5) * radius;
        const puddle = this.scene.add.circle(px, py, 4 + Math.random() * 3, 0x44dd44, 0.4);
        puddle.setDepth(15);
        this.scene.tweens.add({
          targets: puddle,
          scaleX: 1.5, scaleY: 0.5, alpha: 0,
          duration: 600,
          onComplete: () => puddle.destroy(),
        });
      },
    });
    this.scene.time.delayedCall(durationMs, () => dripTimer.destroy());
  }

  /** Void area: dark implosion + abyssal rift + spiraling souls */
  voidArea(x: number, y: number, radius: number, duration: number): void {
    const durationMs = duration * 1000;

    // 1) Void implosion: dark flash that contracts then expands
    const implode = this.scene.add.circle(x, y, radius * 1.5, 0x220044, 0.6);
    implode.setDepth(21);
    this.scene.tweens.add({
      targets: implode,
      scaleX: 0.2, scaleY: 0.2, alpha: 0.8,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        // Then explode outward
        this.scene.tweens.add({
          targets: implode,
          scaleX: 4, scaleY: 4, alpha: 0,
          duration: 250,
          ease: 'Power1',
          onComplete: () => implode.destroy(),
        });
      },
    });

    // Purple energy burst
    const flash = this.scene.add.circle(x, y, 8, 0xaa66ee, 0.9);
    flash.setDepth(22);
    this.scene.tweens.add({
      targets: flash,
      scaleX: 3, scaleY: 3, alpha: 0,
      duration: 200, delay: 100,
      onComplete: () => flash.destroy(),
    });

    // Shadow tendrils outward
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.3;
      const tendrilDist = radius * 0.5 + Math.random() * radius * 0.4;
      const tendril = this.scene.add.circle(x, y, 2, 0x8844ff, 0.8);
      tendril.setDepth(22);
      this.scene.tweens.add({
        targets: tendril,
        x: x + Math.cos(angle) * tendrilDist,
        y: y + Math.sin(angle) * tendrilDist,
        alpha: 0, scaleX: 0.3, scaleY: 0.3,
        duration: 300 + Math.random() * 150,
        ease: 'Power2',
        onComplete: () => tendril.destroy(),
      });
    }

    // 2) Abyssal rift zone (dark core + outer ring)
    const field = this.scene.add.circle(x, y, radius, 0x220044, 0.22);
    field.setDepth(14);
    field.setStrokeStyle(2.5, 0x8844cc, 0.5);

    const innerVoid = this.scene.add.circle(x, y, radius * 0.4, 0x110022, 0.3);
    innerVoid.setDepth(14);

    // Pulsing glow (ominous)
    this.scene.tweens.add({
      targets: field,
      alpha: { from: 0.22, to: 0.38 },
      duration: 200, yoyo: true,
      repeat: Math.floor(durationMs / 400),
    });
    this.scene.tweens.add({
      targets: innerVoid,
      alpha: { from: 0.3, to: 0.5 },
      scaleX: { from: 1, to: 1.2 },
      scaleY: { from: 1, to: 1.2 },
      duration: 250, yoyo: true,
      repeat: Math.floor(durationMs / 500),
    });

    // Fade out
    [field, innerVoid].forEach(f => {
      this.scene.tweens.add({
        targets: f, alpha: 0, duration: 400,
        delay: durationMs - 400,
        onComplete: () => f.destroy(),
      });
    });

    // 3) Spiraling dark particles drawn inward (denser)
    const voidTimer = this.scene.time.addEvent({
      delay: 60,
      repeat: Math.floor(durationMs / 60) - 1,
      callback: () => {
        const angle = Math.random() * Math.PI * 2;
        const dist = radius * (0.8 + Math.random() * 0.6);
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist;
        const colors = [0x8844cc, 0x6622aa, 0xaa66ee, 0x442288, 0xcc88ff];
        const p = this.scene.add.circle(px, py, 1.5 + Math.random() * 2.5,
          colors[Math.floor(Math.random() * colors.length)], 0.7);
        p.setDepth(19);
        // Spiral inward with slight rotation
        const spiralAngle = angle + Math.PI * 0.3;
        const midPx = x + Math.cos(spiralAngle) * dist * 0.4;
        const midPy = y + Math.sin(spiralAngle) * dist * 0.4;
        this.scene.tweens.add({
          targets: p,
          x: midPx, y: midPy,
          duration: 150,
          onComplete: () => {
            this.scene.tweens.add({
              targets: p, x, y, alpha: 0,
              scaleX: 0.1, scaleY: 0.1,
              duration: 100 + Math.random() * 100,
              onComplete: () => p.destroy(),
            });
          },
        });
      },
    });
    this.scene.time.delayedCall(durationMs, () => voidTimer.destroy());

    // 4) Periodic soul wisps (eerie floating apparitions)
    const soulTimer = this.scene.time.addEvent({
      delay: 300,
      repeat: Math.floor(durationMs / 300) - 1,
      callback: () => {
        const sAngle = Math.random() * Math.PI * 2;
        const sDist = Math.random() * radius * 0.7;
        const sx = x + Math.cos(sAngle) * sDist;
        const sy = y + Math.sin(sAngle) * sDist;
        const soul = this.scene.add.circle(sx, sy, 3, 0xaa66ee, 0.5);
        soul.setDepth(20);
        // Float upward with ethereal motion
        this.scene.tweens.add({
          targets: soul,
          y: sy - 15 - Math.random() * 10,
          x: sx + (Math.random() - 0.5) * 16,
          scaleX: 0.5, scaleY: 1.5, alpha: 0,
          duration: 500 + Math.random() * 300,
          ease: 'Cubic.easeOut',
          onComplete: () => soul.destroy(),
        });
      },
    });
    this.scene.time.delayedCall(durationMs, () => soulTimer.destroy());
  }

  // ===== Projectile Effects =====

  /** Small fading dot trail */

  // ===== Fusion Effects =====

  /** Orbs converge then explode into fused orb */
  fusionEffect(x: number, y: number, colors: number[]): void {
    // Phase 1: Orbs converge to center
    colors.forEach((color, i) => {
      const angle = (Math.PI * 2 * i) / colors.length;
      const startX = x + Math.cos(angle) * 80;
      const startY = y + Math.sin(angle) * 80;
      const orb = this.scene.add.circle(startX, startY, 8, color, 0.9);
      orb.setDepth(52);

      const trailTimer = this.scene.time.addEvent({
        delay: 30,
        repeat: -1,
        callback: () => {
          const trail = this.scene.add.circle(orb.x, orb.y, 4, color, 0.4);
          trail.setDepth(51);
          this.scene.tweens.add({
            targets: trail,
            scaleX: 0, scaleY: 0, alpha: 0,
            duration: 300,
            onComplete: () => trail.destroy(),
          });
        },
      });

      this.scene.tweens.add({
        targets: orb,
        x, y,
        duration: 600,
        delay: i * 100,
        ease: 'Power2',
        onComplete: () => { trailTimer.destroy(); orb.destroy(); },
      });
    });

    // Phase 2: Explosion after convergence
    const totalDelay = 600 + colors.length * 100;
    this.scene.time.delayedCall(totalDelay, () => {
      // White flash
      const flash = this.scene.add.circle(x, y, 15, 0xffffff, 0.9);
      flash.setDepth(53);
      this.scene.tweens.add({
        targets: flash,
        scaleX: 4, scaleY: 4, alpha: 0,
        duration: 400,
        onComplete: () => flash.destroy(),
      });

      // Color rings
      colors.forEach((color, i) => {
        this.scene.time.delayedCall(i * 60, () => {
          const ring = this.scene.add.circle(x, y, 8, color, 0);
          ring.setStrokeStyle(3, color, 0.8);
          ring.setDepth(52);
          this.scene.tweens.add({
            targets: ring,
            scaleX: 5 + i, scaleY: 5 + i, alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => ring.destroy(),
          });
        });
      });

      // Sparkle burst
      for (let i = 0; i < 20; i++) {
        const pAngle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 80;
        const pColor = colors[Math.floor(Math.random() * colors.length)];
        const particle = this.scene.add.circle(x, y, 2 + Math.random() * 3, pColor, 0.9);
        particle.setDepth(54);
        this.scene.tweens.add({
          targets: particle,
          x: x + Math.cos(pAngle) * speed,
          y: y + Math.sin(pAngle) * speed,
          scaleX: 0, scaleY: 0, alpha: 0,
          duration: 500 + Math.random() * 300,
          ease: 'Power2',
          onComplete: () => particle.destroy(),
        });
      }

      // "FUSION!" text
      const txt = this.scene.add.text(x, y - 25, 'FUSION!', {
        fontSize: '20px',
        fontFamily: FONT_FAMILY,
        color: '#ffd700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(55);

      this.scene.tweens.add({
        targets: txt,
        y: y - 65,
        alpha: 0,
        duration: 1200,
        ease: 'Power2',
        onComplete: () => txt.destroy(),
      });
    });
  }
}
