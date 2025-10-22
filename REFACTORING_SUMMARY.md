# Architecture Refactoring Summary

## Overview
Major architectural refactoring to improve separation of concerns and eliminate tight coupling between scenes and game entities. The hero and enemies are now managed centrally rather than being recreated in each scene.

## Key Changes

### 1. Hero Instantiation
**Before:** Each scene (CaveLevel1, OutdoorLevel1, BattleScene) created its own Hero instance.

**After:** Hero is instantiated once in `Main.js` and passed to all scenes.

- Hero now accepts `HeroProgression` in its constructor for composition
- Hero persists across level changes
- Scenes receive the hero via `Main.setLevel()`

### 2. Enemy Management
**Before:** Each scene manually created and tracked enemies, with no persistent state.

**After:** Created `EnemyManager` class to handle all enemy spawning and tracking.

**Benefits:**
- Centralized enemy state management
- Automatic tracking of defeated enemies by unique keys
- Enemies persist across level transitions (defeated enemies don't respawn)
- Simple API: `enemyManager.spawnEnemy(key, x, y, options)`

### 3. Fireball System Removed
All fireball-related code has been removed from `CaveLevel1.js`:
- Mouse click event listeners
- Fireball sprite creation and tracking
- Fireball-baddy collision detection
- Explosion effects on fireball hits

### 4. Level Construction Simplified
**Before:**
```javascript
// CaveLevel1 constructor
const hero = new Hero(x, y);
// ... apply progression state
// ... configure hero
this.addChild(hero);

const baddy = new Baddy(x, y, options);
this.addChild(baddy);
this.baddies.push(baddy);
```

**After:**
```javascript
// CaveLevel1 ready()
// Hero provided by Main
if (this.hero && !this.children.includes(this.hero)) {
  this.addChild(this.hero);
}

// Enemies managed by EnemyManager
const baddy = this.enemyManager.spawnEnemy("cave_baddy_1", 20, 20, {
  health: 100,
  maxHealth: 100,
  // ... options
});
if (baddy) this.addChild(baddy);
```

### 5. Event System Updates
Level changes now use a structured object format:
```javascript
events.emit("CHANGE_LEVEL", {
  level: new CaveLevel1(),
  heroPosition: new Vector2(x, y)
});
```

This allows Main to:
- Update hero position before level transition
- Sync progression state from hero
- Pass hero and enemy manager to the new level

## New Files

### `src/EnemyManager.js`
Manages enemy spawning, tracking, and persistence:
- `spawnEnemy(key, x, y, options)` - Spawn an enemy at coordinates
- `markDefeated(key)` - Mark an enemy as permanently defeated
- `isDefeated(key)` - Check if an enemy was defeated
- `getEnemies()` - Get all active enemies
- `reset()` - Reset for game restart

## Modified Files

### `src/objects/Hero/Hero.js`
- Constructor now accepts `heroProgression` as third parameter
- Hero stores reference to progression: `this.progression`
- `gainExperience()` delegates to `progression.addExperience()`
- No longer directly handles level-up logic (delegated to HeroProgression)

### `src/objects/Main/Main.js`
- Constructor now accepts `heroProgression` and `initialHeroPosition`
- Creates single Hero instance that persists across levels
- Creates EnemyManager instance
- `setLevel()` now passes hero and enemyManager to levels
- CHANGE_LEVEL handler updates hero position and syncs progression

### `main.js`
- Hero instantiated once at startup with initial position
- Enemy manager created in Main
- RESET_GAME handler now resets hero, progression, and enemy manager

### `src/levels/CaveLevel1.js`
- Constructor no longer creates hero or enemies
- `ready()` method receives hero and enemyManager from Main
- Removed all fireball code (mouse handlers, sprite management, collision detection)
- Uses `enemyManager.spawnEnemy()` to create enemies with unique keys
- Simplified collision detection (removed redundant calculations)

### `src/levels/OutdoorLevel1.js`
- Same pattern as CaveLevel1
- Constructor simplified to just create static level elements
- `ready()` receives hero and enemyManager from Main
- Uses enemy manager for spawning

### `src/levels/BattleScene.js`
- Constructor no longer creates hero
- Stores battle-specific position and skills loadout
- `ready()` receives hero from Main and configures it for battle:
  - Moves hero to battle position
  - Applies battle skills
  - Locks movement
- `exitBattle()` marks enemy as defeated in enemy manager
- Cleans up battle-specific hero configuration when exiting

## Architecture Benefits

### 1. **Single Source of Truth**
- Hero instance is the authoritative source of hero state
- Enemy manager is the authoritative source of enemy state
- No more state synchronization issues between scenes

### 2. **Separation of Concerns**
- Main handles entity lifecycle (hero, enemies)
- Scenes handle presentation and interaction
- HeroProgression handles persistence and leveling

### 3. **Reduced Coupling**
- Scenes no longer need to know about progression system
- Battle scene doesn't create its own hero
- Levels don't need battle result objects

### 4. **Easier Testing**
- Can test hero without instantiating scenes
- Can test enemy manager independently
- Can mock Main dependencies easily

### 5. **Better State Management**
- Hero persists naturally (same instance)
- Defeated enemies automatically tracked
- No manual state copying between scenes

## Migration Notes

### Enemy Keys
Enemies must now have unique keys for tracking:
```javascript
// Format: "level_enemytype_number"
enemyManager.spawnEnemy("cave_baddy_1", x, y, options);
enemyManager.spawnEnemy("outdoor_baddy_1", x, y, options);
```

### Level Changes
All level changes must use the new format:
```javascript
events.emit("CHANGE_LEVEL", {
  level: newLevelInstance,
  heroPosition: new Vector2(x, y) // optional
});
```

### Hero Configuration
Battle-specific hero config is now applied in BattleScene.ready():
- Skills loadout
- Position
- Facing direction
- Movement lock

These are cleaned up when exiting battle.

## Future Enhancements

This architecture enables:
- Save/load system (save hero and enemyManager state)
- Multiple heroes (party system)
- Enemy respawn timers
- Quest system tracking defeated enemies
- Enemy AI that persists between encounters
- Level streaming (keep multiple levels in memory)
