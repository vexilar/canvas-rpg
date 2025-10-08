import {GameObject} from "../../GameObject.js";
import {Sprite} from "../../Sprite.js";
import {resources} from "../../Resource.js";
import {Vector2} from "../../Vector2.js";
import {DESIGN_WIDTH} from "../../helpers/grid.js";

export class TurnOrderCarousel extends GameObject {
  constructor({ battle }) {
    super({});
    this.battle = battle;
    this.drawLayer = "HUD";

    this.heroIcon = new Sprite({
      resource: resources.images.hero,
      frameSize: new Vector2(32, 32),
      hFrames: 3,
      vFrames: 8,
      frame: 4,
      scale: 0.5
    });
    this.baddyIcon = new Sprite({
      resource: resources.images.baddy,
      frameSize: new Vector2(48, 48),
      hFrames: 6,
      vFrames: 1,
      frame: 1,
      scale: 0.4
    });

    this.padding = 4;
    this.cellSize = 20;
    this.gap = 2;
  }

  drawImage(ctx, x, y) {
    const turns = this.battle?.getUpcomingTurns(5) ?? [];
    if (turns.length === 0) return;

    const totalWidth = turns.length * this.cellSize + (turns.length - 1) * this.gap;
    const baseX = DESIGN_WIDTH - this.padding - totalWidth;
    const baseY = this.padding;

    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#000";
    ctx.fillRect(baseX - 2, baseY - 2, totalWidth + 4, this.cellSize + 4);
    ctx.restore();

    turns.forEach((who, i) => {
      const cellX = baseX + i * (this.cellSize + this.gap);
      const cellY = baseY;

      const icon = who === "hero" ? this.heroIcon : this.baddyIcon;
      const w = icon.frameSize.x * icon.scale;
      const h = icon.frameSize.y * icon.scale;
      const iconX = Math.round(cellX + (this.cellSize - w) / 2);
      const iconY = Math.round(cellY + (this.cellSize - h) / 2);

      icon.drawImage(ctx, iconX, iconY);
    });
  }
}


