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
  },
};
