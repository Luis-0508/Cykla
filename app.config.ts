import type { ExpoConfig } from 'expo/config';

import BRAND from './src/config/branding.json';

const faceIdPermission = `${BRAND.name} kann Face ID verwenden, um deine lokalen Einträge zu schützen.`;
const faceIdPermissionEn = `${BRAND.name} can use Face ID to protect your local entries.`;
// Keep in sync with LANGUAGES in src/i18n/i18n.ts.
const supportedLocales = ['de', 'en'];

const config: ExpoConfig = {
  name: BRAND.name,
  slug: BRAND.slug,
  version: '0.1.0',
  orientation: 'portrait',
  scheme: BRAND.scheme,
  userInterfaceStyle: 'automatic',
  // Localized native strings shown by iOS outside the JavaScript UI.
  locales: {
    de: { ios: { NSFaceIDUsageDescription: faceIdPermission } },
    en: { ios: { NSFaceIDUsageDescription: faceIdPermissionEn } },
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: BRAND.bundleId,
    infoPlist: {
      NSFaceIDUsageDescription: faceIdPermission,
    },
  },
  android: {
    package: BRAND.bundleId,
    adaptiveIcon: {
      backgroundColor: BRAND.colors.offWhite,
    },
    permissions: ['USE_BIOMETRIC', 'USE_FINGERPRINT', 'POST_NOTIFICATIONS'],
  },
  web: {
    bundler: 'metro',
    output: 'single',
  },
  plugins: [
    [
      'expo-router',
      {
        headers: {
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Opener-Policy': 'same-origin',
        },
      },
    ],
    'expo-font',
    // Declares the app languages for the per-app language setting on iOS and Android 13+.
    ['expo-localization', { supportedLocales }],
    'expo-sqlite',
    'expo-secure-store',
    'expo-sharing',
    'expo-splash-screen',
    'expo-status-bar',
    [
      'expo-local-authentication',
      {
        faceIDPermission: faceIdPermission,
      },
    ],
    [
      'expo-notifications',
      {
        defaultChannel: 'reminders',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
