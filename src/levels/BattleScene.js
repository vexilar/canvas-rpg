import {Level} from "../objects/Level/Level.js";
import {Sprite} from "../Sprite.js";
import {resources} from "../Resource.js";
import {Vector2} from "../Vector2.js";
import {Hero} from "../objects/Hero/Hero.js";
import {Npc} from "../objects/Npc/Npc.js";
import {Baddy} from "../objects/Baddy/Baddy.js";
import {gridCells, DESIGN_WIDTH, DESIGN_HEIGHT, getGridPos} from "../helpers/grid.js";
import {events} from "../Events.js";
import {getCharacterFrame} from "../objects/SpriteTextString/spriteFontMap.js";
import {OutdoorLevel1} from "./OutdoorLevel1.js";
import {CaveLevel1} from "./CaveLevel1.js";
import {GameObject} from "../GameObject.js";
import {audio} from "../Audio.js";
import {TurnOrderCarousel} from "../objects/combat/TurnOrderCarousel.js";
import {FlashOverlay} from "../objects/combat/FlashOverlay.js";
import {SliceEffect} from "../objects/combat/SliceEffect.js";
import {ParrySparkBurst} from "../objects/combat/ParrySparkBurst.js";
import {FloatingCounterText} from "../objects/combat/FloatingCounterText.js";
import {SkillCross} from "../objects/combat/SkillCross.js";
import {SkillBook} from "../objects/combat/SkillBook.js";

export class BattleScene extends Level {
  constructor(params={}) {
    super({});
    
    // Store global hero state for persistence
    this.globalHeroState = params.globalHeroState;
    
    // Battle background - using a simple background for now
    this.background = new Sprite({
      resource: resources.images.sky, // Using sky as battle background
      frameSize: new Vector2(DESIGN_WIDTH, DESIGN_HEIGHT)
    })

    // Position hero all the way to the left side of the screen, facing right
    const heroBattlePosition = getGridPos(.1, .5);
    // Provide a skills loadout to the hero for battle actions
    const randomNames = [
      "Whirlwind", "Dragon Lunge", "Starfall", "Arc Slice",
      "Meteor Jab", "Gale Thrust", "Echo Cut", "Rune Break"
    ];
    const pick = () => randomNames[Math.floor(Math.random() * randomNames.length)];
    const skillsLoadout = {
      top:    { key: "W", name: "Krakatoa" },
      right:  { key: "D", name: pick() },
      bottom: { key: "X", name: "Starfall" },
      left:   { key: "A", name: pick() },
    };
    const hero = new Hero(heroBattlePosition.x, heroBattlePosition.y, { skills: skillsLoadout });
    
    // Restore hero experience/level from global state if available
    if (this.globalHeroState) {
      hero.level = this.globalHeroState.level || 1;
      hero.experience = this.globalHeroState.experience || 0;
      hero.experienceToNextLevel = this.globalHeroState.experienceToNextLevel || 1000;
      // Update experience bar
      if (hero.experienceBar) {
        hero.experienceBar.setExperience(hero.experience, hero.experienceToNextLevel);
      }
    }
    
    this.addChild(hero);
    this.hero = hero;
    console.log("Battle hero created with health:", this.hero.health, "/", this.hero.maxHealth);

    // Hide experience bar during battle (will show only when enemy dies)
    if (this.hero.experienceBar) {
      this.hero.experienceBar.visible = false;
    }

    // Set hero to face right and disable movement
    this.hero.facingDirection = "RIGHT";
    this.hero.body.animations.play("standRight");
    this.hero.isLocked = true; // Disable movement in battle
    
    // Set heroStartPosition to hero's actual position (for attack animations)
    this.heroStartPosition = heroBattlePosition;

    // Position baddy on the right side of the screen (but not too far right)
    const baddyBattlePosition = getGridPos(.825, .43);
    const baddyOptions = {
      battleMode: true,
      health: params.baddyData?.health || 80,
      maxHealth: params.baddyData?.maxHealth || 80,
      attackPower: params.baddyData?.attackPower || 12
    };
    const baddy = new Baddy(baddyBattlePosition.x, baddyBattlePosition.y, baddyOptions);
    this.addChild(baddy);
    this.baddy = baddy;
    this.baddyStartPosition = baddyBattlePosition;
    console.log("Battle baddy created with health:", this.baddy.health, "/", this.baddy.maxHealth, "attack:", this.baddy.attackPower);
    
    // Calculate the center point between hero and baddy for camera positioning
    const centerX = (heroBattlePosition.x + baddyBattlePosition.x) / 2;
    const centerY = (heroBattlePosition.y + baddyBattlePosition.y) / 2;
    this.battleCameraCenter = new Vector2(centerX, centerY);

    // Store the original level to return to
    this.originalLevel = params.originalLevel || "CaveLevel1";
    
    // Battle state
    this.battleStarted = false;
    this.battleComplete = false;
    this.enemyDefeated = false; // Flag to stop all battle logic when enemy dies

    // Skill points state
    this.skillPoints = 0;

    // Skill animation system (replaces old attack state)
    this.currentSkillAnimation = null; // Active SkillAnimation instance
    this.isAttacking = false;
    
    // Enemy attack animation
    this.enemySkillAnimation = null;
    this.enemyIsAttacking = false;

    // Parry config/state (tweakable)
    this.timeMs = 0; // scene clock in ms
    this.parryPreMs = 80;   // window before impact where Z counts
    this.parryPostMs = 40;   // window after impact where Z still counts
    this.parryDamageMultiplier = 0.0; // 0 = negate damage, 0.5 = half, etc
    this.lastParryPressAt = -Infinity; // timestamp of last Z press
    this.enemyImpactPending = null; // { time, damage }
    this.enemyImpactResolveAt = 0;

    // Initialize walls set (empty for battle scene - no walls to block movement)
    this.walls = new Set();

    // Turn scheduler based on speed
    this.heroInterval = this.hero && this.hero.speed ? (1000 / this.hero.speed) : Infinity;
    this.baddyInterval = this.baddy && this.baddy.speed ? (1000 / this.baddy.speed) : Infinity;
    this.heroNextAt = 0;
    this.baddyNextAt = 0;
    this.turnQueue = [];
    this.ensureTurnQueue(5);
    this.currentTurn = this.turnQueue[0];
    this.turnOrderHUD = null;

    // Skill selection state/UI
    this.skillSelectedKey = null; // one of "W","A","S","D" or null
    this.pendingSkill = null; // selected skill object
    this.skillCross = null;
  }

