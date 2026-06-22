/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // Carga .env (DATABASE_URL) antes de importar la app
  setupFiles: ['dotenv/config'],
  testMatch: ['**/tests/**/*.test.ts', '**/__tests__/**/*.test.ts'],
  testTimeout: 30000,
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
};
