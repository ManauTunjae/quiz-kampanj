import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Frontend-tester: jsdom låtsas vara en webbläsare. Inget Next.js-server eller Supabase behövs.
export default defineConfig({
  resolve: {
    // Samma genväg som i tsconfig.json: "@/lib/..." betyder "./lib/..."
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    silent: true,
    setupFiles: ['tests/setup.ts'],
  },
})
