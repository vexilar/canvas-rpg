import {GameObject} from "../../GameObject.js";
import {resources} from "../../Resource.js";
import {Vector2} from "../../Vector2.js";
import {Sprite} from "../../Sprite.js";
import {getCharacterFrame, getCharacterWidth} from "./spriteFontMap.js";
import {events} from "../../Events.js";

export class SpriteTextString extends GameObject {
  constructor(config={}) {
    super({
      position: new Vector2(32, 108)
    });


    // Draw on top layer
    this.drawLayer = "HUD";

    // Create an array of words (because it helps with line wrapping later)
    const content = config.string ?? "Default text";
    this.words = content.split(" ").map(word => {

      // We need to know how wide this word is
      let wordWidth = 0;

      // Break each word into single characters
      const chars = word.split("").map(char => {
        // Measure each one
        const charWidth = getCharacterWidth(char);
        wordWidth += charWidth;

        // Also create a Sprite for each character in the word
        return {
          width: charWidth,
          sprite: new Sprite({
            resource: resources.images.fontWhite,
            hFrames: 13,
            vFrames: 6,
            frame: getCharacterFrame(char)
          })
        }
      })

      // Return a length and a list of characters per word
      return {
        wordWidth,
        chars
      }
    })

    // Create background for text
    this.backdrop = new Sprite({
      resource: resources.images.textBox,
      frameSize: new Vector2(256, 64)
    })

    // Create a portrait
    this.portrait = new Sprite({
      resource: resources.images.portraits,
      hFrames: 4,
      frame: config.portraitFrame ?? 0
    })

    // Typewriter
    this.showingIndex = 0;
    this.finalIndex = this.words.reduce((acc, word) => acc + word.chars.length, 0);
    this.textSpeed = 80;
    this.timeUntilNextShow = this.textSpeed;

  }

  step(delta, root) {

    // Listen for user Input
    /** @type {Input} */
    const input = root.input;
    if (input?.getActionJustPressed("Space")) {
      if (this.showingIndex < this.finalIndex) {
        // Skip
        this.showingIndex = this.finalIndex;
        return;
      }

      // Done with the textbox
      events.emit("END_TEXT_BOX");
    }

    // Work on typewriter
    this.timeUntilNextShow -= delta;
    if (this.timeUntilNextShow <= 0) {
      // Increase amount of characters that are drawn
      this.showingIndex += 1;

      // Reset time counter for next character
      this.timeUntilNextShow = this.textSpeed;
    }
  }

  drawImage(ctx, drawPosX, drawPosY) {
    // Draw the backdrop
    this.backdrop.drawImage(ctx, drawPosX, drawPosY)

    // Draw the portrait
    this.portrait.drawImage(ctx, drawPosX+6, drawPosY+6);

    // Configuration options
    const PADDING_LEFT = 27;
    const PADDING_TOP = 9;
    const LINE_WIDTH_MAX = 240;
    const LINE_VERTICAL_HEIGHT = 14;

    // Initial position of cursor
    let cursorX = drawPosX + PADDING_LEFT;
    let cursorY = drawPosY + PADDING_TOP;
    let currentShowingIndex = 0;

    this.words.forEach(word => {

      // Decide if we can fit this next word on this next line
      const spaceRemaining = drawPosX + LINE_WIDTH_MAX - cursorX;
      if (spaceRemaining < word.wordWidth) {
        cursorX = drawPosX + PADDING_LEFT
        cursorY += LINE_VERTICAL_HEIGHT;
      }

      // Draw this whole segment of text
      word.chars.forEach(char => {

        // Stop here if we should not yet show the following characters
        if (currentShowingIndex > this.showingIndex) {
          return;
        }

        const {sprite, width} = char;

        const withCharOffset = cursorX - 5;
        sprite.draw(ctx, withCharOffset, cursorY)

        // Add width of the character we just printed to cursor pos
        cursorX += width;

        // plus 1px between character
        cursorX += 1;

        // Uptick the index we are counting
        currentShowingIndex += 1;
      })

      // Move the cursor over
      cursorX += 3;
    })


  }
}













