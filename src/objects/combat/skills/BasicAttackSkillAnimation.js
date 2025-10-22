import {SkillAnimation} from "../SkillAnimation.js";
import {FlashOverlay} from "../FlashOverlay.js";
import {SliceEffect} from "../SliceEffect.js";

/**
 * Basic attack animation: Attacker dashes forward, strikes, then retreats
 */
export class BasicAttackSkillAnimation extends SkillAnimation {
  constructor(params = {}) {
    super(params);
    
    // Animation phases: idle | dashing | impact | retreat
    this.phase = "idle";
    
    // Movement parameters
    this.speed = 0; // current speed in px/ms
    this.maxSpeed = 0.35; // px/ms
    this.acceleration = 0.01; // px/ms^2
    this.retreatFriction = 0.92;
    
    // State tracking
    this.targetX = null;
    this.impactTimer = 0;
    this.impactDuration = 180; // ms
    
    // Flag to control whether damage is applied automatically
    // (for enemy attacks with parry system, damage is handled externally)
    this.applyDamageOnImpact = params.applyDamageOnImpact ?? true;
  }

  start() {
    // Calculate target position (in front of the target)
    const isHeroAttacker = !!this.attacker.body; // Hero has body, Baddy has sprite
    
    if (isHeroAttacker) {
      // Hero attacking baddy
      const targetWidth = this.target.sprite.frameSize.x * (this.target.sprite.scale ?? 1);
      const padding = 8;
      this.targetX = this.target.position.x - Math.max(12, targetWidth * 0.35) - padding;
      this.attacker.body.animations.play("walkRight");
    } else {
      // Baddy attacking hero
      const heroWidth = this.target.body.frameSize.x * (this.target.body.scale ?? 1);
      const padding = 8;
      this.targetX = this.target.position.x + Math.max(12, heroWidth * 0.35) + padding;
      this.attacker.sprite.animations.play("walkLeft");
    }
    
    // Begin dashing phase
    this.phase = "dashing";
    this.speed = 0;
  }

  step(delta) {
    switch (this.phase) {
      case "dashing":
        this.stepDashing(delta);
        break;
      case "impact":
        this.stepImpact(delta);
        break;
      case "retreat":
        this.stepRetreat(delta);
        break;
    }
    
    return this.isComplete;
  }

  stepDashing(delta) {
    // Accelerate forward
    this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * delta);
    
    const remaining = this.targetX - this.attacker.position.x;
    const dir = Math.sign(remaining) || 1;
    const stepX = dir * Math.min(Math.abs(remaining), this.speed * delta);
    this.attacker.position.x += stepX;

    if (Math.abs(this.attacker.position.x - this.targetX) <= 0.5) {
      // Reached target, begin impact
      this.attacker.position.x = this.targetX;
      this.phase = "impact";
      this.impactTimer = this.impactDuration;
      
      const isHeroAttacker = !!this.attacker.body;
      if (isHeroAttacker) {
        this.attacker.body.animations.play("standRight");
      } else {
        this.attacker.sprite.animations.play("standLeft");
      }
      
      // Apply hit effects
      this.applyHitEffects();
    }
  }

  stepImpact(delta) {
    this.impactTimer -= delta;
    if (this.impactTimer <= 0) {
      // Begin retreat
      this.phase = "retreat";
      this.speed = Math.max(0.2, this.speed);
      
      const isHeroAttacker = !!this.attacker.body;
      if (isHeroAttacker) {
        this.attacker.body.animations.play("walkLeft");
      } else {
        this.attacker.sprite.animations.play("walkRight");
      }
    }
  }

  stepRetreat(delta) {
    const dir = Math.sign(this.attackerStartPosition.x - this.attacker.position.x) || -1;
    const vx = this.speed * dir;
    this.attacker.position.x += vx * delta;
    this.speed *= this.retreatFriction;

    const distBack = Math.abs(this.attackerStartPosition.x - this.attacker.position.x);
    if (distBack <= 1.0 || this.speed < 0.02) {
      // Animation complete
      this.isComplete = true;
      this.cleanup();
    }
  }

  applyHitEffects() {
    // Deal damage if enabled (not for enemy attacks with parry system)
    if (this.applyDamageOnImpact) {
      const damage = this.skill?.attackPower ?? 20;
      this.dealDamage(damage);
    }
    
    // Add visual effects to target
    const isHeroTarget = !!this.target.body;
    const w = isHeroTarget 
      ? this.target.body.frameSize.x * (this.target.body.scale ?? 1)
      : this.target.sprite.frameSize.x * (this.target.sprite.scale ?? 1);
    const h = isHeroTarget
      ? this.target.body.frameSize.y * (this.target.body.scale ?? 1)
      : this.target.sprite.frameSize.y * (this.target.sprite.scale ?? 1);
    
    const flash = new FlashOverlay({ width: w, height: h, duration: 150 });
    const slice = new SliceEffect({ width: w, height: h, duration: 180 });
    
    this.target.addChild(flash);
    this.target.addChild(slice);
  }
}

