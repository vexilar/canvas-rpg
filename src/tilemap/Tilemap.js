import {GameObject} from "../GameObject.js";

export class Tilemap extends GameObject {
  constructor({ tileSize, width, height, tilesetImage, tilesetCols, data, drawLayer }) {
    super({});
    this.tileSize = tileSize;
    this.mapWidth = width;
    this.mapHeight = height;
    this.tilesetImage = tilesetImage; // HTMLImageElement
    this.tilesetCols = tilesetCols;
    this.data = data; // flat array (CSV) length width*height
    this.drawLayer = drawLayer ?? null;
  }

  drawImage(ctx, x, y) {
    const img = this.tilesetImage;
    if (!img || !img.complete) return;
    const ts = this.tileSize;
    const mapW = this.mapWidth;
    const mapH = this.mapHeight;
    const cols = this.tilesetCols;

    for (let ty = 0; ty < mapH; ty++) {
      for (let tx = 0; tx < mapW; tx++) {
        const idx = ty * mapW + tx;
        const gid = this.data[idx];
        if (!gid) continue; // 0 = empty
        const tileIndex = gid - 1; // assuming firstgid=1
        const sx = (tileIndex % cols) * ts;
        const sy = Math.floor(tileIndex / cols) * ts;
        ctx.drawImage(
          img,
          sx, sy, ts, ts,
          x + this.position.x + tx * ts,
          y + this.position.y + ty * ts,
          ts, ts
        );
      }
    }
  }
}


