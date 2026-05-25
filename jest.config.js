module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@navigation/(.*)$': '<rootDir>/src/navigation/$1',
    '^@expo/vector-icons$': '<rootDir>/__mocks__/expoVectorIcons.js',
    '^@expo/vector-icons/(.*)$': '<rootDir>/__mocks__/expoVectorIcons.js',
    '^react-native-maps$': '<rootDir>/__mocks__/reactNativeMaps.js',
    '^react-native-gesture-handler$': '<rootDir>/__mocks__/reactNativeGestureHandler.js',
    '^react-native-view-shot$': '<rootDir>/__mocks__/reactNativeViewShot.js',
    '^expo-image$': '<rootDir>/__mocks__/expoImage.js',
    '^expo-video$': '<rootDir>/__mocks__/expoVideo.js',
    '^expo-video-thumbnails$': '<rootDir>/__mocks__/expoVideoThumbnails.js',
    '^expo-sharing$': '<rootDir>/__mocks__/expoSharing.js',
    '^expo-file-system$': '<rootDir>/__mocks__/expoFileSystem.js',
    '^expo-file-system/legacy$': '<rootDir>/__mocks__/expoFileSystem.js',
  },
};
