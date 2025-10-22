import {GameObject} from "../../GameObject.js";
import {Vector2} from "../../Vector2.js";
import {DOWN, LEFT, RIGHT, UP} from "../../Input.js";
import {gridCells, isSpaceFree} from "../../helpers/grid.js";
import {Sprite} from "../../Sprite.js";
import {resources} from "../../Resource.js";
import {Animations} from "../../Animations.js";
import {FrameIndexPattern} from "../../FrameIndexPattern.js";
import {HealthBar} from "../../HealthBar.js";
import {ExperienceBar} from "../../ExperienceBar.js";
import {
  PICK_UP_DOWN,
  STAND_DOWN,
  STAND_LEFT,
  STAND_RIGHT,
  STAND_UP,
  WALK_DOWN,
  WALK_LEFT,
  WALK_RIGHT,
  WALK_UP
} from "./heroAnimations.js";
import {moveTowards} from "../../helpers/moveTowards.js";
import {events} from "../../Events.js";
import {audio} from "../../Audio.js";

export class Hero extends GameObject {
  constructor(x, y, options = {}) {
    super({
      position: new Vector2(x, y)
    });

    // Turn order attribute
    this.speed = 100;

    const shadow = new Sprite({
      resource: resources.images.shadow,
      frameSize: new Vector2(32, 32),
      position: new Vector2(-8, -19),
    })
    this.addChild(shadow);

    this.body = new Sprite({
      resource: resources.images.hero,
      frameSize: new Vector2(32,32),
      hFrames: 3,
      vFrames: 8,
      frame: 1,
      position: new Vector2(-8, -20),
      hitbox: {
        x: 8, // Offset from sprite center
        y: 8,
        width: 16, // Smaller hitbox than visual
        height: 16
      },
      animations: new Animations({
        walkDown: new FrameIndexPattern(WALK_DOWN),
        walkUp: new FrameIndexPattern(WALK_UP),
        walkLeft: new FrameIndexPattern(WALK_LEFT),
        walkRight: new FrameIndexPattern(WALK_RIGHT),
        standDown: new FrameIndexPattern(STAND_DOWN),
        standUp: new FrameIndexPattern(STAND_UP),
        standLeft: new FrameIndexPattern(STAND_LEFT),
        standRight: new FrameIndexPattern(STAND_RIGHT),
        pickUpDown: new FrameIndexPattern(PICK_UP_DOWN),
      })
    })
    this.addChild(this.body);

    // Add health bar to hero
    this.health = 100;
    this.maxHealth = 100;
    this.isInvulnerable = false; // For damage cooldown

    // Experience and leveling system
    this.level = 1;
    this.experience = 0;
    this.experienceToNextLevel = 1000; // Experience needed for level 2
    this.invulnerabilityTime = 0; // Time remaining invulnerable
    this.isKnockbacked = false; // For knockback state
    this.knockbackTime = 0; // Time remaining in knockback
    this.knockbackVector = new Vector2(0, 0); // Knockback direction and speed
    this.preKnockbackPosition = null;
    this.returnToAfterKnockback = null;
    this.isReturningFromKnockback = false;
    this.knockbackReturnSpeed = 0.2; // px/ms
    const healthBar = new HealthBar(100, 10, -20);
    this.addChild(healthBar);
    this.healthBar = healthBar;

    // Add experience bar below health bar
    const experienceBar = new ExperienceBar(100, 10, -15);
    this.addChild(experienceBar);
    this.experienceBar = experienceBar;

    this.facingDirection = DOWN;
    this.destinationPosition = this.position.duplicate();
    this.itemPickupTime = 0;
    this.itemPickupShell = null;
    this.isLocked = false;

    // Battle skills loadout (optional)
    this.skills = options.skills ?? null;

    // React to picking up an item
    events.on("HERO_PICKS_UP_ITEM", this, data => {
      this.onPickUpItem(data)
    })
  }

  ready() {
    events.on("START_TEXT_BOX", this, () => {
      this.isLocked = true;
    })
    events.on("END_TEXT_BOX", this, () => {
      this.isLocked = false;
    })
  }

