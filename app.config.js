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
    // 'quejate' = deep links de la app. El sign-in con Google ahora es nativo
    // (@react-native-google-signin/google-signin) y NO usa un redirect por scheme,
    // por eso ya no se declara el reverse-client-id.
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
        'android.permission.RECORD_AUDIO',
        'android.permission.CAMERA',
        // No declaramos READ_MEDIA_IMAGES / READ_EXTERNAL_STORAGE: la selección de
        // imágenes/videos usa el selector de fotos del sistema (photo picker de
        // expo-image-picker), que no requiere acceso amplio a la galería. Así
        // cumplimos la política de Photo & Video Permissions de Google Play.
        'android.permission.VIBRATE',
      ],
      // Sin RECEIVE_BOOT_COMPLETED: la app no usa notificaciones programadas
      // (solo push FCM, que no lo necesita) y expo-notifications lo inyecta por
      // defecto. Con targetSdk 35+, Play marca "Restricted foreground service
      // types" por la combinación boot receiver + servicios de micrófono de
      // expo-audio (sonómetro); bloquearlo elimina esa ruta.
      blockedPermissions: ['android.permission.RECEIVE_BOOT_COMPLETED'],
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
      '@react-native-google-signin/google-signin',
      'expo-font',
      'expo-mail-composer',
      'expo-video',
      [
        // Sonómetro (Contaminación auditiva). El usage description de micrófono
        // es OBLIGATORIO para que iOS no rechace el build en review.
        'expo-audio',
        {
          microphonePermission:
            'La app necesita acceso al micrófono para medir el nivel de ruido (sonómetro).',
        },
      ],
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
