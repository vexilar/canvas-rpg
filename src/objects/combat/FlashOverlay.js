import {Sprite} from "../../Sprite.js";
import {Vector2} from "../../Vector2.js";

export class FlashOverlay extends Sprite {
  constructor({ width, height, duration = 120 }) {
    super({ resource: { isLoaded: true }, frameSize: new Vector2(width, height) });
    this.width = width;
    this.height = height;
    this.duration = duration;
    this.elapsed = 0;
    this.position = new Vector2(0, 0);
  }
  step(delta) {
    this.elapsed += delta;
    if (this.elapsed >= this.duration) {
      this.destroy();
    }
  }
  drawImage(ctx, x, y) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#FF0000";
    ctx.fillRect(x, y, this.width, this.height);
    ctx.restore();
  }
}