  step(delta, root) {

    // Handle invulnerability cooldown even when locked
    if (this.isInvulnerable) {
      this.invulnerabilityTime -= delta;
      if (this.invulnerabilityTime <= 0) {
        this.isInvulnerable = false;
      }
    }

    // Handle knockback movement even when locked
    if (this.isKnockbacked) {
      this.knockbackTime -= delta;
      
      // Apply knockback movement
      this.position.x += this.knockbackVector.x;
      this.position.y += this.knockbackVector.y;
      
      // Reduce knockback speed over time (friction)
      this.knockbackVector.x *= 0.9;
      this.knockbackVector.y *= 0.9;
      
      if (this.knockbackTime <= 0) {
        this.isKnockbacked = false;
        this.knockbackVector = new Vector2(0, 0);
        // Begin return-to-position phase if a target was requested
        if (this.returnToAfterKnockback) {
          this.isReturningFromKnockback = true;
        }
        // Update destination position to current position to prevent snapback
        this.destinationPosition.x = this.position.x;
        this.destinationPosition.y = this.position.y;
        // Emit final position after knockback ends
        this.tryEmitPosition();
      }
      
      // Don't process normal movement during knockback
      return;
    }

    // Smoothly return to target position after knockback, even when locked
    if (this.isReturningFromKnockback && this.returnToAfterKnockback) {
      const dx = this.returnToAfterKnockback.x - this.position.x;
      const dy = this.returnToAfterKnockback.y - this.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 1) {
        this.position.x = this.returnToAfterKnockback.x;
        this.position.y = this.returnToAfterKnockback.y;
        this.isReturningFromKnockback = false;
        this.tryEmitPosition();
      } else {
        const stepX = (dx / dist) * this.knockbackReturnSpeed * delta;
        const stepY = (dy / dist) * this.knockbackReturnSpeed * delta;
        this.position.x += stepX;
        this.position.y += stepY;
        this.tryEmitPosition();
      }
      // During return, skip normal movement
      return;
    }

    // Don't do movement/input when locked
    if (this.isLocked) {
      return;
    }

    // Lock movement if celebrating an item pickup
    if (this.itemPickupTime > 0) {
      this.workOnItemPickup(delta);
      return;
    }

    // Check for input
    /** @type {Input} */
    const input = root.input;
    if (input?.getActionJustPressed("Space")) {
      // Look for an object at the next space (according to where Hero is facing)
      const objAtPosition = this.parent.children.find(child => {
        return child.position.matches(this.position.toNeighbor(this.facingDirection))
      })
      if (objAtPosition) {
        events.emit("HERO_REQUESTS_ACTION", objAtPosition);
      }
    }

    const distance = moveTowards(this, this.destinationPosition, 1);
    const hasArrived = distance <= 1;
    // Attempt to move again if the hero is at his position
    if (hasArrived) {
      this.tryMove(root)
    }

