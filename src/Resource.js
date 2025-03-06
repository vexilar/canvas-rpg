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

    // A bucket to keep all of our images
    this.images = {};

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
    })
  }
}

// Create one instance for the whole app to use
export const resources = new Resources();
