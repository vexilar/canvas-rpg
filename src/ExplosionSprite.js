import {Sprite} from "./Sprite.js";
import {Vector2} from "./Vector2.js";
import {resources} from "./Resource.js";

export class ExplosionSprite extends Sprite {
  constructor(position) {
    super({
      resource: resources.animatedSpriteData.fireballExplode,
      frameSize: new Vector2(64, 64),
      position: position,
      scale: 1
    });
    
    this.animationComplete = false;
    this.frameCount = 0;
    this.totalFrames = 30; // Total number of frames
    this.frameDelay = 50; // milliseconds per frame
    this.totalDuration = this.totalFrames * this.frameDelay; // Total animation duration
    this.elapsedTime = 0;
  }
  
  step(delta) {
    if (!this.resource.isLoaded) return;
    
    // Track elapsed time instead of frame count for more accurate timing
    this.elapsedTime += delta;
    
    // Check if animation is complete
    if (this.elapsedTime >= this.totalDuration && !this.animationComplete) {
      this.animationComplete = true;
      
      // Destroy this sprite after a short delay to ensure the last frame is shown
      setTimeout(() => {
        if (this.parent) {
          this.parent.removeChild(this);
        }
      }, 100);
    }
  }
} 