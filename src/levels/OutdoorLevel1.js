import {Level} from "../objects/Level/Level.js";
import {Sprite} from "../Sprite.js";
import {resources} from "../Resource.js";
import {Vector2} from "../Vector2.js";
import {Exit} from "../objects/Exit/Exit.js";
import {gridCells, DESIGN_WIDTH, DESIGN_HEIGHT} from "../helpers/grid.js";
import {Hero} from "../objects/Hero/Hero.js";
import {Rod} from "../objects/Rod/Rod.js";
import {Npc} from "../objects/Npc/Npc.js";
import {Baddy} from "../objects/Baddy/Baddy.js";
import {events} from "../Events.js";
import {CaveLevel1} from "./CaveLevel1.js";

const DEFAULT_HERO_POSITION = new Vector2(gridCells(6),gridCells(5))

export class OutdoorLevel1 extends Level {
  constructor(params={}) {
    super({});

    // Store battle result if returning from battle
    this.battleResult = params.battleResult;
    // Store global hero state
    this.globalHeroState = params.globalHeroState;

    this.background = new Sprite({
      resource: resources.images.sky,
      frameSize: new Vector2(DESIGN_WIDTH, DESIGN_HEIGHT)
    })

    const groundSprite = new Sprite({
      resource: resources.images.ground,
      frameSize: new Vector2(DESIGN_WIDTH, DESIGN_HEIGHT)
    })
    this.addChild(groundSprite);

    const exit = new Exit(gridCells(6), gridCells(3))
    this.addChild(exit);

    this.heroStartPosition = params.heroPosition ?? this.globalHeroState?.position ?? DEFAULT_HERO_POSITION;
    const hero = new Hero(this.heroStartPosition.x, this.heroStartPosition.y);

    // Restore hero experience/level from global state or battle result
    const heroState = this.battleResult?.heroExperience || this.globalHeroState;
    if (heroState) {
      hero.level = heroState.level || 1;
      hero.experience = heroState.experience || 0;
      hero.experienceToNextLevel = heroState.experienceToNextLevel || 1000;
      // Update experience bar
      if (hero.experienceBar) {
        hero.experienceBar.setExperience(hero.experience, hero.experienceToNextLevel);
        // Hide experience bar in non-battle levels
        hero.experienceBar.visible = false;
      }
    } else {
      // Hide experience bar for fresh heroes in non-battle levels
      if (hero.experienceBar) {
        hero.experienceBar.visible = false;
      }
    }

    this.addChild(hero);

    const rod = new Rod(gridCells(7), gridCells(6))
    this.addChild(rod);

    // Only add baddy if it wasn't defeated in battle
    const baddyPosition = new Vector2(gridCells(12), gridCells(5));
    const baddyDefeated = this.battleResult?.baddyDefeated &&
                         this.battleResult?.baddyPosition &&
                         this.battleResult.baddyPosition.x === baddyPosition.x &&
                         this.battleResult.baddyPosition.y === baddyPosition.y;

    this.baddies = [];
    if (!baddyDefeated) {
      const battleBaddy = new Baddy(baddyPosition.x, baddyPosition.y, {
        battleMode: false,
        health: 90,
        maxHealth: 90,
        attackPower: 15,
        aggroRange: 0, // Disable chasing - player must run into baddy
        moveSpeed: 0
      });
      this.addChild(battleBaddy);
      this.baddies.push(battleBaddy);
    }

    this.walls = new Set();
    this.walls.add(`64,48`); // tree
    this.walls.add(`64,64`); // squares
    this.walls.add(`64,80`);
    this.walls.add(`80,64`);
    this.walls.add(`80,80`);
    this.walls.add(`112,80`); // water
    this.walls.add(`128,80`);
    this.walls.add(`144,80`);
    this.walls.add(`160,80`);
    
    // Store hero reference for collision detection
    this.hero = hero;
  }

  step(delta) {
    // Update baddy AI
    if (this.baddies && this.baddies.length > 0) {
      this.baddies.forEach(baddy => {
        // Calculate hero center for AI tracking
        const heroCenterX = this.hero.position.x + this.hero.body.position.x + this.hero.body.frameSize.x / 2;
        const heroCenterY = this.hero.position.y + this.hero.body.position.y + this.hero.body.frameSize.y / 2;
        const heroPosition = new Vector2(heroCenterX, heroCenterY);
        
        // Use the Baddy object's AI method
        baddy.updateAI(heroPosition, delta);
        
        // Check for collision with hero
        const baddyCenterX = baddy.position.x + baddy.sprite.frameSize.x / 2;
        const baddyCenterY = baddy.position.y + baddy.sprite.frameSize.y / 2;
        
        const distance = Math.sqrt(
          Math.pow(baddyCenterX - heroCenterX, 2) + 
          Math.pow(baddyCenterY - heroCenterY, 2)
        );
        
        const collisionDistance = 12;
        if (distance <= collisionDistance) {
          console.log("Hero collided with baddy in outdoor level! Starting battle...");
          this.triggerBattleWithBaddy(baddy);
        }
      });
    }
  }

  triggerBattleWithBaddy(baddy) {
    // Import BattleScene dynamically to avoid circular dependencies
    import("./BattleScene.js").then(({BattleScene}) => {
      events.emit("CHANGE_LEVEL", new BattleScene({
        originalLevel: "OutdoorLevel1",
        baddyData: {
          health: baddy.health,
          maxHealth: baddy.maxHealth,
          attackPower: baddy.attackPower
        },
        globalHeroState: this.globalHeroState
      }));
    });
  }

  ready() {
    events.on("HERO_EXITS", this, () => {
      events.emit("CHANGE_LEVEL", new CaveLevel1({
        heroPosition: new Vector2(gridCells(3), gridCells(6)),
        globalHeroState: this.globalHeroState
      }))
    })
  }
}