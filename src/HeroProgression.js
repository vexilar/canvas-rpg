import { events } from "./Events.js";

/**
 * HeroProgression class manages the hero's leveling and experience system.
 * This state persists across level changes and battle scenes.
 */
export class HeroProgression {
  constructor(initialLevel = 1, initialExperience = 0) {
    this._level = initialLevel;
    this._experience = initialExperience;
    this._experienceToNextLevel = this.calculateExperienceToNextLevel(initialLevel);
    this._position = null; // Will be set when transitioning levels
  }

  // Getters
  get level() {
    return this._level;
  }

  get experience() {
    return this._experience;
  }

  get experienceToNextLevel() {
    return this._experienceToNextLevel;
  }

  get position() {
    return this._position;
  }

  set position(value) {
    this._position = value;
  }

  /**
   * Calculate the experience needed for a given level
   */
  calculateExperienceToNextLevel(level) {
    // Starting from level 1: 1000 XP
    // Each level requires 1.5x more than the previous
    let xp = 1000;
    for (let i = 1; i < level; i++) {
      xp = Math.floor(xp * 1.5);
    }
    return xp;
  }

  /**
   * Add experience points and handle level ups
   */
  addExperience(amount) {
    this._experience += amount;
    console.log(`Hero gained ${amount} experience! Total: ${this._experience}`);

    // Check for level up(s)
    while (this._experience >= this._experienceToNextLevel) {
      this._levelUp();
    }

    // Emit event for UI updates
    events.emit("HERO_EXPERIENCE_CHANGED", {
      experience: this._experience,
      experienceToNextLevel: this._experienceToNextLevel,
      level: this._level
    });

    return this._level; // Return current level in case it changed
  }

  /**
   * Internal method to handle leveling up
   */
  _levelUp() {
    const excessExperience = this._experience - this._experienceToNextLevel;
    this._experience = excessExperience;
    this._level += 1;

    // Increase experience needed for next level
    this._experienceToNextLevel = Math.floor(this._experienceToNextLevel * 1.5);

    console.log(`Hero leveled up to level ${this._level}!`);
    events.emit("HERO_LEVEL_UP", { level: this._level });
  }

  /**
   * Reset progression to initial state
   */
  reset() {
    this._level = 1;
    this._experience = 0;
    this._experienceToNextLevel = 1000;
    this._position = null;
    
    console.log("Hero progression reset to level 1");
  }

  /**
   * Sync progression data from a hero object
   */
  syncFromHero(hero) {
    if (!hero) return;
    
    this._level = hero.level;
    this._experience = hero.experience;
    this._experienceToNextLevel = hero.experienceToNextLevel;
    
    if (hero.position) {
      this._position = hero.position.duplicate();
    }
  }

  /**
   * Apply progression data to a hero object
   */
  applyToHero(hero) {
    if (!hero) return;
    
    hero.level = this._level;
    hero.experience = this._experience;
    hero.experienceToNextLevel = this._experienceToNextLevel;
    
    // Update experience bar if it exists
    if (hero.experienceBar) {
      hero.experienceBar.setExperience(this._experience, this._experienceToNextLevel);
    }
  }

  /**
   * Get a snapshot of the current progression state as a plain object
   * Useful for serialization or passing to constructors
   */
  toJSON() {
    return {
      level: this._level,
      experience: this._experience,
      experienceToNextLevel: this._experienceToNextLevel,
      position: this._position
    };
  }

  /**
   * Create a HeroProgression instance from a plain object
   */
  static fromJSON(data) {
    const progression = new HeroProgression(data.level || 1, data.experience || 0);
    progression._experienceToNextLevel = data.experienceToNextLevel || progression._experienceToNextLevel;
    progression._position = data.position || null;
    return progression;
  }
}

