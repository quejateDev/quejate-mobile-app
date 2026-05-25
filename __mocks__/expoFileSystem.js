module.exports = {
  __esModule: true,
  cacheDirectory: 'file:///mock-cache/',
  documentDirectory: 'file:///mock-docs/',
  downloadAsync: async (url, target) => ({ uri: target, status: 200, headers: {}, mimeType: null }),
  readAsStringAsync: async () => '',
  writeAsStringAsync: async () => {},
  deleteAsync: async () => {},
  getInfoAsync: async () => ({ exists: false, isDirectory: false, uri: '', size: 0 }),
};
