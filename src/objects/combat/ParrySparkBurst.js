import {Sprite} from "../../Sprite.js";
import {Vector2} from "../../Vector2.js";

export class ParrySparkBurst extends Sprite {
  constructor({ width, height, duration = 180 }) {
    super({ resource: { isLoaded: true }, frameSize: new Vector2(width, height) });
    this.width = width;
    this.height = height;
    this.duration = duration;
    this.elapsed = 0;
    this.sparks = this._makeSparks();
  }
  _makeSparks() {
    const sparks = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 0.18 + Math.random() * 0.14;
      sparks.push({ angle, speed });
    }
    return sparks;
  }
  step(delta) {
    this.elapsed += delta;
    if (this.elapsed >= this.duration) {
      this.destroy();
    }
  }
  drawImage(ctx, x, y) {
    const t = Math.max(0, Math.min(1, this.elapsed / this.duration));
    const cx = x + Math.floor(this.width / 2);
    const cy = y + Math.floor(this.height / 2) - 12;
    ctx.save();
    ctx.globalAlpha = 0.85 * (1 - t);
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(cx, cy, 6 * (1 - t), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0 * (1 - t * 0.9);
    ctx.strokeStyle = "#FFF3B0";
    ctx.lineWidth = 1.5;
    for (const s of this.sparks) {
      const dist = (t * 26) * s.speed / 0.3;
      const sx = cx + Math.cos(s.angle) * dist;
      const sy = cy + Math.sin(s.angle) * dist;
      const ex = cx + Math.cos(s.angle) * (dist + 5);
      const ey = cy + Math.sin(s.angle) * (dist + 5);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    ctx.restore();
  }
}