  ready() {
    // Disable camera follow immediately when battle scene loads
    // This prevents the camera from following hero movements during battle
    events.emit("CAMERA_FOLLOW_ENABLED", false);
    
    // Manually center the camera on the battle center point (between hero and baddy)
    // instead of on the hero's position
    if (this.parent && this.parent.camera && this.battleCameraCenter) {
      this.parent.camera.centerPositionOnTarget(this.battleCameraCenter);
    }
    
    // Listen for battle events
    events.on("BATTLE_COMPLETE", this, () => {
      this.exitBattle();
    });

    // Listen for baddy defeat to award experience (backup in case direct check fails)
    events.on("BADDY_DEFEATED", this, (data) => {
      if (!this.enemyDefeated) {
        this.enemyDefeated = true;
        this.handleEnemyDefeat();
      }
    });
    
    // Listen for hero action requests (Space key)
    events.on("HERO_REQUESTS_ACTION", this, (withObject) => {
      if (withObject === this.baddy && !this.battleStarted) {
        this.startBattle();
      }
    });

    // Attach turn order HUD to Main so it's drawn in screen space
    if (this.parent) {
      this.turnOrderHUD = new TurnOrderCarousel({ battle: this });
      this.turnOrderHUD.drawLayer = "HUD";
      this.parent.addChild(this.turnOrderHUD);
    }

    // Create skill cross UI attached to hero so it follows his position
    if (this.hero) {
      this.skillCross = new SkillCross({ hero: this.hero, battle: this });
      this.hero.addChild(this.skillCross);
      this.skillCross.active = false;
    }

    // Request battle BGM immediately on scene appear
    //audio.playLoop("battleTheme", { volume: 0.45 });

    // Emit initial skill points for HUD
    this.emitSkillPointsChanged();
  }

