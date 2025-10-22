import {GameObject} from "../../GameObject.js";
import {Input} from "../../Input.js";
import {Camera} from "../../Camera.js";
import {Inventory} from "../Inventory/Inventory.js";
import {events} from "../../Events.js";
import {SpriteTextString} from "../SpriteTextString/SpriteTextString.js";
import {storyFlags} from "../../StoryFlags.js";
import {Hero} from "../Hero/Hero.js";
import {Vector2} from "../../Vector2.js";
import {gridCells} from "../../helpers/grid.js";
import {EnemyManager} from "../../EnemyManager.js";

export class Main extends GameObject {
  constructor(heroProgression, initialHeroPosition) {
    super({});
    this.level = null;
    this.input = new Input()
    this.camera = new Camera()
    this.heroProgression = heroProgression;
    this.addChild(this.camera); // Add camera so its step method gets called
    
    // Create hero instance (persists across levels)
    this.hero = new Hero(
      initialHeroPosition.x, 
      initialHeroPosition.y, 
      heroProgression
    );
    
    // Create enemy manager
    this.enemyManager = new EnemyManager();
  }

  ready() {

    const inventory = new Inventory()
    this.addChild(inventory);

    // Change Level handler
    events.on("CHANGE_LEVEL", this, (data) => {
      const { level: newLevelInstance, heroPosition } = data;
      
      // Update hero position if specified
      if (heroPosition) {
        this.hero.position.x = heroPosition.x;
        this.hero.position.y = heroPosition.y;
        this.hero.destinationPosition.x = heroPosition.x;
        this.hero.destinationPosition.y = heroPosition.y;
      }

      // Sync progression from hero
      this.heroProgression.syncFromHero(this.hero);

      this.setLevel(newLevelInstance)
    })

    // Launch Text Box handler
    events.on("HERO_REQUESTS_ACTION", this, (withObject) => {


      if (typeof withObject.getContent === "function") {
        const content = withObject.getContent();

        if (!content) {
          return;
        }

        console.log(content)
        // Potentially add a story flag
        if (content.addsFlag) {
          console.log("ADD FLAG", content.addsFlag)
          storyFlags.add(content.addsFlag);
        }

        // Show the textbox
        const textbox = new SpriteTextString({
          portraitFrame: content.portraitFrame,
          string: content.string
        });
        this.addChild(textbox);
        events.emit("START_TEXT_BOX");

        // Unsubscribe from this text box after it's destroyed
        const endingSub = events.on("END_TEXT_BOX", this, () => {
          textbox.destroy();
          events.off(endingSub)
        })
      }

    })

  }

  setLevel(newLevelInstance) {
    // Remove hero from old level before destroying it to prevent hero from being destroyed
    if (this.level && this.hero) {
      // Check if hero is a child of the current level
      const heroIndex = this.level.children.indexOf(this.hero);
      if (heroIndex !== -1) {
        // Manually remove from children array without unsubscribing events
        // (We don't use removeChild because we want to keep the hero's event subscriptions)
        this.level.children.splice(heroIndex, 1);
        this.hero.parent = null; // Clear parent reference
      }
    }
    
    if (this.level) {
      this.level.destroy();
    }
    this.level = newLevelInstance;
    
    // Provide hero and enemy manager to the level
    newLevelInstance.hero = this.hero;
    newLevelInstance.enemyManager = this.enemyManager;
    
    this.addChild(this.level);
  }

  drawBackground(ctx) {
    this.level?.background.drawImage(ctx,0,0);
  }

  drawObjects(ctx) {
    this.children.forEach(child => {
      if (child.drawLayer !== "HUD") {
        child.draw(ctx, 0, 0);
      }
    })
  }

  drawForeground(ctx) {
    this.children.forEach(child => {
      if (child.drawLayer === "HUD") {
        child.draw(ctx, 0, 0);
      }
    })
  }

}