import {Level} from "../objects/Level/Level.js";
import {Sprite} from "../Sprite.js";
import {resources} from "../Resource.js";
import {Vector2} from "../Vector2.js";
import {Exit} from "../objects/Exit/Exit.js";
import {gridCells} from "../helpers/grid.js";
import {Hero} from "../objects/Hero/Hero.js";
import {Rod} from "../objects/Rod/Rod.js";
import {events} from "../Events.js";
import {CaveLevel1} from "./CaveLevel1.js";

const DEFAULT_HERO_POSITION = new Vector2(gridCells(6),gridCells(5))

export class OutdoorLevel1 extends Level {
  constructor(params={}) {
    super({});
    this.background = new Sprite({
      resource: resources.images.sky,
      frameSize: new Vector2(320, 180)
    })

    const groundSprite = new Sprite({
      resource: resources.images.ground,
      frameSize: new Vector2(320, 180)
    })
    this.addChild(groundSprite);

    const exit = new Exit(gridCells(6), gridCells(3))
    this.addChild(exit);

    this.heroStartPosition = params.heroPosition ?? DEFAULT_HERO_POSITION;
    const hero = new Hero(this.heroStartPosition.x, this.heroStartPosition.y)
    this.addChild(hero);

    const rod = new Rod(gridCells(7), gridCells(6))
    this.addChild(rod);

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
  }

  ready() {
    events.on("HERO_EXITS", this, () => {
      events.emit("CHANGE_LEVEL", new CaveLevel1({
        heroPosition: new Vector2(gridCells(3), gridCells(6))
      }))
    })
  }
}