class Resources {
  constructor() {
    // Everything we plan to download
    this.toLoad = {
      baddy: "/sprites/baddy-sheet.png",
      hero: "/sprites/hero-sheet.png",
      shadow: "/sprites/shadow.png",
      rod: "/sprites/rod.png",
      exit: "/sprites/exit.png",
      // Outdoor
      sky: "/sprites/sky.png",
      ground: "/sprites/ground.png",
      // Cave
      cave: "/sprites/cave.png",
      caveGround: "/sprites/cave-ground.png",
      // NPCs
      knight: "/sprites/knight-sheet-1.png",
      // HUD
      textBox: "/sprites/text-box.png",
      fontWhite: "/sprites/sprite-font-white.png",
      portraits: "/sprites/portraits-sheet.png",
      fireball: "/sprites/fireball.png"
    };

    // Animated sprite frames (individual PNGs)
    this.animatedSprites = {
      // Add your animated sprite frames here
      // Example:
      // "fireballExplode": {
      //   frames: [
      //     "/sprites/explosion/frame1.png",
      //     "/sprites/explosion/frame2.png",
      //     "/sprites/explosion/frame3.png",
      //     "/sprites/explosion/frame4.png"
      //   ],
      //   frameDelay: 50 // milliseconds per frame
      // }
      "fireballExplode": {
        frames: [
          "/sprites/fireball_explode/img_0.png",
          "/sprites/fireball_explode/img_1.png",
          "/sprites/fireball_explode/img_2.png",
          "/sprites/fireball_explode/img_3.png",
          "/sprites/fireball_explode/img_4.png",
          "/sprites/fireball_explode/img_5.png",
          "/sprites/fireball_explode/img_6.png",
          "/sprites/fireball_explode/img_7.png",
          "/sprites/fireball_explode/img_8.png",
          "/sprites/fireball_explode/img_9.png",
          "/sprites/fireball_explode/img_10.png",
          "/sprites/fireball_explode/img_11.png",
          "/sprites/fireball_explode/img_12.png",
          "/sprites/fireball_explode/img_13.png",
          "/sprites/fireball_explode/img_14.png",
          "/sprites/fireball_explode/img_15.png",
          "/sprites/fireball_explode/img_16.png",
          "/sprites/fireball_explode/img_17.png",
          "/sprites/fireball_explode/img_18.png",
          "/sprites/fireball_explode/img_19.png",
          "/sprites/fireball_explode/img_20.png",
          "/sprites/fireball_explode/img_21.png",
          "/sprites/fireball_explode/img_22.png",
          "/sprites/fireball_explode/img_23.png",
          "/sprites/fireball_explode/img_24.png",
          "/sprites/fireball_explode/img_25.png",
          "/sprites/fireball_explode/img_26.png",
          "/sprites/fireball_explode/img_27.png",
          "/sprites/fireball_explode/img_28.png",
          "/sprites/fireball_explode/img_29.png"
        ],
        frameDelay: 50 // 50ms per frame for smooth animation
      }
    };

    // A bucket to keep all of our images
    this.images = {};
    
    // A bucket to keep all of our animated sprites
    this.animatedSpriteData = {};

    // Load each image
    Object.keys(this.toLoad).forEach(key => {
      const img = new Image();
      img.src = this.toLoad[key];
      this.images[key] = {
        image: img,
        isLoaded: false
      }
      img.onload = () => {
        this.images[key].isLoaded = true;
      }
    });

    // Load each animated sprite
    Object.keys(this.animatedSprites).forEach(key => {
      const spriteConfig = this.animatedSprites[key];
      const frames = [];
      let loadedCount = 0;
      
      spriteConfig.frames.forEach((framePath, index) => {
        const img = new Image();
        img.src = framePath;
        frames[index] = {
          image: img,
          isLoaded: false
        };
        
        img.onload = () => {
          frames[index].isLoaded = true;
          loadedCount++;
          
          // Check if all frames are loaded
          if (loadedCount === spriteConfig.frames.length) {
            this.animatedSpriteData[key] = {
              frames: frames,
              frameDelay: spriteConfig.frameDelay,
              isLoaded: true,
              isAnimated: true
            };
          }
        };
      });
    });
  }

  // Helper method to get a resource (image or animated sprite)
  getResource(name) {
    if (this.images[name]) {
      return this.images[name];
    }
    if (this.animatedSpriteData[name]) {
      return this.animatedSpriteData[name];
    }
    return null;
  }

  // Helper method to check if a resource is loaded
  isResourceLoaded(name) {
    const resource = this.getResource(name);
    if (!resource) return false;
    
    if (resource.isAnimated) {
      // It's an animated sprite
      return resource.isLoaded;
    } else {
      // It's an image
      return resource.isLoaded;
    }
  }

  // Helper method to get the current frame of a resource
  getCurrentFrame(name) {
    const resource = this.getResource(name);
    if (!resource) return null;
    
    if (resource.isAnimated) {
      // It's an animated sprite - return the current frame
      return resource.frames[resource.currentFrame || 0]?.image;
    } else {
      // It's an image - return the image
      return resource.image;
    }
  }

  // Step method to update animated sprite animations
  step(delta) {
    Object.values(this.animatedSpriteData).forEach(spriteData => {
      if (spriteData.isLoaded) {
        // Initialize timing if not set
        if (spriteData.frameTime === undefined) {
          spriteData.frameTime = 0;
          spriteData.currentFrame = 0;
        }
        
        spriteData.frameTime += delta;
        if (spriteData.frameTime >= spriteData.frameDelay) {
          spriteData.frameTime = 0;
          spriteData.currentFrame = (spriteData.currentFrame + 1) % spriteData.frames.length;
        }
      }
    });
  }
}

// Create one instance for the whole app to use
export const resources = new Resources();
