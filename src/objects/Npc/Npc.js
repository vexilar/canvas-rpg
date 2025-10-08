import {GameObject} from "../../GameObject.js";
import {Vector2} from "../../Vector2.js";
import {resources} from "../../Resource.js";
import {Sprite} from "../../Sprite.js";
import {storyFlags} from "../../StoryFlags.js";
import {events} from "../../Events.js";

export class Npc extends GameObject {
  constructor(x, y, textConfig={}) {
    super({
      position: new Vector2(x, y)
    });

    // Opt into being solid
    this.isSolid = true;

    // Say something when talking
    this.textContent = textConfig.content;
    this.textPortraitFrame = textConfig.portraitFrame;
    
    // Battle configuration
    this.triggerBattle = textConfig.triggerBattle || false;
    this.originalLevel = textConfig.originalLevel || "CaveLevel1";

    // Shadow under feet
    const shadow = new Sprite({
      resource: resources.images.shadow,
      frameSize: new Vector2(32, 32),
      position: new Vector2(-8, -19),
    })
    this.addChild(shadow);

    // Body sprite
    const body = new Sprite({
      resource: resources.images.knight,
      frameSize: new Vector2(32, 32),
      hFrames: 2,
      vFrames: 1,
      position: new Vector2(-8, -20),
    })
    this.addChild(body)
    
    // Add hitbox for collision detection
    this.hitbox = {
      x: 8, // Offset from sprite center
      y: 8,
      width: 16, // Smaller hitbox than visual
      height: 16
    };
  }

  getHitboxBounds() {
    return {
      x: this.position.x + this.hitbox.x,
      y: this.position.y + this.hitbox.y,
      width: this.hitbox.width,
      height: this.hitbox.height
    };
  }

  ready() {
    // Listen for hero position updates to detect collision
    events.on("HERO_POSITION", this, (heroPosition) => {
      this.checkHeroCollision(heroPosition);
    });
  }

  checkHeroCollision(heroPosition) {
    // Calculate hero's hitbox bounds (assuming hero has similar hitbox structure)
    const heroBounds = {
      x: heroPosition.x + 8, // Hero hitbox offset
      y: heroPosition.y + 8,
      width: 16,
      height: 16
    };
    
    const npcBounds = this.getHitboxBounds();
    
    // Check for collision
    const collision = !(heroBounds.x + heroBounds.width < npcBounds.x ||
                       npcBounds.x + npcBounds.width < heroBounds.x ||
                       heroBounds.y + heroBounds.height < npcBounds.y ||
                       npcBounds.y + npcBounds.height < heroBounds.y);
    
    if (collision && this.triggerBattle) {
      console.log("Hero collided with battle NPC!");
      this.triggerBattleScene();
    }
  }

  triggerBattleScene() {
    // Import BattleScene dynamically to avoid circular dependencies
    import("../../levels/BattleScene.js").then(({BattleScene}) => {
      events.emit("CHANGE_LEVEL", new BattleScene({
        originalLevel: this.originalLevel
      }));
    });
  }

  getContent() {

    // Maybe expand with story flag logic, etc
    const match = storyFlags.getRelevantScenario(this.textContent);
    if (!match) {
      console.warn("No matches found in this list!", this.textContent);
      return null;
    }

    return {
      portraitFrame: this.textPortraitFrame,
      string: match.string,
      addsFlag: match.addsFlag ?? null
    }
  }

}