    this.tryEmitPosition()
  }

  tryEmitPosition() {
    if (this.lastX === this.position.x && this.lastY === this.position.y) {
      return;
    }
    
    // Don't emit position during knockback to prevent camera snapback
    if (this.isKnockbacked) {
      return;
    }
    
    this.lastX = this.position.x;
    this.lastY = this.position.y;
    events.emit("HERO_POSITION", this.position)
  }

  tryMove(root) {
    const {input} = root;

    if (!input.direction) {

      if (this.facingDirection === LEFT) { this.body.animations.play("standLeft")}
      if (this.facingDirection === RIGHT) { this.body.animations.play("standRight")}
      if (this.facingDirection === UP) { this.body.animations.play("standUp")}
      if (this.facingDirection === DOWN) { this.body.animations.play("standDown")}

      return;
    }

    let nextX = this.destinationPosition.x;
    let nextY = this.destinationPosition.y;
    const gridSize = 16;

    if (input.direction === DOWN) {
      nextY += gridSize;
      this.body.animations.play("walkDown");
    }
    if (input.direction === UP) {
      nextY -= gridSize;
      this.body.animations.play("walkUp");
    }
    if (input.direction === LEFT) {
      nextX -= gridSize;
      this.body.animations.play("walkLeft");
    }
    if (input.direction === RIGHT) {
      nextX += gridSize;
      this.body.animations.play("walkRight");
    }
    this.facingDirection = input.direction ?? this.facingDirection;

    // Validating that the next destination is free
    const spaceIsFree = isSpaceFree(root.level?.walls, nextX, nextY);
    const solidBodyAtSpace = this.parent.children.find(c => {
      return c.isSolid && c.position.x === nextX && c.position.y === nextY
    })
    if (spaceIsFree && !solidBodyAtSpace) {
      this.destinationPosition.x = nextX;
      this.destinationPosition.y = nextY;
    }
  }

  onPickUpItem({ image, position }) {
    // Make sure we land right on the item
    this.destinationPosition = position.duplicate();

    // Start the pickup animation
    this.itemPickupTime = 500; // ms

    this.itemPickupShell = new GameObject({});
    this.itemPickupShell.addChild(new Sprite({
      resource: image,
      position: new Vector2(0, -18)
    }))
    this.addChild(this.itemPickupShell);
  }

  workOnItemPickup(delta) {
    this.itemPickupTime -= delta;
    this.body.animations.play("pickUpDown")

    // Remove the item being held overhead
    if (this.itemPickupTime <= 0) {
      this.itemPickupShell.destroy();
    }

  }

  gainExperience(amount) {
    this.experience += amount;
    console.log(`Hero gained ${amount} experience! Total: ${this.experience}`);

    // Check for level up
    while (this.experience >= this.experienceToNextLevel) {
      this.levelUp();
    }

    // Update experience bar only once after all level ups are complete
    if (this.experienceBar) {
      this.experienceBar.setExperience(this.experience, this.experienceToNextLevel);
    }

    // Emit event for UI updates
    events.emit("HERO_EXPERIENCE_CHANGED", {
      experience: this.experience,
      experienceToNextLevel: this.experienceToNextLevel,
      level: this.level
    });
  }

  levelUp() {
    const excessExperience = this.experience - this.experienceToNextLevel;
    this.experience = excessExperience;
    this.level += 1;

    // Increase experience needed for next level (simple scaling)
    this.experienceToNextLevel = Math.floor(this.experienceToNextLevel * 1.5);

    console.log(`Hero leveled up to level ${this.level}!`);
    events.emit("HERO_LEVEL_UP", { level: this.level });
  }

  takeDamage(amount, attackerPosition = null, returnToPosition = null) {
    if (this.isInvulnerable) {
      return; // Can't take damage while invulnerable
    }

    // Play hit/slash sound
    audio.playSlash(0.45);
    audio.playClip("heroHit", { volume: 0.7, delaySec: 0.0 });

    this.health = Math.max(0, this.health - amount);
    console.log("Hero took damage! Health:", this.health);

    // Update health bar
    if (this.healthBar) {
      this.healthBar.setHealth(this.health);
    } else {
      const hb = this.children.find(child => child instanceof HealthBar);
      hb?.setHealth(this.health);
    }

    // Calculate knockback direction if attacker position is provided
    if (attackerPosition) {
      // Calculate direction from attacker to hero
      const dx = this.position.x - attackerPosition.x;
      const dy = this.position.y - attackerPosition.y;

      // Normalize the direction vector
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 0) {
        const knockbackSpeed = 3; // Knockback speed
        // Remember where we were and where to return after knockback
        this.preKnockbackPosition = new Vector2(this.position.x, this.position.y);
        this.returnToAfterKnockback = returnToPosition || this.preKnockbackPosition;
        this.isReturningFromKnockback = false;
        this.knockbackVector.x = (dx / distance) * knockbackSpeed;
        this.knockbackVector.y = (dy / distance) * knockbackSpeed;

        // Set knockback duration
        this.isKnockbacked = true;
        this.knockbackTime = 300; // 300ms knockback duration
      }
    }

    // Set invulnerability for 1 second (1000ms)
    this.isInvulnerable = true;
    this.invulnerabilityTime = 1000;

    if (this.health <= 0) {
      console.log("Hero defeated!");
      events.emit("HERO_DIED");
    }
  }


}