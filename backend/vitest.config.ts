import { defineConfig } from 'vitest/config'

// Testerna använder ALDRIG din riktiga .env eller din riktiga Supabase.
// Här sätter vi låtsasvärden. SUPABASE_URL pekar på en port där ingenting lyssnar,
// så om ett test av misstag försöker nå databasen går det fel direkt i stället för att röra riktig data.
export default defineConfig({
  test: {
    environment: 'node',
    silent: true, // tysta loggern och onError i testutskriften
    env: {
      SESSION_SECRET: 'x'.repeat(40),
      SUPABASE_URL: 'http://localhost:9',
      SUPABASE_SECRET_KEY: 'test-secret-not-real',
      SUPABASE_PUBLISHABLE_KEY: 'test-publishable-not-real',
      FRONTEND_ORIGIN: 'http://localhost:3000',
      NODE_ENV: 'test',
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'enhet',
          include: ['tests/unit/**/*.test.ts', 'tests/services/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'routes',
          include: ['tests/routes/**/*.test.ts'],
          // Byter ut services mot låtsasfunktioner i alla route-tester
          setupFiles: ['tests/helpers/setup-routes.ts'],
        },
      },
    ],
  },
})
