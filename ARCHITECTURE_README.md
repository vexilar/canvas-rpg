## Canvas RPG Architecture Overview

### Runtime entry and game loop
- `index.html` hosts a `canvas#game-canvas` (320x180). `main.js` bootstraps the app.
- `main.js` creates:
  - `Main` root scene (extends `GameObject`) and mounts an initial `Level` (`CaveLevel1` or `OutdoorLevel1`).
  - `DeathScreen` overlay (drawn in screen space, above world).
  - `GameLoop(update, draw)` which runs at a fixed timestep for update and renders every frame.

Update order per frame (fixed step):
1. If `DeathScreen.isActive`, only `deathScreen.step(delta)` runs, then render; game world is paused.
2. Otherwise:
   - `mainScene.stepEntry(delta, mainScene)` (recursive GameObject update, see below)
   - `mainScene.input?.update()` (edge-triggered input bookkeeping)
   - `resources.step(delta)` (advance animated sprite frames)

Draw order per frame:
1. Clear canvas.
2. `mainScene.drawBackground(ctx)` draws the level background.
3. Save ctx; apply camera transform if present.
4. `mainScene.drawObjects(ctx)` draws all non-HUD children.
5. Restore ctx; `mainScene.drawForeground(ctx)` draws HUD children (e.g., inventory, text).
6. Draw `deathScreen` last (screen-space).

### Core object model
- `GameObject` is the root base class for all world entities and UI widgets.
  - Tree composition: each object has `children`, `parent`, and can `addChild` / `removeChild` / `destroy` (recursive).
  - Update pipeline via `stepEntry(delta, root)`:
    - Calls `stepEntry` on all children first (top-down recursion).
    - Calls `ready()` once (first frame) on the instance.
    - Calls `step(delta, root)` each frame.
  - Draw pipeline via `draw(ctx, x, y)`:
    - Computes own draw position `(x + position.x, y + position.y)`.
    - Calls `drawImage(ctx, drawPosX, drawPosY)` (override in subclasses to render).
    - Draws children next, ordered by `getDrawChildrenOrdered()`:
      - Special case: items with `drawLayer === "FLOOR"` render beneath others.
      - Otherwise y-sort (lower y draws later to simulate depth).
- Implications:
  - Ready-before-step guarantees initialization only once per object.
  - Children update before parent each frame; drawing renders parent first, then ordered children.

### Scenes and levels
- `Main` (extends `GameObject`) acts as the root scene/controller.
  - Owns `input: Input` and `camera: Camera` (added as a child so it updates each frame).
  - Listens for `CHANGE_LEVEL` to swap the active `level` (`Level` subclass). Old level is `destroy()`ed.
  - Rendering helpers:
    - `drawBackground(ctx)`: delegates to `level.background.drawImage`.
    - `drawObjects(ctx)`: draws all children except those with `drawLayer === "HUD"`.
    - `drawForeground(ctx)`: draws only `drawLayer === "HUD"` children.
  - Handles text interactions: on `HERO_REQUESTS_ACTION`, inspects the target for `getContent()`, optionally sets story flags, creates a `SpriteTextString` (HUD), and manages textbox lifecycle with `START_TEXT_BOX` / `END_TEXT_BOX`.
- `Level` (extends `GameObject`) is a simple base for concrete levels.
  - Has `background: Sprite` and `walls: Set<string>` (collision grid of `"x,y"`).
- `CaveLevel1` / `OutdoorLevel1` (extend `Level`): construct background/ground tiles, place `Exit`, `Hero`, items (e.g., `Rod`), `Npc`s, enemies (in cave: a "baddy" Sprite with AI, health and `HealthBar`).
  - Maintain hero start position for camera centering and cross-level handoff.
  - Listen to `HERO_EXITS` to transition levels via `CHANGE_LEVEL`.
  - `CaveLevel1.step(delta)` handles:
    - Enemy AI: aggro within range; otherwise patrol. Moves toward hero center.
    - Fireball management and cleanup; collision with baddies spawns `ExplosionSprite`, damages, and removes.
    - Baddy-hero proximity hits apply `Hero.takeDamage` with knockback.
- `BattleScene` (extends `Level`): a simple alternative scene used when battle NPC triggers it; returns to original level on `BATTLE_COMPLETE`.

### Rendering: sprites and animations
- `Sprite` (extends `GameObject`) renders either a sprite-sheet frame or an animated sequence.
  - Static sprites: use `resource: resources.images.<key>` with `frameSize`, `hFrames`, `vFrames`, `frame`.
  - Animated sprites (per-frame PNGs): use `resource` with `isAnimated` and `frames`; `drawImage` draws the current frame directly. `resources.step(delta)` advances `currentFrame` globally.
  - Optional `animations: Animations` drives `this.frame` for sheet-based animation; `step(delta)` advances the active `FrameIndexPattern`.
  - Hitbox support with `hitbox` rectangle and methods `getHitboxBounds()` and `collidesWith(otherSprite)` for AABB collisions.
