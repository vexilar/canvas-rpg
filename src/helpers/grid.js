export const gridCells = n => {
  return n * 16;
}

export const isSpaceFree = (walls, x, y) => {
  // Guard against undefined walls
  if (!walls || typeof walls.has !== 'function') {
    console.warn('isSpaceFree called with invalid walls parameter:', walls);
    return true; // Default to free space if walls is invalid
  }
  
  // Convert to string format for easy lookup
  const str = `${x},${y}`;
  // Check if walls has an entry at this spot
  const isWallPresent = walls.has(str);
  return !isWallPresent;
}

// Base logical resolution the game is authored at
export const DESIGN_WIDTH = 320;
export const DESIGN_HEIGHT = 180;

// Convert normalized coordinates (0..1) into design-space grid coordinates
// Example: getGridPos(0.5, 0.5) -> { x: DESIGN_WIDTH * 0.5, y: DESIGN_HEIGHT * 0.5 }
export const getGridPos = (nx, ny) => {
  const clampedX = Math.max(0, Math.min(1, nx));
  const clampedY = Math.max(0, Math.min(1, ny));
  return {
    x: DESIGN_WIDTH * clampedX,
    y: DESIGN_HEIGHT * clampedY
  };
}