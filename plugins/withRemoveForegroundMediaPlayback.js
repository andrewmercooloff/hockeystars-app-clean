const { withAndroidManifest } = require('@expo/config-plugins');

const PERM = 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK';

/**
 * Убирает FOREGROUND_SERVICE_MEDIA_PLAYBACK из merge (expo-av).
 * Должен идти сразу после плагина expo-av в app.json.
 */
function withRemoveForegroundMediaPlayback(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }
    const perms = Array.isArray(manifest['uses-permission'])
      ? manifest['uses-permission']
      : [manifest['uses-permission']];

    const already = perms.some(
      (p) => p.$?.['android:name'] === PERM && p.$?.['tools:node'] === 'remove'
    );
    if (!already) {
      perms.push({
        $: {
          'android:name': PERM,
          'tools:node': 'remove',
        },
      });
      manifest['uses-permission'] = perms;
    }
    return config;
  });
}

module.exports = withRemoveForegroundMediaPlayback;
