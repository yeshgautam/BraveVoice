/**
 * The web build loads CanvasKit from /canvaskit.wasm before mounting the app, so
 * the binary is copied out of node_modules instead of being committed.
 */
const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', 'node_modules', 'canvaskit-wasm', 'bin', 'full', 'canvaskit.wasm');
const targetDir = path.join(__dirname, '..', 'public');
const target = path.join(targetDir, 'canvaskit.wasm');

if (!fs.existsSync(source)) {
  // Skia is native on iOS and Android; the web asset is optional.
  process.exit(0);
}
fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);
