/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/../tsconfig.json',
        diagnostics: false,
      },
    ],
  },
  collectCoverageFrom: ['**/*.ts', '!**/*.module.ts', '!main.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/phase2/',
    '<rootDir>/rbac/',
    '<rootDir>/auth/strategies/',
    '<rootDir>/auth/rate-limit/',
  ],
  moduleNameMapper: {
    '^@jersey-commerce/types$': '<rootDir>/../../../packages/types/src',
    '^@jersey-commerce/config$': '<rootDir>/../../../packages/config/src',
    '^@jersey-commerce/utils$': '<rootDir>/../../../packages/utils/src',
    '^@jersey-commerce/validation$': '<rootDir>/../../../packages/validation/src',
  },
};
