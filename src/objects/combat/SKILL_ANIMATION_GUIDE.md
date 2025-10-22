# Skill Animation System Guide

## Overview

The battle system now uses a modular skill animation architecture where each skill's behavior is encapsulated in its own class. The SkillBook handles the creation of animation instances, making it easy to add new skills without cluttering the BattleScene code.

## Architecture

- **SkillAnimation** (base class in `combat/`): Defines the interface all skill animations must implement
- **SkillBook** (in `combat/`): Manages skill data and creates animation instances
- **Skills folder** (`combat/skills/`): Contains all skill animation implementations
  - **BasicAttackSkillAnimation**: Standard dash-forward attack
  - **StarfallSkillAnimation**: Special attack where hero ascends, flashes, then dives down

## Adding a New Skill Animation

### Step 1: Create the Animation Class

Create a new file in `src/objects/combat/skills/` (e.g., `ThunderStrikeSkillAnimation.js`):

```javascript
import {SkillAnimation} from "../SkillAnimation.js";
import {FlashOverlay} from "../FlashOverlay.js";
// ... other imports as needed

export class ThunderStrikeSkillAnimation extends SkillAnimation {
  constructor(params = {}) {
    super(params);
    
    // Define animation phases
    this.phase = "idle"; // idle | charging | strike | retreat
    
    // Animation parameters
    this.chargeDuration = 300; // ms
    this.strikeDuration = 100; // ms
    this.timer = 0;
  }

  start() {
    // Initialize the animation
    this.phase = "charging";
    this.timer = this.chargeDuration;
    this.attacker.body.animations.play("standRight");
    
    // Add charging visual effect
    // ... your effect code here
  }

  step(delta) {
    // Update animation each frame
    switch (this.phase) {
      case "charging":
        this.stepCharging(delta);
        break;
      case "strike":
        this.stepStrike(delta);
        break;
      case "retreat":
        this.stepRetreat(delta);
        break;
    }
    
    return this.isComplete;
  }

  stepCharging(delta) {
    this.timer -= delta;
    if (this.timer <= 0) {
      this.phase = "strike";
      this.timer = this.strikeDuration;
      // Deal damage and effects
      this.dealDamage(this.skill?.attackPower ?? 30);
      // Add lightning effects
    }
  }

  stepStrike(delta) {
    this.timer -= delta;
    if (this.timer <= 0) {
      this.phase = "retreat";
    }
  }

  stepRetreat(delta) {
    // Cleanup and complete
    this.isComplete = true;
    this.cleanup();
  }
}
```

### Step 2: Register in SkillBook

Update `src/objects/combat/SkillBook.js` to add your skill:

```javascript
export class SkillBook {
  static skills = {
    // ... existing skills
    "Thunder Strike": {
      name: "Thunder Strike",
      attackPower: 30,
      cost: 2,
      animationType: "thunderstrike"  // identifier for your animation
    }
  }
  // ...
}
```

### Step 3: Register in SkillBook

Import your new animation class in `src/objects/combat/SkillBook.js`:

```javascript
import {ThunderStrikeSkillAnimation} from "./skills/ThunderStrikeSkillAnimation.js";
```

Then add a case in the `createAnimation()` method's switch statement:

```javascript
static createAnimation(skillName, params) {
  const skill = SkillBook.get(skillName);
  // ... existing params setup ...

  // Add your animation type to the switch
  switch (skill.animationType) {
    case "thunderstrike":
      return new ThunderStrikeSkillAnimation(animParams);
    case "starfall":
      return new StarfallSkillAnimation(animParams);
    case "basic":
    default:
      return new BasicAttackSkillAnimation(animParams);
  }
}
```

That's it! Your new skill animation is now integrated into the battle system. The BattleScene automatically uses `SkillBook.createAnimation()` to instantiate the correct animation class.

## Key Benefits

1. **Separation of Concerns**: Each skill's logic is isolated in its own class
2. **Centralized Management**: SkillBook handles both skill data and animation creation
3. **Easy to Test**: Individual skill animations can be tested independently
4. **Easy to Extend**: Adding new skills only requires changes to SkillBook, not BattleScene
5. **Maintainable**: BattleScene stays clean and focused on battle orchestration
6. **Organized**: All skill animations live in the `combat/skills/` folder

## Available Helper Methods

From the base `SkillAnimation` class:

- `dealDamage(amount)`: Apply damage to the target
- `cleanup()`: Reset attacker to starting position and animation

## Animation Parameters Available

From the constructor params:

- `this.battle`: Reference to the BattleScene
- `this.attacker`: The attacking character (Hero or Baddy)
- `this.target`: The target character
- `this.skill`: The skill data (name, attackPower, etc.)
- `this.attackerStartPosition`: Original position to return to
- `this.targetStartPosition`: Target's position

