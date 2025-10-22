import {GameObject} from "./GameObject.js";
import {Vector2} from "./Vector2.js";

export class ExperienceBar extends GameObject {
  constructor(maxExperience = 100, offsetX = 25, offsetY = -2) {
    super({});

    this.maxExperience = maxExperience;
    this.currentExperience = 0;
    this.width = 40; // Same width as health bar
    this.height = 4; // Smaller than health bar
    this.offsetY = offsetY || -2; // Position slightly below health bar
    this.offsetX = offsetX || 25;
    this.visible = true; // Experience bar is visible by default

    // Set position to be below the health bar
    this.position = new Vector2(0, this.offsetY);
  }

  setExperience(currentExperience, maxExperience) {
    this.currentExperience = Math.max(0, currentExperience);
    this.maxExperience = maxExperience;
  }

  getExperiencePercentage() {
    return this.currentExperience / this.maxExperience;
  }

  draw(ctx, x, y) {
    // Only draw if visible
    if (!this.visible) {
      return;
    }

    // Position the experience bar below the health bar
    const barX = x - (this.width / 2) + this.offsetX; // Center the bar
    const barY = y + this.offsetY; // Position below health bar

    // Draw background (dark blue)
    ctx.fillStyle = '#001122';
    ctx.fillRect(barX, barY, this.width, this.height);

    // Draw border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = .5;
    ctx.strokeRect(barX, barY, this.width, this.height);

    // Draw experience bar
    const experienceWidth = (this.width - 4) * this.getExperiencePercentage();
    if (experienceWidth > 0) {
      // Blue color for experience
      ctx.fillStyle = '#0088FF';
      ctx.fillRect(barX + 2, barY + 1, experienceWidth, this.height - 2);
    }
  }
}
