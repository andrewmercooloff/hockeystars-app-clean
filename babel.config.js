module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated/plugin must be listed last
      'react-native-reanimated/plugin',
    ],
    env: {
      production: {
        plugins: [
          // Strip console.* calls from production bundles (keep errors/warnings)
          ['transform-remove-console', { exclude: ['error', 'warn'] }],
        ],
      },
    },
  };
};
