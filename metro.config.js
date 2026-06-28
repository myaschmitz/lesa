// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow importing .pdf files as bundled assets (used by the PDF reader).
config.resolver.assetExts.push('pdf');

module.exports = config;
