import {GameObject} from "../../GameObject.js";

export class FloatingCounterText extends GameObject {
  constructor({ text = "COUNTER", duration = 600 }) {
    super({});
    this.text = text.toUpperCase();
    this.duration = duration;
    this.elapsed = 0;
    this.offsetY = -28;
  }
  step(delta) {
    this.elapsed += delta;
    this.offsetY -= 0.04 * delta;
    if (this.elapsed >= this.duration) {
      this.destroy();
    }
  }
  drawImage(ctx, x, y) {
    const t = Math.max(0, Math.min(1, this.elapsed / this.duration));
    const alpha = 1 - t;
    ctx.save();
    ctx.globalAlpha = Math.max(0.001, alpha);
    ctx.fillStyle = "#000000";
    ctx.font = "bold 8px 'Retro Gaming', monospace";
    ctx.textBaseline = "top";
    ctx.fillText(this.text, x + 2, y + this.offsetY + 1);
    ctx.fillStyle = "#FFE08A";
    ctx.fillText(this.text, x + 1, y + this.offsetY);
    ctx.restore();
  }
}


