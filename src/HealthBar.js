import {GameObject} from "./GameObject.js";
import {Vector2} from "./Vector2.js";

export class HealthBar extends GameObject {
  constructor(maxHealth = 100, offsetX = 25, offsetY = -10) {
    super({});
    
    this.maxHealth = maxHealth;
    this.currentHealth = maxHealth;
    this.width = 40; // Back to reasonable size
    this.height = 6; // Back to reasonable size
    this.offsetY = offsetY || -10; // Position below the sprite (visible on screen)
    this.offsetX = offsetX || 25;
    
    // Set position to be above the parent sprite
    this.position = new Vector2(0, this.offsetY);
  }

  setHealth(currentHealth) {
    this.currentHealth = Math.max(0, Math.min(currentHealth, this.maxHealth));
  }

  getHealthPercentage() {
    return this.currentHealth / this.maxHealth;
  }

  draw(ctx, x, y) {
    // Position the health bar above the baddy
    const barX = x - (this.width / 2) + this.offsetX; // Center the bar above the sprite
    const barY = y + this.offsetY; // Position above the sprite
    
    //console.log("Drawing health bar at:", barX, barY, "with health:", this.currentHealth, "parent pos:", x, y); // Debug
    
    // Draw background (dark gray)
    ctx.fillStyle = '#333333';
    ctx.fillRect(barX, barY, this.width, this.height);
    
    // Draw border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = .5;
    ctx.strokeRect(barX, barY, this.width, this.height);
    
    // Draw health bar
    const healthWidth = (this.width - 4) * this.getHealthPercentage();
    if (healthWidth > 0) {
      // Color based on health percentage
      let color;
      const percentage = this.getHealthPercentage();
      if (percentage > 0.6) {
        color = '#00FF00'; // Green
      } else if (percentage > 0.3) {
        color = '#FFFF00'; // Yellow
      } else {
        color = '#FF0000'; // Red
      }
      
      ctx.fillStyle = color;
      ctx.fillRect(barX + 2, barY + 2, healthWidth, this.height - 4);
    }
  }
} 