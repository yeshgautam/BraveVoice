const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// three.js ships .cjs builds that Metro needs to be told about.
config.resolver.sourceExts = [...new Set([...config.resolver.sourceExts, 'cjs', 'mjs'])];

module.exports = config;
