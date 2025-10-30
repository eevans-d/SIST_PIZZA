import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 5,
        statements: 5,
        functions: 5,
        branches: 5,
      },
      exclude: [
        'node_modules/',
        'dist/',
        'src/__tests__/',
        // Excluir código no productivo o pesado que hoy no está cubierto
        'src/integrations/**',
        'src/middleware/**',
        'src/middlewares/**',
        'src/compliance/**',
        'src/lib/supabase.ts',
        'scripts/**',
        // Archivos de configuración/metadata
        'vitest.config.ts',
        '.eslintrc.cjs',
        '**/*.config.*',
        '**/*.cjs',
      ],
    },
  },
});
