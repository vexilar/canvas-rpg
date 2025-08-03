import {GameObject} from "./GameObject.js";
import {events} from "./Events.js";
import {Vector2} from "./Vector2.js";

export class Camera extends GameObject {
  constructor() {
    super({});

    this.targetPosition = new Vector2(0, 0);
    this.smoothSpeed = 0.05; // Reduced from 0.1 for less sensitive movement

    events.on("HERO_POSITION", this, heroPosition => {
      // Calculate camera position that centers the hero
      const personHalf = 8;
      const canvasWidth = 320;
      const canvasHeight = 180;
      const halfWidth = -personHalf + canvasWidth / 2;
      const halfHeight = -personHalf + canvasHeight / 2;
      
      this.targetPosition = new Vector2(
        -heroPosition.x + halfWidth,
        -heroPosition.y + halfHeight
      );
    })

    // Camera knows when a new level starts
    events.on("CHANGE_LEVEL", this, (newMap) => {
      this.centerPositionOnTarget(newMap.heroStartPosition)
    })
  }

  step(delta) {
    // Smoothly move camera towards target position
    const dx = this.targetPosition.x - this.position.x;
    const dy = this.targetPosition.y - this.position.y;
    
    // Only move if we're not already at the target
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      this.position.x += dx * this.smoothSpeed;
      this.position.y += dy * this.smoothSpeed;
      
      // Round to whole pixels to prevent fuzzy background
      this.position.x = Math.round(this.position.x);
      this.position.y = Math.round(this.position.y);
    }
  }

  centerPositionOnTarget(pos) {
    // Create a new position based on the incoming position
    const personHalf = 8;
    const canvasWidth = 320;
    const canvasHeight = 180;
    const halfWidth = -personHalf + canvasWidth / 2;
    const halfHeight = -personHalf + canvasHeight / 2;
    
    // Set both current and target position for immediate centering
    this.position = new Vector2(
      -pos.x + halfWidth,
      -pos.y + halfHeight,
    )
    this.targetPosition = this.position.duplicate();
  }


}