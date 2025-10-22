import {GameObject} from "../../GameObject.js";

/**
 * Base class for all skill animations in battle.
 * Each skill animation handles its own state, movement, and effects.
 */
export class SkillAnimation {
  constructor(params = {}) {
    this.battle = params.battle;
    this.attacker = params.attacker;
    this.target = params.target;
    this.skill = params.skill;
    this.attackerStartPosition = params.attackerStartPosition;
    this.targetStartPosition = params.targetStartPosition;
    this.isComplete = false;
  }

  /**
   * Called once when the skill animation begins.
   * Initialize any state, positions, or timers here.
   */
  start() {
    throw new Error("SkillAnimation.start() must be implemented by subclass");
  }

  /**
   * Called every frame to update the animation.
   * @param {number} delta - Time elapsed since last frame in milliseconds
   * @returns {boolean} - Return true if animation is complete
   */
  step(delta) {
    throw new Error("SkillAnimation.step() must be implemented by subclass");
  }

  /**
   * Called when the animation completes to clean up.
   * Reset attacker to starting position if needed.
   */
  cleanup() {
    // Default: reset attacker to start position and animation
    if (this.attacker && this.attackerStartPosition) {
      this.attacker.position.x = this.attackerStartPosition.x;
      this.attacker.position.y = this.attackerStartPosition.y;
      
      // Determine which animation to play based on attacker type
      if (this.attacker.body) {
        // Hero
        this.attacker.body.animations.play("standRight");
      } else if (this.attacker.sprite) {
        // Baddy
        this.attacker.sprite.animations.play("standLeft");
      }
    }
  }

  /**
   * Helper to deal damage and apply hit effects to the target.
   * Subclasses can override for custom damage/effects.
   */
  dealDamage(amount) {
    if (!this.target) return;
    
    this.target.takeDamage(amount);
  }
}