- `Animations` and `FrameIndexPattern`:
  - `Animations` maps keys (e.g., `walkDown`) to `FrameIndexPattern`s, tracks `activeKey`, and exposes `frame` and `play(key)`.
  - `FrameIndexPattern` holds keyframed frames and duration; `step(delta)` advances looping time; `frame` returns the current frame index.

### Player and NPCs
- `Hero` (extends `GameObject`):
  - Visuals: a `shadow` sprite and a `body` sprite (sheet + `Animations` via `heroAnimations`). The `body` carries a tighter hitbox.
  - Movement: grid-aligned pathing using `destinationPosition` and `moveTowards(...)`. Reads `root.input.direction` to enqueue a 16px move and sets animations accordingly. Respects level `walls` and solid bodies.
  - Interaction: on Space, finds child at facing neighbor cell and emits `HERO_REQUESTS_ACTION` with that object.
  - Camera: emits `HERO_POSITION` when moving changes to let `Camera` center smoothly.
  - Item pickup: listens `HERO_PICKS_UP_ITEM` to run a short pickup animation that locks movement.
  - Health/Combat: `takeDamage(amount, attackerPosition)` updates `HealthBar`, triggers knockback with a decaying vector, sets brief invulnerability, and emits `HERO_DIED` when health reaches zero.
- `Npc` (extends `GameObject`):
  - Solid by default; visual shadow + body sprite.
  - Dialogue content is scenario-based; `getContent()` chooses text using `StoryFlags.getRelevantScenario` and exposes an optional portrait frame.
  - Battle trigger variant: when `triggerBattle` is true and hero collides (checked on `HERO_POSITION`), loads `BattleScene` dynamically and emits `CHANGE_LEVEL`.

### UI and HUD
- `SpriteTextString` (extends `GameObject`, `drawLayer: "HUD"`):
  - Renders a typewriter textbox with a background sprite, portrait, and character-by-character text using `sprite-font-white.png` mapped via `spriteFontMap` for widths and frames.
  - Space skips to end or ends the textbox and emits `END_TEXT_BOX`.
- `Inventory` (extends `GameObject`, `drawLayer: "HUD"`):
  - Displays item sprites horizontally; listens for `HERO_PICKS_UP_ITEM` to add items and rerender.
- `HealthBar` (extends `GameObject`):
  - Draws a simple bordered bar with color changes based on health percentage; attached as a child to entities.
- `DeathScreen` (extends `GameObject`):
  - Screen-space fade to black on `HERO_DIED`, reveals message, and emits `RESET_GAME` after a delay (handled in `main.js` to recreate the level).

### Camera and input
- `Camera` (extends `GameObject`):
  - Listens to `HERO_POSITION` to set a smoothed `targetPosition` that centers hero, and to `CHANGE_LEVEL` to recenter on `heroStartPosition` immediately.
  - `main.js` applies `ctx.translate(camera.position.x, camera.position.y)` around world-space drawing.
- `Input`:
  - Tracks `keydown/keyup` for directional queue (`heldDirections`) and raw key states; `update()` copies to `lastKeys` for edge-trigger detection. `getActionJustPressed(code)` detects Space presses.

### Events and resources
- `events`: minimal pub/sub with `on`, `emit`, `off`, and `unsubscribe(caller)`. Used broadly for decoupling (level changes, hero position, textbox lifecycle, pickups, death/reset, battle).
- `resources`: loads all images and frame-by-frame animated sprites at startup; exposes buckets `images` and `animatedSpriteData` and advances animated sprites each frame via `resources.step(delta)`.

### Coordinate system and z-order
- World units are pixels with a 16px grid (`gridCells(n)` -> `n*16`).
- Draw order: within a `GameObject`, parent draws first, then children by `getDrawChildrenOrdered()`:
  - `drawLayer === "FLOOR"` pushed behind others; otherwise y-sorted ascending so larger y (closer to bottom) renders later.
- HUD objects set `drawLayer = "HUD"` and are drawn after world rendering without camera transform.

### Typical frame flow (happy path)
1. Input events update internal state; on each fixed update: `main.stepEntry(delta)` cascades to all children.
2. First-time `ready()` hooks fire for newly added objects.
3. Entity `step` logic runs: hero movement/interaction, enemy AI, collision checks, UI typewriter progression, etc.
4. `resources.step(delta)` advances animated sprite frames.
5. Render background, translate by camera, draw world objects (y-sorted and floor-first), restore, draw HUD, then `DeathScreen`.

### Key extension points
- Create new entities by extending `GameObject` or `Sprite`; override `drawImage`, `step`, and `ready` as needed; add to the scene with `addChild`.
- Add levels by extending `Level`, composing background/terrain/NPCs/enemies/items, and wiring transitions via events.
- Add animations using `Animations` + `FrameIndexPattern` for sprite-sheet based entities, or new animated sprite definitions in `resources.animatedSprites`.
