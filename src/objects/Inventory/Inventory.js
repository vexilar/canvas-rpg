import {GameObject} from "../../GameObject.js";
import {Sprite} from "../../Sprite.js";
import {resources} from "../../Resource.js";
import {Vector2} from "../../Vector2.js";
import {events} from "../../Events.js";

export class Inventory extends GameObject {
  constructor() {
    super({
      position: new Vector2(0, 1)
    });

    this.drawLayer = "HUD";

    this.nextId = 0;
    this.items = [];

    // React to Hero picking up an item (legacy demo)
    events.on("HERO_PICKS_UP_ITEM", this, data => {
      this.nextId += 1;
      this.items.push({
        id: this.nextId,
        image: resources.images.rod
      })
      this.renderInventory();
    })

    // Listen for skill points changes to render rods as points
    events.on("SKILL_POINTS_CHANGED", this, ({ count }) => {
      const num = Math.max(0, Math.floor(count || 0));
      this.items = Array.from({ length: num }).map((_, idx) => ({ id: idx + 1, image: resources.images.rod }));
      this.renderInventory();
    })

    // Draw initial state on bootup
    this.renderInventory();
  }

  renderInventory() {

    // Remove stale drawings
    this.children.forEach(child => child.destroy())

    // Draw fresh from the latest version of the list
    this.items.forEach((item, index) => {
      const sprite = new Sprite({
        resource: item.image,
        position: new Vector2(index*12, 0)
      })
      this.addChild(sprite);
    })
  }

  removeFromInventory(id) {
    this.items = this.items.filter(item => item.id !== id);
    this.renderInventory();
  }
}
 
 
 
 
 
 
 
 
 
 
 
 