  startBattle() {
    console.log("Battle started!");
    this.battleStarted = true;
    
    // Show battle message
    console.log("The battle begins! Press C to basic attack!");
    
    // You could emit an event here to show battle UI or text
    events.emit("BATTLE_MESSAGE", "The battle begins! Press C to basic attack!");
  }

  exitBattle() {
    console.log("Exiting battle scene");
    this.battleComplete = true;

    // Hide experience bar when leaving battle
    if (this.hero && this.hero.experienceBar) {
      this.hero.experienceBar.visible = false;
    }

    // Re-enable camera follow when leaving battle
    events.emit("CAMERA_FOLLOW_ENABLED", true);
    // Stop battle BGM with a short fade
    audio.stopLoop("battleTheme", { fadeMs: 160 });
    // Remove HUD if present
    if (this.turnOrderHUD && this.parent) {
      this.parent.removeChild(this.turnOrderHUD);
      this.turnOrderHUD = null;
    }

    // Update global hero state with current hero stats
    if (this.hero && this.globalHeroState) {
      this.globalHeroState.level = this.hero.level;
      this.globalHeroState.experience = this.hero.experience;
      this.globalHeroState.experienceToNextLevel = this.hero.experienceToNextLevel;
    }

    // Prepare battle result data
    const battleResult = {
      baddyDefeated: !this.baddy.isAlive,
      baddyPosition: this.baddy ? this.baddy.position.duplicate() : null,
      heroExperience: this.hero ? {
        level: this.hero.level,
        experience: this.hero.experience,
        experienceToNextLevel: this.hero.experienceToNextLevel
      } : null
    };

    // Return to the original level with battle result data
    if (this.originalLevel === "CaveLevel1") {
      events.emit("CHANGE_LEVEL", new CaveLevel1({
        heroPosition: new Vector2(gridCells(3), gridCells(6)),
        battleResult: battleResult,
        globalHeroState: this.globalHeroState
      }));
    } else if (this.originalLevel === "OutdoorLevel1") {
      events.emit("CHANGE_LEVEL", new OutdoorLevel1({
        heroPosition: new Vector2(gridCells(6), gridCells(5)),
        battleResult: battleResult,
        globalHeroState: this.globalHeroState
      }));
    }
  }

