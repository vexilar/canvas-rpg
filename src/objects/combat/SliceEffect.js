import {Sprite} from "../../Sprite.js";
import {Vector2} from "../../Vector2.js";

export class SliceEffect extends Sprite {
  constructor({ width, height, duration = 180 }) {
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
    const t = Math.max(0, Math.min(1, this.elapsed / this.duration));
    const thickness = 1 + 3 * (1 - Math.abs(0.5 - t) * 2);
    ctx.save();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + this.width, y + this.height);
    ctx.stroke();

    ctx.strokeStyle = "#FF6B6B";
    ctx.lineWidth = Math.max(1, thickness - 1);
    ctx.beginPath();
    ctx.moveTo(x + 1, y);
    ctx.lineTo(x + this.width, y + this.height - 1);
    ctx.stroke();
    ctx.restore();
  }
}


