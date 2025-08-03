import {GameObject} from "./GameObject.js";
import {Vector2} from "./Vector2.js";
import {events} from "./Events.js";

export class DeathScreen extends GameObject {
  constructor() {
    super({});
    
    this.alpha = 0;
    this.fadeSpeed = 0.02;
    this.messageAlpha = 0;
    this.messageFadeSpeed = 0.03;
    this.showMessage = false;
    this.resetDelay = 0;
    this.resetDelayMax = 3000; // 3 seconds after fade completes
    
    // Listen for hero death
    events.on("HERO_DIED", this, () => {
      this.startDeathSequence();
    });
  }
  
  startDeathSequence() {
    this.alpha = 0;
    this.messageAlpha = 0;
    this.showMessage = false;
    this.resetDelay = 0;
    this.isActive = true;
  }
  
  step(delta) {
    if (!this.isActive) return;
    
    // Fade in the black overlay
    if (this.alpha < 1) {
      this.alpha += this.fadeSpeed;
      if (this.alpha >= 1) {
        this.alpha = 1;
        this.showMessage = true;
      }
    }
    
    // Show the message after fade completes
    if (this.showMessage) {
      if (this.messageAlpha < 1) {
        this.messageAlpha += this.messageFadeSpeed;
        if (this.messageAlpha >= 1) {
          this.messageAlpha = 1;
        }
      } else {
        // Start reset delay
        this.resetDelay += delta;
        if (this.resetDelay >= this.resetDelayMax) {
          this.resetGame();
        }
      }
    }
  }
  
  resetGame() {
    this.isActive = false;
    events.emit("RESET_GAME");
  }
  
  draw(ctx, cameraX, cameraY) {
    if (!this.isActive) return;
    
    // Draw black overlay in screen coordinates (not world coordinates)
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
    
    // Draw message in screen coordinates
    if (this.showMessage) {
      ctx.save();
      ctx.globalAlpha = this.messageAlpha;
      ctx.fillStyle = "#ffffff";
      ctx.font = "48px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Shitter down", ctx.canvas.width / 2, ctx.canvas.height / 2);
      ctx.restore();
    }
  }
} 