  step(delta, root) {
    // Advance scene clock
    this.timeMs += delta;

    // Stop all battle logic immediately if enemy is defeated
    if (this.enemyDefeated) {
      return;
    }

    // Stop battle logic if enemy is defeated (check state directly)
    if (this.baddy && !this.baddy.isAlive && this.baddy.opacity <= 0) {
      // Set defeated flag if not already set
      if (!this.enemyDefeated) {
        this.enemyDefeated = true;
        // Trigger the defeat logic
        this.handleEnemyDefeat();
      }
      return;
    }


    // Auto trigger enemy when it's their turn and idle (but only if enemy is not fading)
    if (this.battleStarted && !this.isAttacking && !this.enemyIsAttacking && this.currentTurn === "baddy" && !this.baddy.isFadingOut) {
      this.beginEnemyAttack();
    }

    // Determine if we're in hero selection phase (hero's turn and idle)
    const isHeroTurnIdle = !this.isAttacking && !this.enemyIsAttacking && this.currentTurn === "hero";

    // Toggle SkillCross visibility/state (but not if battle is over)
    if (this.skillCross && !this.enemyDefeated) {
      this.skillCross.active = !!isHeroTurnIdle;
      if (!isHeroTurnIdle && this.skillSelectedKey) {
        this.resetSkillSelectionUI();
      }
    }

    // Handle expansion toggle and selection during hero's turn (but not if battle is over)
    if (isHeroTurnIdle && !this.enemyDefeated) {
      const input = root?.input;
      // S toggles expand/collapse of the cross
      if (input?.getActionJustPressed && input.getActionJustPressed("KeyS")) {
        if (this.skillCross) {
          this.skillCross.toggle();
          // Clearing selection when collapsing
          if (!this.skillCross.isExpanded) {
            this.skillSelectedKey = null;
            // Also clear UI selection so translucency is removed
            this.skillCross.setSelected(null);
          }
        }
      }

      // Only allow selecting skills when expanded
      if (this.skillCross?.isExpanded) {
        const selectKeys = ["KeyW", "KeyD", "KeyX", "KeyA"]; // W/D/X/A
        const toLetter = (code) => ({ KeyW: "W", KeyA: "A", KeyX: "X", KeyD: "D" }[code]);
        const anyPressed = selectKeys.find(code => input?.getActionJustPressed && input.getActionJustPressed(code));
        if (anyPressed) {
          const letter = toLetter(anyPressed);
          if (!this.skillSelectedKey) {
            // First press selects and shows the skill
            this.skillSelectedKey = letter;
            if (this.skillCross) this.skillCross.setSelected(letter);
          } else if (this.skillSelectedKey === letter) {
            // Second press confirms -> begin attack using that skill
            const skill = this.getSkillForLetter(letter);
            const cost = SkillBook.get(skill?.name)?.cost ?? 1;
            if (cost <= this.skillPoints) {
              // Spend and update HUD
              this.skillPoints -= cost;
              this.emitSkillPointsChanged();
              this.pendingSkill = skill;
              this.beginHeroAttack();
            } else {
              // Not enough points: ignore confirm
            }
          } else {
            // Change selection to a different letter
            this.skillSelectedKey = letter;
            if (this.skillCross) this.skillCross.setSelected(letter);
          }
        }
      }
    }

    // KeyC triggers hero basic attack only on hero's turn (but not if battle is over)
    const input = root?.input;
    if (input?.getActionJustPressed && input.getActionJustPressed("KeyC") && !this.isAttacking && !this.enemyIsAttacking && this.currentTurn === "hero" && !this.enemyDefeated) {
      if (!this.battleStarted) {
        this.startBattle();
      }
      // Basic attack
      this.pendingSkill = null; // resolves to Basic
      this.beginHeroAttack();
    }

    // Process hero attack animation when active
    if (this.isAttacking && this.currentSkillAnimation) {
      const isComplete = this.currentSkillAnimation.step(delta);
      if (isComplete) {
        // Animation finished
        this.isAttacking = false;
        this.currentSkillAnimation = null;
        // Reset selection/UI and advance to enemy turn (but not if battle is over)
        this.resetSkillSelectionUI();
        if (!this.enemyDefeated) {
          this.consumeTurn();
          if (this.currentTurn === "baddy") {
            this.beginEnemyAttack();
          }
        }
      }
    }

    // Enemy attack processing (but not if battle is over)
    if (this.enemyIsAttacking && !this.enemyDefeated) {
      // Stop enemy attack if enemy just died during animation
      if (this.baddy && !this.baddy.isAlive) {
        this.enemyIsAttacking = false;
        if (this.enemySkillAnimation) {
          this.enemySkillAnimation = null;
        }
        // Don't consume turn since battle is over
        return;
      }
      // If parry freeze active, hold enemy in place and skip animation
      if (this.enemyParried) {
        this.enemyParryFreezeTimer -= delta;
        // Keep enemy at impact position and idle anim
        this.baddy.sprite.animations.play("standLeft");
        if (this.enemyParryFreezeTimer <= 0) {
          // Apply counter damage to baddy, then let animation complete
          const w = this.baddy.sprite.frameSize.x * (this.baddy.sprite.scale ?? 1);
          const h = this.baddy.sprite.frameSize.y * (this.baddy.sprite.scale ?? 1);
          const flash = new FlashOverlay({ width: w, height: h, duration: 120 });
          const slice = new SliceEffect({ width: w, height: h, duration: 160 });
          this.baddy.addChild(flash);
          this.baddy.addChild(slice);
          this.baddy.takeDamage(this.parryCounterDamage ?? 8);
          this.enemyParried = false;
          // Continue animation retreat phase (but not if baddy is dead/fading)
          if (!this.baddy.isFadingOut && this.baddy.isAlive) {
            this.baddy.sprite.animations.play("walkRight");
          }
        }
      } else if (this.enemySkillAnimation) {
        // Run enemy skill animation
        const isComplete = this.enemySkillAnimation.step(delta);
        
        // Check for impact phase to trigger parry window
        if (this.enemySkillAnimation.phase === "impact" && !this.enemyImpactPending) {
          // Schedule impact resolution with parry window around now
          const dmg = this.baddy.attackPower ?? 12;
          this.enemyImpactPending = { time: this.timeMs, damage: dmg };
          this.enemyImpactResolveAt = this.timeMs + 60; // slight delay to allow post window frames
        }
        
        if (isComplete) {
          // Animation finished
          this.enemyIsAttacking = false;
          this.enemySkillAnimation = null;
          // Advance to next (hero) turn (but not if battle is over)
          if (!this.enemyDefeated) {
            this.consumeTurn();
          }
        }
      }
    }

    // Capture parry input (Z key) (but not if battle is over)
    if (input?.getActionJustPressed && input.getActionJustPressed("KeyZ") && !this.enemyDefeated) {
      this.lastParryPressAt = this.timeMs;
    }

    // Resolve pending enemy impact considering parry window (but not if battle is over)
    if (this.enemyImpactPending && !this.enemyDefeated) {
      const impactTime = this.enemyImpactPending.time;
      const parryOk = (this.lastParryPressAt >= (impactTime - this.parryPreMs)) && (this.lastParryPressAt <= (impactTime + this.parryPostMs));
      if (parryOk) {
        // Successful parry: effects + mitigate damage
        const mitigated = Math.round(this.enemyImpactPending.damage * this.parryDamageMultiplier);
        this.doParryEffectsOnHero();
        // Award a skill point on successful parry
        this.skillPoints += 1;
        this.emitSkillPointsChanged();
        if (mitigated > 0) {
          this.hero.takeDamage(mitigated, this.baddy.position, this.heroStartPosition);
        }
        this.enemyImpactPending = null;
      } else if (this.timeMs >= this.enemyImpactResolveAt) {
        // Window has passed with no parry: apply full damage
        console.log("Applying enemy damage:", this.enemyImpactPending.damage, "Hero health before:", this.hero.health);
        this.hero.takeDamage(this.enemyImpactPending.damage, this.baddy.position, this.heroStartPosition);
        console.log("Hero health after:", this.hero.health);
        this.enemyImpactPending = null;
      }
    }
  }

