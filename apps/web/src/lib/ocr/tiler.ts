export interface Tile {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function buildPositions(
  frameLength: number,
  tileLength: number,
  step: number
): number[] {
  const positions: number[] = [];
  let cursor = 0;

  while (cursor < frameLength) {
    const capped = Math.min(cursor, Math.max(frameLength - tileLength, 0));
    if (!positions.includes(capped)) {
      positions.push(capped);
    }

    if (cursor + tileLength >= frameLength) {
      break;
    }

    cursor += step;
  }

  if (positions.length === 0) {
    positions.push(0);
  }

  return positions;
}

/**
 * Generates a grid of overlapping tiles to improve OCR accuracy on large frames.
 *
 * @param {number} width Source frame width in pixels.
 * @param {number} height Source frame height in pixels.
 * @param {object} [options] Optional tiling configuration.
 * @param {number} [options.tileSize] Preferred tile size in pixels.
 * @param {number} [options.overlapRatio] Overlap ratio between adjacent tiles.
 * @returns {Tile[]} Normalised tile rectangles covering the frame.
 * @example
 * ```ts
 * const tiles = createTiles(1280, 720, { tileSize: 360, overlapRatio: 0.25 });
 * ```
 */
export function createTiles(
  width: number,
  height: number,
  options: { readonly tileSize?: number; readonly overlapRatio?: number } = {}
): Tile[] {
  if (width <= 0 || height <= 0) {
    return [];
  }

  const tileSize = Math.max(
    64,
    Math.min(options.tileSize ?? 384, Math.max(width, height))
  );
  const overlapRatio = options.overlapRatio ?? 0.2;
  const step = Math.max(1, Math.floor(tileSize * (1 - overlapRatio)));

  const xPositions = buildPositions(width, tileSize, step);
  const yPositions = buildPositions(height, tileSize, step);
  const tiles: Tile[] = [];

  for (const y of yPositions) {
    for (const x of xPositions) {
      tiles.push({
        x,
        y,
        width: Math.min(tileSize, width - x),
        height: Math.min(tileSize, height - y)
      });
    }
  }

  return tiles;
}
