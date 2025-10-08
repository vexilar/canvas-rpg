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
      top:    { key: "W", name: pick() },
      right:  { key: "D", name: pick() },
      bottom: { key: "X", name: "Starfall" },
      left:   { key: "A", name: pick() },
    };
    const hero = new Hero(heroBattlePosition.x, heroBattlePosition.y, { skills: skillsLoadout });
    this.addChild(hero);
    this.hero = hero;
    
    // Set hero to face right and disable movement
    this.hero.facingDirection = "RIGHT";
    this.hero.body.animations.play("standRight");
    this.hero.isLocked = true; // Disable movement in battle
    
    // Set heroStartPosition for camera centering
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

    // Store the original level to return to
    this.originalLevel = params.originalLevel || "CaveLevel1";
    
    // Battle state
    this.battleStarted = false;
    this.battleComplete = false;

    // Skill points state
    this.skillPoints = 0;

    // Attack state
    this.isAttacking = false;
    this.attackPhase = "idle"; // idle | dashing | impact | retreat
    this.attackSpeed = 0; // px/ms
    this.attackAccel = 0.01; // px/ms^2
    this.attackMaxSpeed = 0.35; // px/ms
    this.retreatFriction = 0.92;
    this.attackTargetX = null;
    this.impactTimer = 0;

    // Resolved skill and starfall state
    this.resolvedSkill = null; // { name, attackPower, animationType }
    this.starfallPhase = "idle"; // idle | ascend | flash | dive | impact | retreat
    this.starfallAscendHeight = 28;
    this.starfallAscendSpeed = 0.12; // px/ms
    this.starfallDiveSpeed = 0.5; // px/ms
    this.starfallImpactTimer = 0;

    // Enemy attack state (mirrored)
    this.enemyIsAttacking = false;
    this.enemyAttackPhase = "idle";
    this.enemyAttackSpeed = 0;
    this.enemyAttackMaxSpeed = 0.35;
    this.enemyAttackTargetX = null;
    this.enemyImpactTimer = 0;

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
    // Listen for battle events
    events.on("BATTLE_COMPLETE", this, () => {
      this.exitBattle();
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
    // Disable camera follow during battle to prevent jitter from knockback
    events.emit("CAMERA_FOLLOW_ENABLED", false);
    
    // Show battle message
    console.log("The battle begins! Press C to basic attack!");
    
    // You could emit an event here to show battle UI or text
    events.emit("BATTLE_MESSAGE", "The battle begins! Press C to basic attack!");
  }

  exitBattle() {
    console.log("Exiting battle scene");
    this.battleComplete = true;
    // Re-enable camera follow when leaving battle
    events.emit("CAMERA_FOLLOW_ENABLED", true);
    // Stop battle BGM with a short fade
    audio.stopLoop("battleTheme", { fadeMs: 160 });
    // Remove HUD if present
    if (this.turnOrderHUD && this.parent) {
      this.parent.removeChild(this.turnOrderHUD);
      this.turnOrderHUD = null;
    }
    
    // Return to the original level
    if (this.originalLevel === "CaveLevel1") {
      events.emit("CHANGE_LEVEL", new CaveLevel1({
        heroPosition: new Vector2(gridCells(3), gridCells(6))
      }));
    } else if (this.originalLevel === "OutdoorLevel1") {
      events.emit("CHANGE_LEVEL", new OutdoorLevel1({
        heroPosition: new Vector2(gridCells(6), gridCells(5))
      }));
    }
  }

  step(delta, root) {
    // Advance scene clock
    this.timeMs += delta;

    // Auto trigger enemy when it's their turn and idle
    if (this.battleStarted && !this.isAttacking && !this.enemyIsAttacking && this.currentTurn === "baddy") {
      this.beginEnemyAttack();
    }

    // Determine if we're in hero selection phase (hero's turn and idle)
    const isHeroTurnIdle = !this.isAttacking && !this.enemyIsAttacking && this.currentTurn === "hero";

    // Toggle SkillCross visibility/state
    if (this.skillCross) {
      this.skillCross.active = !!isHeroTurnIdle;
      if (!isHeroTurnIdle && this.skillSelectedKey) {
        this.resetSkillSelectionUI();
      }
    }

    // Handle expansion toggle and selection during hero's turn
    if (isHeroTurnIdle) {
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

    // KeyC triggers hero basic attack only on hero's turn
    const input = root?.input;
    if (input?.getActionJustPressed && input.getActionJustPressed("KeyC") && !this.isAttacking && !this.enemyIsAttacking && this.currentTurn === "hero") {
      if (!this.battleStarted) {
        this.startBattle();
      }
      // Basic attack
      this.pendingSkill = null; // resolves to Basic
      this.beginHeroAttack();
    }

    // Process hero attack movement when active
    if (this.isAttacking && this.resolvedSkill?.animationType === "starfall") {
      // Starfall sequence handling
      if (this.starfallPhase === "ascend") {
        // Move up until reached ascend height
        const targetY = this.heroStartPosition.y - this.starfallAscendHeight;
        const stepY = this.starfallAscendSpeed * delta;
        this.hero.position.y = Math.max(targetY, this.hero.position.y - stepY);
        this.hero.body.animations.play("walkUp");
        if (this.hero.position.y <= targetY + 0.001) {
          // Begin brief yellow flash
          this.starfallPhase = "flash";
          this.starfallImpactTimer = 180;
          this.hero.body.animations.play("standRight");
          const w = this.hero.body.frameSize.x * (this.hero.body.scale ?? 1);
          const h = this.hero.body.frameSize.y * (this.hero.body.scale ?? 1);
          const fxContainer = new GameObject({ position: new Vector2(-6, -12) });
          const flash = new FlashOverlay({ width: w, height: h, duration: this.starfallImpactTimer, color: "#FFD84A", alpha: 0.6 });
          fxContainer.addChild(flash);
          this.hero.addChild(fxContainer);
        }
      } else if (this.starfallPhase === "flash") {
        this.starfallImpactTimer -= delta;
        if (this.starfallImpactTimer <= 0) {
          // Begin dive towards baddy target X and baseline Y
          this.starfallPhase = "dive";
          this.hero.body.animations.play("walkRight");
        }
      } else if (this.starfallPhase === "dive") {
        const targetX = this.attackTargetX;
        const targetY = this.heroStartPosition.y;
        const dx = targetX - this.hero.position.x;
        const dy = targetY - this.hero.position.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= 0.5) {
          this.hero.position.x = targetX;
          this.hero.position.y = targetY;
          this.starfallPhase = "impact";
          this.starfallImpactTimer = 200;
          this.hero.body.animations.play("standRight");
          this.doHitEffects();
        } else {
          const step = this.starfallDiveSpeed * delta;
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          const move = Math.min(step, dist);
          this.hero.position.x += nx * move;
          this.hero.position.y += ny * move;
        }
      } else if (this.starfallPhase === "impact") {
        this.starfallImpactTimer -= delta;
        if (this.starfallImpactTimer <= 0) {
          this.starfallPhase = "retreat";
          this.attackSpeed = Math.max(0.5, this.attackSpeed);
          this.hero.body.animations.play("walkLeft");
        }
      } else if (this.starfallPhase === "retreat") {
        // Zip back fast to start position
        const dx = this.heroStartPosition.x - this.hero.position.x;
        const dy = this.heroStartPosition.y - this.hero.position.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= 1.0) {
          this.hero.position.x = this.heroStartPosition.x;
          this.hero.position.y = this.heroStartPosition.y;
          this.starfallPhase = "idle";
          this.isAttacking = false;
          this.resolvedSkill = null;
          this.hero.body.animations.play("standRight");
          // Reset selection/UI and advance to enemy turn
          this.resetSkillSelectionUI();
          this.consumeTurn();
          if (this.currentTurn === "baddy") {
            this.beginEnemyAttack();
          }
        } else {
          const step = Math.max(0.5, this.attackSpeed) * delta;
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          const move = Math.min(step, dist);
          this.hero.position.x += nx * move;
          this.hero.position.y += ny * move;
        }
      }
    } else if (this.isAttacking && this.attackPhase === "dashing") {
      // accelerate forward
      this.attackSpeed = Math.min(this.attackMaxSpeed, this.attackSpeed + this.attackAccel * delta);
      const remaining = (this.attackTargetX ?? this.hero.position.x) - this.hero.position.x;
      const stepX = Math.min(Math.max(this.attackSpeed * delta, 0), Math.max(0, remaining));
      this.hero.position.x += stepX;

      if (this.hero.position.x >= (this.attackTargetX - 0.5)) {
        this.hero.position.x = this.attackTargetX;
        this.attackPhase = "impact";
        this.impactTimer = 180;
        this.hero.body.animations.play("standRight");
        this.doHitEffects();
      }
    } else if (this.isAttacking && this.attackPhase === "impact") {
      this.impactTimer -= delta;
      if (this.impactTimer <= 0) {
        this.attackPhase = "retreat";
        this.attackSpeed = Math.max(0.2, this.attackSpeed);
        this.hero.body.animations.play("walkLeft");
      }
    } else if (this.isAttacking && this.attackPhase === "retreat") {
      const dir = Math.sign(this.heroStartPosition.x - this.hero.position.x) || -1;
      const vx = this.attackSpeed * dir;
      this.hero.position.x += vx * delta;
      this.attackSpeed *= this.retreatFriction;

      const distBack = Math.abs(this.heroStartPosition.x - this.hero.position.x);
      if (distBack <= 1.0 || this.attackSpeed < 0.02) {
        this.hero.position.x = this.heroStartPosition.x;
        this.attackPhase = "idle";
        this.isAttacking = false;
        this.hero.body.animations.play("standRight");
        // Reset selection/UI and advance to enemy turn
        this.resetSkillSelectionUI();
        this.consumeTurn();
        if (this.currentTurn === "baddy") {
          this.beginEnemyAttack();
        }
      }
    }

    // Enemy mirrored attack processing
    if (this.enemyIsAttacking) {
      // If parry freeze active, hold enemy in place and skip retreat motion
      if (this.enemyParried) {
        this.enemyParryFreezeTimer -= delta;
        // Keep enemy at impact position and idle anim
        this.baddy.sprite.animations.play("standLeft");
        if (this.enemyParryFreezeTimer <= 0) {
          // Apply counter damage to baddy, then resume retreat from here
          const w = this.baddy.sprite.frameSize.x * (this.baddy.sprite.scale ?? 1);
          const h = this.baddy.sprite.frameSize.y * (this.baddy.sprite.scale ?? 1);
          const flash = new FlashOverlay({ width: w, height: h, duration: 120 });
          const slice = new SliceEffect({ width: w, height: h, duration: 160 });
          this.baddy.addChild(flash);
          this.baddy.addChild(slice);
          this.baddy.takeDamage(this.parryCounterDamage ?? 8);
          this.enemyParried = false;
          this.enemyAttackPhase = "retreat";
          this.enemyAttackSpeed = Math.max(0.25, this.enemyAttackSpeed);
          this.baddy.sprite.animations.play("walkRight");
        }
        // Skip further enemy movement while frozen
      } else {
      if (this.enemyAttackPhase === "dashing") {
        this.enemyAttackSpeed = Math.min(this.enemyAttackMaxSpeed, this.enemyAttackSpeed + this.attackAccel * delta);
        const remaining = (this.enemyAttackTargetX ?? this.baddy.position.x) - this.baddy.position.x;
        const dir = Math.sign(remaining) || -1;
        const stepX = dir * Math.min(Math.abs(remaining), this.enemyAttackSpeed * delta);
        this.baddy.position.x += stepX;

        if (Math.abs(this.baddy.position.x - this.enemyAttackTargetX) <= 0.5) {
          this.baddy.position.x = this.enemyAttackTargetX;
          this.enemyAttackPhase = "impact";
          this.enemyImpactTimer = 180;
          this.baddy.sprite.animations.play("standLeft");
          // Schedule impact resolution with parry window around now
          const dmg = this.baddy.attackPower ?? 12;
          this.enemyImpactPending = { time: this.timeMs, damage: dmg };
          this.enemyImpactResolveAt = this.timeMs + 60; // slight delay to allow post window frames
          this.doHitEffectsOnHero();
        }
      } else if (this.enemyAttackPhase === "impact") {
        this.enemyImpactTimer -= delta;
        if (this.enemyImpactTimer <= 0) {
          this.enemyAttackPhase = "retreat";
          this.enemyAttackSpeed = Math.max(0.2, this.enemyAttackSpeed);
          this.baddy.sprite.animations.play("walkRight");
        }
      } else if (this.enemyAttackPhase === "retreat") {
        const dir = Math.sign(this.baddyStartPosition.x - this.baddy.position.x) || 1;
        const vx = this.enemyAttackSpeed * dir;
        this.baddy.position.x += vx * delta;
        this.enemyAttackSpeed *= this.retreatFriction;

        const distBack = Math.abs(this.baddyStartPosition.x - this.baddy.position.x);
        if (distBack <= 1.0 || this.enemyAttackSpeed < 0.02) {
          this.baddy.position.x = this.baddyStartPosition.x;
          this.enemyAttackPhase = "idle";
          this.enemyIsAttacking = false;
          this.baddy.sprite.animations.play("standLeft");
          // Advance to next (hero) turn
          this.consumeTurn();
        }
      }
      }
    }

    // Capture parry input (Z key)
    if (input?.getActionJustPressed && input.getActionJustPressed("KeyZ")) {
      this.lastParryPressAt = this.timeMs;
    }

    // Resolve pending enemy impact considering parry window
    if (this.enemyImpactPending) {
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
        this.hero.takeDamage(this.enemyImpactPending.damage, this.baddy.position, this.heroStartPosition);
        this.enemyImpactPending = null;
      }
    }
  }

  doHitEffects() {
    // Damage
    const dmg = this.resolvedSkill?.attackPower ?? 20;
    this.baddy.takeDamage(dmg);

    // Flash overlay
    const w = this.baddy.sprite.frameSize.x * (this.baddy.sprite.scale ?? 1);
    const h = this.baddy.sprite.frameSize.y * (this.baddy.sprite.scale ?? 1);
    const flash = new FlashOverlay({ width: w, height: h, duration: 150 });
    this.baddy.addChild(flash);

    // Slice effect
    const slice = new SliceEffect({ width: w, height: h, duration: 180 });
    this.baddy.addChild(slice);
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
    this.enemyAttackPhase = "dashing";
    this.enemyAttackSpeed = 0;
    this.baddy.sprite.animations.play("walkLeft");
    const hWidth = this.hero.body.frameSize.x * (this.hero.body.scale ?? 1);
    const padding = 8;
    this.enemyAttackTargetX = this.hero.position.x + Math.max(12, hWidth * 0.35) + padding;
  }

  // Scheduler helpers
  ensureTurnQueue(n = 5) {
    while (this.turnQueue.length < n) {
      if (this.heroNextAt <= this.baddyNextAt) {
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
    this.resolvedSkill = SkillBook.get(selectedName);

    // Compute stop X slightly left of the baddy
    const bWidth = this.baddy.sprite.frameSize.x * (this.baddy.sprite.scale ?? 1);
    const padding = 8;
    this.attackTargetX = this.baddy.position.x - Math.max(12, bWidth * 0.35) - padding;

    // Begin attack using resolved animation type
    this.isAttacking = true;
    // Face right
    this.hero.facingDirection = "RIGHT";

    if (this.resolvedSkill.animationType === "starfall") {
      this.starfallPhase = "ascend";
      this.attackSpeed = 0;
      this.starfallImpactTimer = 0;
      this.hero.body.animations.play("walkUp");
    } else {
      // basic
      // Award a skill point for using a basic attack
      this.skillPoints += 1;
      this.emitSkillPointsChanged();
      this.attackPhase = "dashing";
      this.attackSpeed = 0;
      this.hero.body.animations.play("walkRight");
    }
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
}
 