  doHitEffectsOnHero() {
    // Visual hit effects at impact moment; damage is now resolved via parry logic
    const w = this.hero.body.frameSize.x * (this.hero.body.scale ?? 1);
    const h = this.hero.body.frameSize.y * (this.hero.body.scale ?? 1);
    // Offset effects slightly up-left so they appear centered over the hero sprite
    const fxContainer = new GameObject({ position: new Vector2(-6, -12) });
    const flash = new FlashOverlay({ width: w, height: h, duration: 150 });
    const slice = new SliceEffect({ width: w, height: h, duration: 180 });
    fxContainer.addChild(flash);
    fxContainer.addChild(slice);
    this.hero.addChild(fxContainer);
  }

  doParryEffectsOnHero() {
    // Parry spark burst and sound
    audio.playParryChing(0.9);
    const w = this.hero.body.frameSize.x * (this.hero.body.scale ?? 1);
    const h = this.hero.body.frameSize.y * (this.hero.body.scale ?? 1);
    const fx = new ParrySparkBurst({ width: w, height: h, duration: 240 });
    this.hero.addChild(fx);

    // Freeze enemy briefly and schedule counter
    this.enemyParried = true;
    this.enemyParryFreezeTimer = 220;
    // Pause enemy animation
    this.baddy.sprite.animations.play("standLeft");
    // Show floating "COUNTER" text above baddy
    const label = new FloatingCounterText({ text: "COUNTER", duration: 600 });
    this.baddy.addChild(label);
  }

