import { GameObject } from "./GameObject.js";
import { Baddy } from "./objects/Baddy/Baddy.js";
import { Vector2 } from "./Vector2.js";

/**
 * EnemyManager handles spawning and managing enemies in a scene
 */
export class EnemyManager extends GameObject {
  constructor() {
    super({});
    this.enemies = [];
    this.defeatedEnemies = new Set(); // Track defeated enemies by key
  }

  /**
   * Spawn an enemy at the given coordinates
   * @param {string} enemyKey - Unique key for this enemy (e.g., "cave_baddy_1")
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {object} options - Enemy configuration (health, attackPower, etc.)
   * @returns {Baddy} The spawned enemy
   */
  spawnEnemy(enemyKey, x, y, options = {}) {
    // Check if this enemy was already defeated
    if (this.defeatedEnemies.has(enemyKey)) {
      console.log(`Enemy ${enemyKey} already defeated, not spawning`);
      return null;
    }

    const enemy = new Baddy(x, y, {
      battleMode: false,
      health: options.health || 80,
      maxHealth: options.maxHealth || 80,
      attackPower: options.attackPower || 12,
      experiencePoints: options.experiencePoints || 50,
      aggroRange: options.aggroRange ?? 0, // Default: no chasing
      moveSpeed: options.moveSpeed ?? 0, // Default: stationary
      ...options
    });

    // Store the key on the enemy for tracking
    enemy.enemyKey = enemyKey;
    
    this.enemies.push(enemy);
    return enemy;
  }

  /**
   * Mark an enemy as defeated
   * @param {string} enemyKey - Key of the defeated enemy
   */
  markDefeated(enemyKey) {
    this.defeatedEnemies.add(enemyKey);
    console.log(`Enemy ${enemyKey} marked as defeated`);
  }

  /**
   * Remove an enemy from the active list
   * @param {Baddy} enemy - The enemy to remove
   */
  removeEnemy(enemy) {
    const index = this.enemies.indexOf(enemy);
    if (index !== -1) {
      this.enemies.splice(index, 1);
      
      // Mark as defeated if it has a key
      if (enemy.enemyKey) {
        this.markDefeated(enemy.enemyKey);
      }
    }
  }

  /**
   * Get all active enemies
   * @returns {Baddy[]}
   */
  getEnemies() {
    return this.enemies;
  }

  /**
   * Clear all enemies (useful when changing levels)
   */
  clearEnemies() {
    this.enemies = [];
  }

  /**
   * Check if an enemy was defeated
   * @param {string} enemyKey - Key of the enemy to check
   * @returns {boolean}
   */
  isDefeated(enemyKey) {
    return this.defeatedEnemies.has(enemyKey);
  }

  /**
   * Reset all defeated enemies (for game reset)
   */
  reset() {
    this.defeatedEnemies.clear();
    this.enemies = [];
    console.log("Enemy manager reset");
  }
}

