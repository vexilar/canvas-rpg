import {Vector2} from "./Vector2.js";
import {GameObject} from "./GameObject.js";

export class Sprite extends GameObject {
  constructor({
      resource, // image we want to draw
      frameSize, // size of the crop of the image
      hFrames, // how the sprite arranged horizontally
      vFrames, // how the sprite arranged vertically
      frame, // which frame we want to show
      scale, // how large to draw this image
      position, // where to draw it (top left corner)
      animations,
      hitbox, // new: custom hitbox {x, y, width, height} relative to sprite
    }) {
    super({
      name
    });
    this.resource = resource;
    this.frameSize = frameSize ?? new Vector2(16,16);
    this.hFrames = hFrames ?? 1;
    this.vFrames = vFrames ?? 1;
    this.frame = frame ?? 0;
    this.frameMap = new Map();
    this.scale = scale ?? 1;
    this.position = position ?? new Vector2(0,0);
    this.animations = animations ?? null;
    
    // Hitbox defaults to the sprite bounds if not specified
    this.hitbox = hitbox ?? {
      x: 0,
      y: 0,
      width: this.frameSize.x * this.scale,
      height: this.frameSize.y * this.scale
    };
    
    this.buildFrameMap();
  }

  buildFrameMap() {
    let frameCount = 0;
    for (let v=0; v<this.vFrames; v++) {
      for (let h=0; h<this.hFrames; h++) {
        this.frameMap.set(
            frameCount,
            new Vector2(this.frameSize.x * h, this.frameSize.y * v)
        )
        frameCount++;
      }
    }
  }

  step(delta) {
    if (!this.animations) {
      return;
    }
    this.animations.step(delta);
    this.frame = this.animations.frame;
  }

  // Add method to get world-space hitbox bounds
  getHitboxBounds() {
    const worldX = this.position.x + this.hitbox.x;
    const worldY = this.position.y + this.hitbox.y;
    return {
      x: worldX,
      y: worldY,
      width: this.hitbox.width,
      height: this.hitbox.height
    };
  }

  // Add collision detection method
  collidesWith(otherSprite) {
    const thisBounds = this.getHitboxBounds();
    const otherBounds = otherSprite.getHitboxBounds();
    
    return !(thisBounds.x + thisBounds.width < otherBounds.x ||
             otherBounds.x + otherBounds.width < thisBounds.x ||
             thisBounds.y + thisBounds.height < otherBounds.y ||
             otherBounds.y + otherBounds.height < thisBounds.y);
  }

  drawImage(ctx, x, y) {
    if (!this.resource.isLoaded) {
      return;
    }

    // Get the current image to draw
    let imageToDraw = this.resource.image;
    
    // Check if this is an animated sprite resource
    const isAnimated = this.resource.isAnimated === true;
    
    if (isAnimated) {
      // For animated sprites, get the current frame
      imageToDraw = this.resource.frames[this.resource.currentFrame || 0]?.image;
      if (!imageToDraw) {
        console.warn('No animated sprite frame available');
        return; // No frame available yet
      }
      
      // console.log('Drawing animated sprite frame:', {
      //   frameSize: this.frameSize,
      //   scale: this.scale,
      //   position: { x, y },
      //   imageSize: { width: imageToDraw.width, height: imageToDraw.height },
      //   currentFrame: this.resource.currentFrame || 0
      // });
      
      // For animated sprites, draw the entire frame directly without sprite sheet mapping
      ctx.drawImage(
          imageToDraw,
          x, //Where to place this on canvas tag X (0)
          y, //Where to place this on canvas tag Y (0)
          this.frameSize.x * this.scale, //How large to scale it (X)
          this.frameSize.y * this.scale, //How large to scale it (Y)
      );
      return;
    }

    // For regular sprite sheets, use frame mapping
    // Find the correct sprite sheet frame to use
    let frameCoordX = 0;
    let frameCoordY = 0;
    const frame = this.frameMap.get(this.frame);
    if (frame) {
      frameCoordX = frame.x;
      frameCoordY = frame.y;
    }

    const frameSizeX = this.frameSize.x;
    const frameSizeY = this.frameSize.y;

    ctx.drawImage(
        imageToDraw,
        frameCoordX,
        frameCoordY, // Top Y corner of frame
        frameSizeX, //How much to crop from the sprite sheet (X)
        frameSizeY, //How much to crop from the sprite sheet (Y)
        x, //Where to place this on canvas tag X (0)
        y, //Where to place this on canvas tag Y (0)
        frameSizeX * this.scale, //How large to scale it (X)
        frameSizeY * this.scale, //How large to scale it (Y)
    );
  }

}