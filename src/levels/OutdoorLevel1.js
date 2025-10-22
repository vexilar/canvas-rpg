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
import {Tilemap} from "../tilemap/Tilemap.js";
import {loadTiledMap} from "../tilemap/TiledLoader.js";

export class OutdoorLevel1 extends Level {
  constructor(params={}) {
    super({});

    this.background = new Sprite({
      resource: resources.images.sky,
      frameSize: new Vector2(DESIGN_WIDTH, DESIGN_HEIGHT)
    })

    // Tilemap-driven content will be added in ready()
    this.walls = new Set();
  }

  ready() {
    // Load tilemap asynchronously
    loadTiledMap("/maps/testmap.tmj").then(map => {
      // Build tile layers (allow multiple)
      const floorDatas = map.floorLayers?.length ? map.floorLayers : (map.floorData ? [map.floorData] : []);
      floorDatas.forEach(data => {
        const floor = new Tilemap({
          tileSize: map.tileSize,
          width: map.width,
          height: map.height,
          tilesetImage: map.image,
          tilesetCols: map.tilesetCols,
          data,
          drawLayer: "FLOOR"
        });
        this.addChild(floor);
      });

      const overlayDatas = map.overlayLayers?.length ? map.overlayLayers : (map.overlayData ? [map.overlayData] : []);
      overlayDatas.forEach(data => {
        const overlay = new Tilemap({
          tileSize: map.tileSize,
          width: map.width,
          height: map.height,
          tilesetImage: map.image,
          tilesetCols: map.tilesetCols,
          data,
          drawLayer: "OVERLAY"
        });
        this.addChild(overlay);
      });

      // Walls from collision layer
      this.walls = map.walls ?? new Set();

      // Objects from object layers (optional): place simple examples by name/type
      map.objects?.forEach(obj => {
        const x = Math.round(obj.x);
        const y = Math.round(obj.y - map.tileSize);
        if (obj.type === "Exit") {
          const exit = new Exit(x, y);
          this.addChild(exit);
        }
        if (obj.type === "Rod") {
          const rod = new Rod(x, y);
          this.addChild(rod);
        }
        if (obj.type === "Npc") {
          const npc = new Npc(x, y);
          this.addChild(npc);
        }
        if (obj.type === "Enemy") {
          const key = obj.name || `enemy_${x}_${y}`;
          const baddy = this.enemyManager?.spawnEnemy(key, x, y, {});
          if (baddy) this.addChild(baddy);
        }
      });
    });
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
      
      console.log("OutdoorLevel1: Hero added to scene at", this.hero.position.x, this.hero.position.y);
    }

    // Enemies now come from tilemap (if any)

    events.on("HERO_EXITS", this, () => {
      events.emit("CHANGE_LEVEL", {
        level: new CaveLevel1(),
        heroPosition: new Vector2(gridCells(3), gridCells(6))
      })
    })
  }

  step(delta) {
    if (!this.hero || !this.enemyManager) return;

    const enemies = this.enemyManager.getEnemies();
    
    // Update enemy AI and check for collisions
    enemies.forEach(baddy => {
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

  triggerBattleWithBaddy(baddy) {
    // Import BattleScene dynamically to avoid circular dependencies
    import("./BattleScene.js").then(({BattleScene}) => {
      events.emit("CHANGE_LEVEL", {
        level: new BattleScene({
          originalLevel: "OutdoorLevel1",
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