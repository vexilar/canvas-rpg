import {SkillAnimation} from "../SkillAnimation.js";
import {GameObject} from "../../../GameObject.js";
import {Vector2} from "../../../Vector2.js";
import {FlashOverlay} from "../FlashOverlay.js";
import {SliceEffect} from "../SliceEffect.js";

/**
 * Starfall skill animation: Hero ascends, flashes, then dives down onto target
 */
export class StarfallSkillAnimation extends SkillAnimation {
  constructor(params = {}) {
    super(params);
    
    // Animation phases: idle | ascend | flash | dive | impact | retreat
    this.phase = "idle";
    
    // Configurable parameters
    this.ascendHeight = 28;
    this.ascendSpeed = 0.12; // px/ms
    this.diveSpeed = 0.5; // px/ms
    this.flashDuration = 180; // ms
    this.impactDuration = 200; // ms
    this.retreatSpeed = 0.5; // px/ms
    
    // State tracking
    this.timer = 0;
    this.targetX = null;
    this.targetY = null;
  }

  start() {
    // Calculate target position (in front of the target enemy)
    const targetWidth = this.target.sprite.frameSize.x * (this.target.sprite.scale ?? 1);
    const padding = 8;
    this.targetX = this.target.position.x - Math.max(12, targetWidth * 0.35) - padding;
    this.targetY = this.attackerStartPosition.y;
    
    // Begin ascent phase
    this.phase = "ascend";
    this.attacker.body.animations.play("walkUp");
  }

  step(delta) {
    switch (this.phase) {
      case "ascend":
        this.stepAscend(delta);
        break;
      case "flash":
        this.stepFlash(delta);
        break;
      case "dive":
        this.stepDive(delta);
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

  stepAscend(delta) {
    // Move up until reached ascend height
    const targetY = this.attackerStartPosition.y - this.ascendHeight;
    const stepY = this.ascendSpeed * delta;
    this.attacker.position.y = Math.max(targetY, this.attacker.position.y - stepY);
    
    if (this.attacker.position.y <= targetY + 0.001) {
      // Begin brief yellow flash
      this.phase = "flash";
      this.timer = this.flashDuration;
      this.attacker.body.animations.play("standRight");
      
      // Add flash overlay effect
      const w = this.attacker.body.frameSize.x * (this.attacker.body.scale ?? 1);
      const h = this.attacker.body.frameSize.y * (this.attacker.body.scale ?? 1);
      const fxContainer = new GameObject({ position: new Vector2(-6, -12) });
      const flash = new FlashOverlay({ 
        width: w, 
        height: h, 
        duration: this.timer, 
        color: "#FFD84A", 
        alpha: 0.6 
      });
      fxContainer.addChild(flash);
      this.attacker.addChild(fxContainer);
    }
  }

  stepFlash(delta) {
    this.timer -= delta;
    if (this.timer <= 0) {
      // Begin dive towards target
      this.phase = "dive";
      this.attacker.body.animations.play("walkRight");
    }
  }

  stepDive(delta) {
    const dx = this.targetX - this.attacker.position.x;
    const dy = this.targetY - this.attacker.position.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist <= 0.5) {
      // Reached target, begin impact
      this.attacker.position.x = this.targetX;
      this.attacker.position.y = this.targetY;
      this.phase = "impact";
      this.timer = this.impactDuration;
      this.attacker.body.animations.play("standRight");
      
      // Deal damage and spawn hit effects
      this.applyHitEffects();
    } else {
      // Continue diving
      const step = this.diveSpeed * delta;
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      const move = Math.min(step, dist);
      this.attacker.position.x += nx * move;
      this.attacker.position.y += ny * move;
    }
  }

  stepImpact(delta) {
    this.timer -= delta;
    if (this.timer <= 0) {
      // Begin retreat back to start
      this.phase = "retreat";
      this.attacker.body.animations.play("walkLeft");
    }
  }

  stepRetreat(delta) {
    const dx = this.attackerStartPosition.x - this.attacker.position.x;
    const dy = this.attackerStartPosition.y - this.attacker.position.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist <= 1.0) {
      // Animation complete
      this.isComplete = true;
      this.cleanup();
    } else {
      // Continue retreating
      const step = this.retreatSpeed * delta;
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      const move = Math.min(step, dist);
      this.attacker.position.x += nx * move;
      this.attacker.position.y += ny * move;
    }
  }

  applyHitEffects() {
    // Deal damage
    const damage = this.skill?.attackPower ?? 20;
    this.dealDamage(damage);
    
    // Add visual effects to target
    const w = this.target.sprite.frameSize.x * (this.target.sprite.scale ?? 1);
    const h = this.target.sprite.frameSize.y * (this.target.sprite.scale ?? 1);
    
    const flash = new FlashOverlay({ width: w, height: h, duration: 150 });
    this.target.addChild(flash);
    
    const slice = new SliceEffect({ width: w, height: h, duration: 180 });
    this.target.addChild(slice);
  }
}

