import {Sprite} from "../../Sprite.js";
import {Vector2} from "../../Vector2.js";

export class FlashOverlay extends Sprite {
  constructor({ width, height, duration = 120, color = "#FF0000", alpha = 0.4 }) {
    super({ resource: { isLoaded: true }, frameSize: new Vector2(width, height) });
    this.width = width;
    this.height = height;
    this.duration = duration;
    this.elapsed = 0;
    this.position = new Vector2(0, 0);
    this.color = color;
    this.alpha = alpha;
  }
  step(delta) {
    this.elapsed += delta;
    if (this.elapsed >= this.duration) {
      this.destroy();
    }
  }
  drawImage(ctx, x, y) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(x, y, this.width, this.height);
    ctx.restore();
  }
}


