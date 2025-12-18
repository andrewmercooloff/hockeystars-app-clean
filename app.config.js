// Dynamic Expo config to enable Branch deferred deep links via env vars.
// This keeps production stable unless you explicitly set BRANCH env values in EAS.

const base = require('./app.json');

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

module.exports = () => {
  // Start from app.json to avoid accidental drift
  const expo = JSON.parse(JSON.stringify(base.expo));

  // Branch configuration (set these in EAS secrets / build env)
  // Example:
  //  EXPO_PUBLIC_BRANCH_KEY=key_live_xxx
  //  EXPO_PUBLIC_BRANCH_APP_DOMAIN=hockeystars.app.link
  //  EXPO_PUBLIC_BRANCH_APP_DOMAIN_ALT=hockeystars-alternate.app.link
  const branchKey = process.env.EXPO_PUBLIC_BRANCH_KEY;
  const branchDomain = process.env.EXPO_PUBLIC_BRANCH_APP_DOMAIN;
  const branchAltDomain = process.env.EXPO_PUBLIC_BRANCH_APP_DOMAIN_ALT;

  expo.extra = expo.extra || {};
  expo.extra.branchAppDomain = branchDomain || '';
  expo.extra.branchAppDomainAlt = branchAltDomain || '';

  const branchEnabled = Boolean(branchKey && branchDomain);
  expo.extra.branchEnabled = branchEnabled;

  if (branchEnabled) {
    expo.plugins = expo.plugins || [];

    expo.plugins.push([
      '@config-plugins/react-native-branch',
      {
        apiKey: branchKey,
        iosAppDomain: branchDomain,
        androidAppDomain: branchDomain,
      },
    ]);

    // Keep existing Universal Links and add Branch domains
    expo.ios = expo.ios || {};
    expo.ios.associatedDomains = uniq([
      ...(expo.ios.associatedDomains || []),
      `applinks:${branchDomain}`,
      branchAltDomain ? `applinks:${branchAltDomain}` : null,
    ]);

    // Add Android intent filter for Branch domain so links open the app when installed
    expo.android = expo.android || {};
    expo.android.intentFilters = expo.android.intentFilters || [];
    expo.android.intentFilters.push({
      action: 'VIEW',
      autoVerify: true,
      data: [
        {
          scheme: 'https',
          host: branchDomain,
          pathPrefix: '/',
        },
      ],
      category: ['BROWSABLE', 'DEFAULT'],
    });
  }

  return { expo };
};
