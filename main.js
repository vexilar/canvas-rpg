import './style.css'
import {Vector2} from "./src/Vector2.js";
import {GameLoop} from "./src/GameLoop.js";
import {Main} from "./src/objects/Main/Main.js";
import {CaveLevel1} from "./src/levels/CaveLevel1.js";
import {BattleScene} from "./src/levels/BattleScene.js";
import {DeathScreen} from "./src/DeathScreen.js";
import {canvas} from "./src/Canvas.js"
import {DESIGN_WIDTH, DESIGN_HEIGHT} from "./src/helpers/grid.js"
import {resources} from "./src/Resource.js"
import {events} from "./src/Events.js"
import {audio} from "./src/Audio.js"

// Grabbing the canvas to draw to

const ctx = canvas.getContext("2d");

// High internal render resolution to reduce blur when scaling
const INTERNAL_RENDER_SCALE = 6; // 320x180 * 6 = 1920x1080

// Global helper to reliably read the canvas size
// - width/height: drawing buffer size (device pixels)
// - cssWidth/cssHeight: on-screen size (CSS pixels)
// - dpr: devicePixelRatio used by the browser
window.getCanvasSize = function() {
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.round(rect.width);
  const cssHeight = Math.round(rect.height);
  const dpr = window.devicePixelRatio || 1;
  const scale = cssWidth / DESIGN_WIDTH; // 16:9 ensures same for height
  return {
    width: canvas.width,
    height: canvas.height,
    bufferWidth: canvas.width,
    bufferHeight: canvas.height,
    cssWidth,
    cssHeight,
    dpr,
    designWidth: DESIGN_WIDTH,
    designHeight: DESIGN_HEIGHT,
    scale
  };
}

// Ensure the canvas drawing buffer matches its CSS size and scale the context
function resizeCanvasToDisplaySize() {
  const rect = canvas.getBoundingClientRect();
  // Fill screen width preserving 16:9 using CSS; compute cssHeight from rect
  const cssWidth = Math.round(rect.width);
  const cssHeight = Math.round(rect.height);
  const dpr = Math.max(1, (window.devicePixelRatio || 1));
  // Render at a higher internal resolution (1080p) and let browser downscale
  const targetRenderWidth = DESIGN_WIDTH * INTERNAL_RENDER_SCALE;
  const targetRenderHeight = DESIGN_HEIGHT * INTERNAL_RENDER_SCALE;
  const bufferWidth = Math.round(targetRenderWidth * dpr);
  const bufferHeight = Math.round(targetRenderHeight * dpr);

  if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
    canvas.width = bufferWidth;
    canvas.height = bufferHeight;
  }

  // Disable smoothing for crisp pixel art scaling
  ctx.imageSmoothingEnabled = false;

  // Scale design resolution to internal render scale; browser scales to CSS width
  const scale = INTERNAL_RENDER_SCALE;
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);

  return { cssWidth, cssHeight, bufferWidth, bufferHeight, dpr, scale };
}

// Keep canvas in sync with element size and DPR
const __ro = new ResizeObserver(() => {
  resizeCanvasToDisplaySize();
});
__ro.observe(canvas);
window.addEventListener("resize", resizeCanvasToDisplaySize);
window.addEventListener("orientationchange", resizeCanvasToDisplaySize);
// Initial sizing
resizeCanvasToDisplaySize();

// Initialize audio early so a first user gesture unlocks it
audio.init();
// Preload audio clips
audio.loadClips({
  heroHit: "/audio/hit.wav",
  baddyOof: "/audio/oof.wav",
  battleTheme: "/audio/fightchamp.wav",
});

// Global hero state that persists across level changes
const globalHeroState = {
  level: 1,
  experience: 0,
  experienceToNextLevel: 1000,
  position: null // Will be set when transitioning levels
};

// Establish the root scene
const mainScene = new Main(globalHeroState)
//mainScene.setLevel(new OutdoorLevel1())
mainScene.setLevel(new CaveLevel1({ globalHeroState }))
// mainScene.setLevel(new BattleScene({
//   originalLevel: "CaveLevel1",
//   baddyData: {
//     health: 100,
//     maxHealth: 100,
//     attackPower: 10
//   }
// }))

// Create death screen
const deathScreen = new DeathScreen();
// Don't add to mainScene - draw it separately in the main draw loop

// Handle game reset
events.on("RESET_GAME", mainScene, () => {
  // Reset global hero state
  globalHeroState.level = 1;
  globalHeroState.experience = 0;
  globalHeroState.experienceToNextLevel = 1000;
  globalHeroState.position = null;

  // Completely recreate the level
  mainScene.setLevel(new CaveLevel1({ globalHeroState }));
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
  resizeCanvasToDisplaySize();

  // Clear in design-space units (scaled by current transform)
  ctx.clearRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

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
