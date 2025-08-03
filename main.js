import './style.css'
import {Vector2} from "./src/Vector2.js";
import {GameLoop} from "./src/GameLoop.js";
import {Main} from "./src/objects/Main/Main.js";
import {CaveLevel1} from "./src/levels/CaveLevel1.js";
import {DeathScreen} from "./src/DeathScreen.js";
import {canvas} from "./src/Canvas.js"
import {resources} from "./src/Resource.js"
import {events} from "./src/Events.js"

// Grabbing the canvas to draw to

const ctx = canvas.getContext("2d");

// Establish the root scene
const mainScene = new Main({
  position: new Vector2(0,0)
})
//mainScene.setLevel(new OutdoorLevel1())
mainScene.setLevel(new CaveLevel1())

// Create death screen
const deathScreen = new DeathScreen();
// Don't add to mainScene - draw it separately in the main draw loop

// Handle game reset
events.on("RESET_GAME", mainScene, () => {
  // Completely recreate the level
  mainScene.setLevel(new CaveLevel1());
});

// Establish update and draw loops
const update = (delta) => {
  // Pause game updates if death screen is active
  if (deathScreen.isActive) {
    // Only update the death screen itself
    deathScreen.step(delta);
    return;
  }
  
  mainScene.stepEntry(delta, mainScene);
  mainScene.input?.update();
  resources.step(delta); // Update GIF animations
};

const draw = () => {

  // Clear anything stale
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the sky
  mainScene.drawBackground(ctx);

  // Save the current state (for camera offset)
  ctx.save();

  //Offset by camera position
  if (mainScene.camera) {
    ctx.translate(mainScene.camera.position.x, mainScene.camera.position.y);
  }

  // Draw objects in the mounted scene
  mainScene.drawObjects(ctx);

  // Restore to original state
  ctx.restore();

  // Draw anything above the game world
  mainScene.drawForeground(ctx);
  
  // Draw death screen on top of everything (in screen coordinates)
  deathScreen.draw(ctx, 0, 0);

}

// Start the game!
const gameLoop = new GameLoop(update, draw);

gameLoop.start();
