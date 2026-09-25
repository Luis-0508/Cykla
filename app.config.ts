import type { ExpoConfig } from 'expo/config';

import BRAND from './src/config/branding.json';

const faceIdPermission = `${BRAND.name} kann Face ID verwenden, um deine lokalen Einträge zu schützen.`;

const config: ExpoConfig = {
  name: BRAND.name,
  slug: BRAND.slug,
  version: '0.1.0',
  orientation: 'portrait',
  scheme: BRAND.scheme,
  userInterfaceStyle: 'automatic',
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
