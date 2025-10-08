import {GameObject} from "./GameObject.js";
import {events} from "./Events.js";
import {Vector2} from "./Vector2.js";
import {DESIGN_WIDTH, DESIGN_HEIGHT} from "./helpers/grid.js";

export class Camera extends GameObject {
  constructor() {
    super({});

    this.targetPosition = new Vector2(0, 0);
    this.smoothSpeed = 0.05; // Reduced from 0.1 for less sensitive movement
    this.followEnabled = true; // Allow disabling follow during battle scenes

    events.on("HERO_POSITION", this, heroPosition => {
      if (!this.followEnabled) {
        return; // Ignore hero movement while follow is disabled
      }
      // Calculate camera position that centers the hero
      const personHalf = 8;
      const canvasWidth = DESIGN_WIDTH;
      const canvasHeight = DESIGN_HEIGHT;
      const halfWidth = -personHalf + canvasWidth / 2;
      const halfHeight = -personHalf + canvasHeight / 2;
      
      this.targetPosition = new Vector2(
        -heroPosition.x + halfWidth,
        -heroPosition.y + halfHeight
      );
    })

    // Allow external control to enable/disable following
    events.on("CAMERA_FOLLOW_ENABLED", this, (enabled) => {
      this.followEnabled = !!enabled;
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
    // Guard against undefined position
    if (!pos || typeof pos.x === 'undefined' || typeof pos.y === 'undefined') {
      console.warn('Camera.centerPositionOnTarget called with invalid position:', pos);
      return;
    }
    
    // Create a new position based on the incoming position
    const personHalf = 8;
    const canvasWidth = DESIGN_WIDTH;
    const canvasHeight = DESIGN_HEIGHT;
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