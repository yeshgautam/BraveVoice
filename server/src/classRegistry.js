// Maps a class code to the therapist's Google Sheet. Kept out of source control
// (class-registry.json is gitignored) since it's operational data, not code — add a
// class by editing that file, no redeploy needed. See class-registry.example.json.

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '..', 'class-registry.json');

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.warn(`class-registry.json not found at ${REGISTRY_PATH} — no classes are registered.`);
    return {};
  }
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

let registry = loadRegistry();

function getSpreadsheetId(classCode) {
  return registry[classCode]?.spreadsheetId ?? null;
}

/** Re-reads class-registry.json from disk — useful after adding a class without restarting. */
function reload() {
  registry = loadRegistry();
}

module.exports = { getSpreadsheetId, reload };
