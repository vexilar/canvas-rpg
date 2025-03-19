import {Sprite} from "../Sprite.js";
import {Vector2} from "../Vector2.js";
import {resources} from "../Resource.js";
import {Level} from "../objects/Level/Level.js";
import {gridCells} from "../helpers/grid.js";
import {Exit } from "../objects/Exit/Exit.js";
import {Hero} from "../objects/Hero/Hero.js";
import {Rod} from "../objects/Rod/Rod.js";
import {events} from "../Events.js";
import {OutdoorLevel1} from "./OutdoorLevel1.js";
import {Npc} from "../objects/Npc/Npc.js";
import {TALKED_TO_A, TALKED_TO_B} from "../StoryFlags.js";
import {canvas} from "../Canvas.js"
import {
  STAND_RIGHT,
  WALK_RIGHT,
} from "../baddyAnims.js";
import {Animations} from "../Animations.js";
import {FrameIndexPattern} from "../FrameIndexPattern.js";

const DEFAULT_HERO_POSITION = new Vector2(gridCells(6), gridCells(5))

export class CaveLevel1 extends Level {
  constructor(params={}) {
    super({});

    this.background = new Sprite({
      resource: resources.images.cave,
      frameSize: new Vector2(320, 180)
    })

    const ground = new Sprite({
      resource: resources.images.caveGround,
      frameSize: new Vector2(320, 180)
    })
    this.addChild(ground)

    const exit = new Exit(gridCells(3), gridCells(5))
    this.addChild(exit);

    this.heroStartPosition = params.heroPosition ?? DEFAULT_HERO_POSITION;
    const hero = new Hero(this.heroStartPosition.x, this.heroStartPosition.y);
    this.addChild(hero);

    this.fireballs = []

    const cleanupOldFireballs = () => {
      this.fireballs.forEach(f => {
        const now = new Date();
        const creationDate = new Date(f.creationTime.getTime());
        const creationDatePlus = new Date(creationDate.setSeconds(creationDate.getSeconds() + 1));

        if (now > creationDatePlus){
          this.removeChild(f);
          this.fireballs.splice(this.fireballs.indexOf(f), 1);         
        }
      })
    }

    const getMousePos = (canvas, evt) => {
      var rect = canvas.getBoundingClientRect();
      return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
      };
    }

    const getFireballVector = (mousePos) => {
      const halfX = canvas.scrollWidth / 2;
      const halfY = canvas.scrollHeight / 2;
      const diffX = mousePos.x - halfX;
      const diffY = mousePos.y - halfY;
      const magnitude = Math.sqrt(diffX * diffX + diffY * diffY);

      // Normalize the vector to ensure consistent speed
      const vector = new Vector2(diffX / magnitude, diffY / magnitude);

      return vector;
    }

    const moveFireballs = () => {
      this.fireballs.forEach(f => {
        f.position = new Vector2(f.position.x + f.vector.x, f.position.y + f.vector.y);
      })
    }

    document.addEventListener("click", (evt) => {
      var mousePos = getMousePos(canvas, evt);

      const fireball = new Sprite({
          resource: resources.images.fireball,
          frameSize: new Vector2(200, 200),
          scale: .1,
          position: hero.position.duplicate(),
          drawLayer: 0, // this doesnt seem to do much, TODO: figure out how to make it work the way i want it
        })
        fireball.creationTime = new Date();
        fireball.vector = getFireballVector(mousePos);

        fireball.step = () => {
          cleanupOldFireballs();
          moveFireballs();
        }

        this.addChild(fireball)
        this.fireballs.push(fireball)
    });

    const baddy = new Sprite({
      resource: resources.images.baddy,
      frameSize: new Vector2(48,48),
      hFrames: 6,
      vFrames: 1,
      frame: 1,
      position: new Vector2(20, 20),
      animations: new Animations({
        walkRight: new FrameIndexPattern(WALK_RIGHT),
        standRight: new FrameIndexPattern(STAND_RIGHT),
      })
    })
    baddy.direction = 1;

    this.addChild(baddy)
    this.baddies = []
    this.baddies.push(baddy)

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

  step(delta) {
    
    const wid = canvas.width;
    const widMarg = wid*.6;
    const pos = this.baddies[0].position.x;
    let dir = this.baddies[0].direction;
    
    // this block changes the direction of the baddy when it reaches the edge of the screen
    const tolerance = 5; // Add a small margin of tolerance
    if (this.baddies[0].direction === 1 && this.baddies[0].position.x >= widMarg - tolerance) {
      this.baddies[0].direction = -1;
    } else if (this.baddies[0].direction === -1 && this.baddies[0].position.x <= tolerance) {
      this.baddies[0].direction = 1;
    }

    console.log({pos, dir, widMarg})

    this.baddies[0].position.x = pos + dir;
  }

  ready() {
    events.on("HERO_EXITS", this, () => {
      events.emit("CHANGE_LEVEL", new OutdoorLevel1({
        heroPosition: new Vector2(gridCells(16), gridCells(4))
      }))
    })
  }

}