  beginEnemyAttack() {
    this.enemyIsAttacking = true;
    // Enemy always uses basic attack for now
    this.enemySkillAnimation = SkillBook.createAnimation("Basic", {
      battle: this,
      attacker: this.baddy,
      target: this.hero,
      attackerStartPosition: this.baddyStartPosition,
      targetStartPosition: this.heroStartPosition,
      applyDamageOnImpact: false  // Damage is handled by parry system
    });
    this.enemySkillAnimation.start();
  }

  // Scheduler helpers
  ensureTurnQueue(n = 5) {
    while (this.turnQueue.length < n) {
      if (this.enemyDefeated) {
        // Only add hero turns if enemy is defeated
        this.turnQueue.push("hero");
        this.heroNextAt += this.heroInterval;
      } else if (this.heroNextAt <= this.baddyNextAt) {
        this.turnQueue.push("hero");
        this.heroNextAt += this.heroInterval;
      } else {
        this.turnQueue.push("baddy");
        this.baddyNextAt += this.baddyInterval;
      }
    }
  }

  getUpcomingTurns(n = 5) {
    this.ensureTurnQueue(n);
    return this.turnQueue.slice(0, n);
  }

  consumeTurn() {
    this.turnQueue.shift();
    this.ensureTurnQueue(5);
    this.currentTurn = this.turnQueue[0];
    // Ensure skill tree is collapsed at the start of hero turns
    if (this.currentTurn === "hero" && this.skillCross) {
      this.skillSelectedKey = null;
      this.pendingSkill = null;
      this.skillCross.collapseImmediate();
      this.skillCross.setSelected(null);
    }
  }

  beginHeroAttack() {
    // Ensure battle state is initialized on first confirm
    if (!this.battleStarted) {
      this.startBattle();
    }
    // Resolve skill from selection; fallback to basic
    const selectedName = this.pendingSkill?.name ?? "Basic";
    const resolvedSkill = SkillBook.get(selectedName);

    // Award a skill point for using a basic attack
    if (resolvedSkill.animationType === "basic") {
      this.skillPoints += 1;
      this.emitSkillPointsChanged();
    }

    // Create skill animation using SkillBook
    this.currentSkillAnimation = SkillBook.createAnimation(selectedName, {
      battle: this,
      attacker: this.hero,
      target: this.baddy,
      attackerStartPosition: this.heroStartPosition,
      targetStartPosition: this.baddyStartPosition
    });

    // Begin attack
    this.isAttacking = true;
    this.hero.facingDirection = "RIGHT";
    this.currentSkillAnimation.start();
  }

  resetSkillSelectionUI() {
    this.skillSelectedKey = null;
    this.pendingSkill = null;
    if (this.skillCross) this.skillCross.reset();
  }

  getSkillForLetter(letter) {
    const skillMap = {
      W: this.hero?.skills?.top,
      D: this.hero?.skills?.right,
      X: this.hero?.skills?.bottom,
      A: this.hero?.skills?.left,
    };
    return skillMap[letter] ?? null;
  }

  emitSkillPointsChanged() {
    events.emit("SKILL_POINTS_CHANGED", { count: this.skillPoints });
  }

  handleEnemyDefeat() {
    // Immediately stop any ongoing enemy actions
    this.enemyIsAttacking = false;
    if (this.enemySkillAnimation) {
      this.enemySkillAnimation = null;
    }

    if (this.hero) {
      // Award experience first
      this.hero.gainExperience(this.baddy.experiencePoints);

      // Show experience bar after experience is gained
      if (this.hero.experienceBar) {
        this.hero.experienceBar.visible = true;
      }

      this.showExperienceGain(this.baddy.experiencePoints);
    }

    // Clean up battle UI elements immediately when enemy is defeated
    if (this.skillCross) {
      this.skillCross.active = false;
    }

    // Mark battle as complete after a short delay to show experience animation
    setTimeout(() => {
      this.battleComplete = true;
      events.emit("BATTLE_COMPLETE");
    }, 2000); // 2 second delay
  }

  showExperienceGain(experiencePoints) {
    // Create floating experience text above the hero
    const experienceText = new FloatingCounterText({
      text: `+${experiencePoints} XP`,
      duration: 1500,
      color: "#00FFFF" // Cyan color for experience
    });
    this.hero.addChild(experienceText);
  }
}
 
