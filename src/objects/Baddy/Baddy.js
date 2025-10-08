import {GameObject} from "../../GameObject.js";
import {Vector2} from "../../Vector2.js";
import {Sprite} from "../../Sprite.js";
import {resources} from "../../Resource.js";
import {Animations} from "../../Animations.js";
import {FrameIndexPattern} from "../../FrameIndexPattern.js";
import {HealthBar} from "../../HealthBar.js";
import {STAND_RIGHT, WALK_RIGHT, STAND_LEFT, WALK_LEFT} from "../../baddyAnims.js";
import {events} from "../../Events.js";
import {audio} from "../../Audio.js";

export class Baddy extends GameObject {
  constructor(x, y, options = {}) {
    super({
      position: new Vector2(x, y)
    });

    // Create the baddy sprite
    this.sprite = new Sprite({
      resource: resources.images.baddy,
      frameSize: new Vector2(48, 48),
      hFrames: 6,
      vFrames: 1,
      frame: 1,
      position: new Vector2(0, 0), // Position at origin relative to parent
      scale: options.battleMode ? 0.7 : 1.0, // Smaller in battle mode
      animations: new Animations({
        walkRight: new FrameIndexPattern(WALK_RIGHT),
        standRight: new FrameIndexPattern(STAND_RIGHT),
        walkLeft: new FrameIndexPattern(WALK_LEFT),
        standLeft: new FrameIndexPattern(STAND_LEFT),
      }),
      hitbox: {
        x: 16, // Offset from sprite top-left
        y: 16,
        width: 16,
        height: 16
      }
    });
    this.addChild(this.sprite);

    // Battle properties
    this.health = options.health || 100;
    this.maxHealth = options.maxHealth || 100;
    this.attackPower = options.attackPower || 15;
    this.isAlive = true;

    // AI properties (for non-battle scenes)
    this.aggroRange = options.aggroRange ?? 120;
    this.isAggroed = false;
    this.targetPosition = this.position.duplicate();
    this.moveSpeed = options.moveSpeed ?? 0.5;
    this.direction = options.direction ?? 1;

    // Battle mode (for turn-based battles)
    this.battleMode = options.battleMode || false;

    // Add health bar
    const healthBar = new HealthBar(this.maxHealth, 20, -10);
    this.addChild(healthBar);
    this.healthBar = healthBar;

    // Set initial animation based on battle mode
    if (this.battleMode) {
      this.sprite.animations.play("standLeft"); // Face left in battle
    } else {
      this.sprite.animations.play("standRight"); // Face right in world
    }

    // Make baddy solid for collision detection
    this.isSolid = true;

    // Turn order attribute
    this.speed = 75;
  }

  ready() {
    // Listen for hero position updates to detect when hero is facing this baddy
    if (this.battleMode) {
      events.on("HERO_POSITION", this, (heroPosition) => {
        this.checkHeroFacing(heroPosition);
      });
    }
  }

  checkHeroFacing(heroPosition) {
    // Simple check: if hero is close enough and facing this direction, allow interaction
    const distance = Math.sqrt(
      Math.pow(heroPosition.x - this.position.x, 2) + 
      Math.pow(heroPosition.y - this.position.y, 2)
    );
    
    // If hero is within interaction range, make this baddy interactive
    if (distance < 50) { // Within 50 pixels
      // The hero can interact with this baddy
    }
  }

  takeDamage(amount) {
    if (!this.isAlive) return;

    // Play hit/slash sound
    audio.playSlash(0.35);
    audio.playClip("baddyOof", { volume: 0.65, delaySec: 0.0 });

    this.health = Math.max(0, this.health - amount);
    this.healthBar.setHealth(this.health);

    if (this.health <= 0) {
      this.isAlive = false;
      this.onDeath();
    }
  }

  onDeath() {
    console.log("Baddy defeated!");
    // Could emit an event here for battle completion
  }

  attack(target) {
    if (!this.isAlive) return;

    console.log(`Baddy attacks for ${this.attackPower} damage!`);
    if (target && typeof target.takeDamage === 'function') {
      target.takeDamage(this.attackPower);
    }
  }

  // For battle mode - simple attack animation
  playAttackAnimation() {
    if (!this.battleMode) return;
    
    // Simple attack animation - face left in battle
    this.sprite.animations.play("standLeft");
  }

  // For non-battle mode - AI movement
  updateAI(heroPosition, delta) {
    if (this.battleMode) return;

    // If aggroRange is 0 or moveSpeed is 0, don't move at all
    if (this.aggroRange <= 0 || this.moveSpeed <= 0) {
      this.sprite.animations.play("standRight");
      return;
    }

    // Calculate distance to hero
    const distanceToHero = Math.sqrt(
      Math.pow(heroPosition.x - this.position.x, 2) + 
      Math.pow(heroPosition.y - this.position.y, 2)
    );

    // Check if hero is in aggro range
    if (distanceToHero <= this.aggroRange) {
      this.isAggroed = true;
      this.targetPosition = heroPosition.duplicate();
    } else {
      this.isAggroed = false;
    }

    // Move towards target if aggroed
    if (this.isAggroed) {
      const dx = this.targetPosition.x - this.position.x;
      const dy = this.targetPosition.y - this.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) { // Don't move if very close
        this.position.x += (dx / distance) * this.moveSpeed * delta;
        this.position.y += (dy / distance) * this.moveSpeed * delta;
        this.sprite.animations.play("walkRight");
      } else {
        this.sprite.animations.play("standRight");
      }
    } else {
      this.sprite.animations.play("standRight");
    }
  }

  getHitboxBounds() {
    return this.sprite.getHitboxBounds();
  }

  collidesWith(otherSprite) {
    return this.sprite.collidesWith(otherSprite);
  }
}
