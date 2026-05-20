const fs = require('fs');

// google-services.json is NOT committed (it contains an API key flagged by
// GitHub Secret Scanning). For local dev keep ./google-services.json at the
// repo root; for EAS builds, register it as a file env var:
//   eas env:create --type file --name GOOGLE_SERVICES_JSON --value ./google-services.json
// EAS materialises it at $GOOGLE_SERVICES_JSON and we point Gradle there.
const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ??
  (fs.existsSync('./google-services.json') ? './google-services.json' : undefined);

module.exports = {
  expo: {
    name: 'Quéjate',
    slug: 'quejate-app',
    scheme: 'quejate',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#F0F6FF',
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      softwareKeyboardLayoutMode: 'pan',
      usesCleartextTraffic: false,
      ...(googleServicesFile ? { googleServicesFile } : {}),
      package: 'co.quejate.app',
      versionCode: 1,
      permissions: [
        'android.permission.INTERNET',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.RECEIVE_BOOT_COMPLETED',
        'android.permission.VIBRATE',
      ],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'quejate' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-secure-store',
      'expo-web-browser',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#2563EB',
          sounds: [],
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'La app necesita acceso a tus fotos para adjuntar imágenes a tu queja.',
          cameraPermission: 'La app necesita acceso a la cámara para tomar fotos.',
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'La app necesita tu ubicación para registrar el lugar del problema.',
          locationWhenInUsePermission: 'La app necesita tu ubicación para registrar el lugar del problema.',
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '664c2ce3-3c95-4934-8bac-89b2f92af315',
      },
    },
    owner: 'quejateapp',
  },
};
