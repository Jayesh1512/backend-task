// Purpose: Jest configuration for TypeScript tests
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  verbose: true,
  clearMocks: true,
  // optional: run a setup file to load env vars for tests
  setupFiles: ['<rootDir>/tests/setup.ts']
};