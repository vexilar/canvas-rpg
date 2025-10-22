import {GameObject} from "../../GameObject.js";
import {Input} from "../../Input.js";
import {Camera} from "../../Camera.js";
import {Inventory} from "../Inventory/Inventory.js";
import {events} from "../../Events.js";
import {SpriteTextString} from "../SpriteTextString/SpriteTextString.js";
import {storyFlags} from "../../StoryFlags.js";

export class Main extends GameObject {
  constructor(globalHeroState) {
    super({});
    this.level = null;
    this.input = new Input()
    this.camera = new Camera()
    this.globalHeroState = globalHeroState;
    this.addChild(this.camera); // Add camera so its step method gets called
  }

  ready() {

    const inventory = new Inventory()
    this.addChild(inventory);

    // Change Level handler
    events.on("CHANGE_LEVEL", this, newLevelInstance => {
      // Save current hero state before changing levels
      if (this.level && this.level.hero) {
        this.globalHeroState.level = this.level.hero.level;
        this.globalHeroState.experience = this.level.hero.experience;
        this.globalHeroState.experienceToNextLevel = this.level.hero.experienceToNextLevel;
        this.globalHeroState.position = this.level.hero.position.duplicate();
      }

      // Add global hero state to the new level instance
      if (newLevelInstance && typeof newLevelInstance === 'object') {
        newLevelInstance.globalHeroState = this.globalHeroState;
      }

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
    if (this.level) {
      this.level.destroy();
    }
    this.level = newLevelInstance;
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