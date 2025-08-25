/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src/api/tests'],
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  moduleFileExtensions: ['js','json'],
  verbose: false,
  collectCoverageFrom: ['src/api/**/*.js','!src/api/**/logs/**'],
  coverageThreshold: {
    global: {
      lines: 40,
      statements: 40,
      functions: 30,
      branches: 20,
    }
  }
};
