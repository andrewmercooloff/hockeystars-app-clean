/**
 * Dynamic Expo config.
 * Production web export is served at site root (https://hockey-stars.com/).
 */
const appJson = require('./app.json');

module.exports = () => {
  const config = { ...appJson.expo };
  const webExport = process.env.HS_WEB_EXPORT === '1';

  if (webExport) {
    // No baseUrl — URLs are /player/..., /messages, etc.
    config.web = {
      ...(config.web || {}),
      output: 'static',
    };
  }

  return { expo: config };
};
