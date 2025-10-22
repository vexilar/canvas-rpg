export async function loadTiledMap(jsonUrl) {
  const resp = await fetch(jsonUrl);
  const map = await resp.json();

  const tileSize = map.tilewidth;
  const width = map.width;
  const height = map.height;

  // Resolve tileset image
  const ts = map.tilesets[0];
  const baseUrl = new URL(jsonUrl, window.location.origin);
  let imageUrl = null;
  let imageWidth = null;
  if (ts.source) {
    // External TSX: fetch and parse minimal bits
    const tsxUrl = new URL(ts.source, baseUrl).toString();
    const tsxText = await fetch(tsxUrl).then(r => r.text());
    const imgMatch = tsxText.match(/<image[^>]*source="([^"]+)"[^>]*width="(\d+)"/);
    if (!imgMatch) throw new Error("Could not parse tileset image from TSX");
    imageUrl = new URL(imgMatch[1], tsxUrl).toString();
    imageWidth = parseInt(imgMatch[2], 10);
  } else {
    imageUrl = new URL(ts.image, baseUrl).toString();
    imageWidth = ts.imagewidth;
  }

  const image = await loadImage(imageUrl);
  const tilesetCols = Math.floor(imageWidth / tileSize);

  // Categorize layers
  const tileLayers = map.layers.filter(l => l.type === "tilelayer");
  const floorLayers = [];
  const overlayLayers = [];
  let collisionLayer = null;
  
  // Helper to check if layer has collides=true property
  const hasCollidesProperty = (layer) => {
    return layer.properties?.some(p => p.name === "collides" && p.value === true);
  };
  
  tileLayers.forEach(l => {
    const name = (l.name || "").toLowerCase();
    const isCollisionLayer = /collide|collision|walls|block/.test(name) || hasCollidesProperty(l);
    
    if (isCollisionLayer) {
      collisionLayer = l;
      // Also draw collision layer as floor so tiles are visible
      floorLayers.push(l);
      return;
    }
    if (/overlay|above/.test(name)) {
      overlayLayers.push(l);
    } else {
      floorLayers.push(l);
    }
  });

  const walls = new Set();
  if (collisionLayer?.data) {
    collisionLayer.data.forEach((gid, i) => {
      if (!gid) return;
      const x = (i % width) * tileSize;
      const y = Math.floor(i / width) * tileSize;
      walls.add(`${x},${y}`);
    });
  }

  // Object layers
  const objects = [];
  map.layers.filter(l => l.type === "objectgroup").forEach(l => {
    l.objects.forEach(o => objects.push(o));
  });

  return {
    tileSize, width, height,
    image,
    tilesetCols,
    // Back-compat single layers
    floorData: floorLayers[0]?.data ?? null,
    overlayData: overlayLayers[0]?.data ?? null,
    // Multiple layers support (rendered in order)
    floorLayers: floorLayers.map(l => l.data),
    overlayLayers: overlayLayers.map(l => l.data),
    walls,
    objects,
  };
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}


