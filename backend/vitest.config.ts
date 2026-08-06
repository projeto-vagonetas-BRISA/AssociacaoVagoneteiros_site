import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      'tests/e2e/**',          // E2E são do Playwright, não do Vitest
      '**/node_modules/**',
      '**/dist/**',
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/generated/**',
        'src/server.ts',                 // bootstrap (listen) — não testável
        'src/routes/index.ts',           // duplicata do registro em app.ts
        'src/utils/firebaseAdmin.ts',    // SDK Firebase externo
        'src/services/notificationScheduler.ts', // agendador de produção
        'src/controllers/galeriaController.ts',  // Google Drive SDK
        'src/lib/prisma.ts',             // factory do client
        'src/utils/image.ts',            // binário/base64 (baixa prioridade)
        'src/@types/**',
      ],
      // thresholds: {
      //   lines: 50,
      //   functions: 50,
      //   branches: 40,
      //   statements: 50,
      // },
    },
  },
});
