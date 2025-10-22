import {Sprite} from "../Sprite.js";
import {Vector2} from "../Vector2.js";
import {resources} from "../Resource.js";
import {Level} from "../objects/Level/Level.js";
import {gridCells, DESIGN_WIDTH, DESIGN_HEIGHT} from "../helpers/grid.js";
import {Exit } from "../objects/Exit/Exit.js";
import {Hero} from "../objects/Hero/Hero.js";
import {Rod} from "../objects/Rod/Rod.js";
import {events} from "../Events.js";
import {OutdoorLevel1} from "./OutdoorLevel1.js";
import {Npc} from "../objects/Npc/Npc.js";
import {Baddy} from "../objects/Baddy/Baddy.js";
import {TALKED_TO_A, TALKED_TO_B} from "../StoryFlags.js";
import {canvas} from "../Canvas.js"
import {
  STAND_RIGHT,
  WALK_RIGHT,
} from "../baddyAnims.js";
import {Animations} from "../Animations.js";
import {FrameIndexPattern} from "../FrameIndexPattern.js";
import {ExplosionSprite} from "../ExplosionSprite.js";
import {HealthBar} from "../HealthBar.js";

export class CaveLevel1 extends Level {
  constructor(params={}) {
    super({});

    this.background = new Sprite({
      resource: resources.images.cave,
      frameSize: new Vector2(DESIGN_WIDTH, DESIGN_HEIGHT)
    })

    const ground = new Sprite({
      resource: resources.images.caveGround,
      frameSize: new Vector2(DESIGN_WIDTH, DESIGN_HEIGHT)
    })
    this.addChild(ground)

    const exit = new Exit(gridCells(3), gridCells(5))
    this.addChild(exit);

    const rod = new Rod(gridCells(9), gridCells(6))
    this.addChild(rod)

    const npc1 = new Npc(gridCells(5), gridCells(5), {
      //content: "I am the first NPC!",
      content: [
        {
          string: "I just can't stand that guy.",
          requires: [TALKED_TO_B],
          bypass: [TALKED_TO_A],
          addsFlag: TALKED_TO_A,
        },
        {
          string: "He is just the worst!",
          requires: [TALKED_TO_A],
        },
        {
          string: "Grumble grumble. Another day at work.",
          requires: [],
        }
      ],
      portraitFrame: 1
    })
    this.addChild(npc1);

    const npc2 = new Npc(gridCells(8), gridCells(5), {
      content: [
        {
          string: "What a wonderful day at work in the cave!",
          requires: [],
          addsFlag: TALKED_TO_B
        }
      ],
      portraitFrame: 0
    })
    this.addChild(npc2);

    this.walls = new Set();
  }

  ready() {
    // Hero and enemy manager are provided by Main
    // Add hero to the scene
    if (this.hero) {
      // Always remove first in case it's somehow already there
      const heroIndex = this.children.indexOf(this.hero);
      if (heroIndex !== -1) {
        this.children.splice(heroIndex, 1);
      }
      
      // Now add the hero
      this.addChild(this.hero);
      
      // Hide experience bar in non-battle levels
      if (this.hero.experienceBar) {
        this.hero.experienceBar.visible = false;
      }
      
      console.log("CaveLevel1: Hero added to scene at", this.hero.position.x, this.hero.position.y);
    }

    // Spawn enemies using enemy manager
    if (this.enemyManager) {
      // Clear any previous enemies
      this.enemyManager.clearEnemies();
      
      // Spawn cave baddy at specific position
      const baddy = this.enemyManager.spawnEnemy(
        "cave_baddy_1", // unique key
        20, 20, // position
        {
          health: 100,
          maxHealth: 100,
          attackPower: 10,
          experiencePoints: 50,
          aggroRange: 0,
          moveSpeed: 0
        }
      );
      
      if (baddy) {
        this.addChild(baddy);
      }
    }

    events.on("HERO_EXITS", this, () => {
      events.emit("CHANGE_LEVEL", {
        level: new OutdoorLevel1(),
        heroPosition: new Vector2(gridCells(16), gridCells(4))
      })
    })
  }

  step(delta) {
    if (!this.hero || !this.enemyManager) return;

    const enemies = this.enemyManager.getEnemies();
    
    // Update enemy AI and check for collisions
    enemies.forEach(baddy => {
      // Calculate hero center for AI tracking and collision
      const heroCenterX = this.hero.position.x + this.hero.body.position.x + this.hero.body.frameSize.x / 2;
      const heroCenterY = this.hero.position.y + this.hero.body.position.y + this.hero.body.frameSize.y / 2;
      const heroPosition = new Vector2(heroCenterX, heroCenterY);

      // Use the Baddy object's AI method
      baddy.updateAI(heroPosition, delta);

      // Calculate baddy's visual center
      const baddyCenterX = baddy.position.x + baddy.sprite.frameSize.x / 2;
      const baddyCenterY = baddy.position.y + baddy.sprite.frameSize.y / 2;

      // Calculate distance between baddy and hero's visual centers
      const distance = Math.sqrt(
        Math.pow(baddyCenterX - heroCenterX, 2) +
        Math.pow(baddyCenterY - heroCenterY, 2)
      );

      // Check collision using distance-based detection
      const collisionDistance = 12;
      if (distance <= collisionDistance) {
        // Trigger battle
        console.log("Hero collided with baddy! Starting battle...");
        this.triggerBattleWithBaddy(baddy);
      }
    });
  }

  triggerBattleWithBaddy(baddy) {
    // Import BattleScene dynamically to avoid circular dependencies
    import("./BattleScene.js").then(({BattleScene}) => {
      events.emit("CHANGE_LEVEL", {
        level: new BattleScene({
          originalLevel: "CaveLevel1",
          enemyKey: baddy.enemyKey,
          baddyData: {
            health: baddy.health,
            maxHealth: baddy.maxHealth,
            attackPower: baddy.attackPower
          }
        }),
        heroPosition: null // Keep hero at current position
      });
    });
  }

}