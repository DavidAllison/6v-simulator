/**
 * Fast bitmap rendering for large lattices.
 *
 * For very large N (e.g. 1024x1024) drawing every vertex as bold path segments
 * is infeasible. Instead we paint one pixel per vertex, coloured by vertex type,
 * straight into an ImageData buffer and blit it with a single putImageData. The
 * canvas is sized to the lattice (one device pixel per vertex); the surrounding
 * pan/zoom transform scales it up, so draw cost is bounded by vertex count, not
 * by on-screen pixels or zoom level.
 *
 * The numeric vertex ids match the VERTEX_* constants in cStyleFlipLogic
 * (a1=0, a2=1, b1=2, b2=3, c1=4, c2=5).
 */

// Okabe–Ito CVD-safe palette, matching the --vertex-* tokens in global.css.
// Order is [a1, a2, b1, b2, c1, c2].
const VERTEX_RGB: ReadonlyArray<readonly [number, number, number]> = [
  [0xd5, 0x5e, 0x00], // a1
  [0xe6, 0x9f, 0x00], // a2
  [0x00, 0x72, 0xb2], // b1
  [0x56, 0xb4, 0xe9], // b2
  [0x00, 0x9e, 0x73], // c1
  [0xcc, 0x79, 0xa7], // c2
];

/**
 * Paint a flat row-major Int8Array of numeric vertex types into the context,
 * one pixel per vertex. `vertices` must have at least width*height entries.
 */
export function paintLatticeBitmap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  vertices: Int8Array,
): void {
  const count = width * height;
  const img = ctx.createImageData(width, height);
  const data = img.data;
  for (let i = 0; i < count; i++) {
    const rgb = VERTEX_RGB[vertices[i]] ?? VERTEX_RGB[0];
    const o = i << 2;
    data[o] = rgb[0];
    data[o + 1] = rgb[1];
    data[o + 2] = rgb[2];
    data[o + 3] = 0xff;
  }
  ctx.putImageData(img, 0, 0);
}

/** The RGB triple a numeric vertex type maps to (exposed for tests). */
export function vertexTypeRgb(type: number): readonly [number, number, number] {
  return VERTEX_RGB[type] ?? VERTEX_RGB[0];
}
