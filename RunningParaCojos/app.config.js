// app.config.js — dynamic Expo config
// Set GOOGLE_MAPS_API_KEY in your environment or in a .env file (gitignored).
// Example:  GOOGLE_MAPS_API_KEY=AIza... npx expo prebuild --platform android

export default ({ config }) => ({
  ...config,
  name: 'Running Para Cojos',
  slug: 'RunningParaCojos',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FF6B35',
  },
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Se necesita acceso a tu ubicación para trazar tu ruta de carrera.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Se necesita acceso a tu ubicación en segundo plano para continuar registrando tu ruta cuando la app no está visible.',
      UIBackgroundModes: ['location'],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FF6B35',
    },
    edgeToEdgeEnabled: true,
    permissions: [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_LOCATION',
    ],
    // Google Maps API key — supply via GOOGLE_MAPS_API_KEY environment variable
    ...(process.env.GOOGLE_MAPS_API_KEY && {
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    }),
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-sqlite',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Se necesita acceso a tu ubicación para trazar tu ruta de carrera.',
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
  ],
});
