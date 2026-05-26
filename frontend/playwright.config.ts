import { defineConfig, devices } from '@playwright/test';

/**
 * Ver documentación en https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Ejecutar tests en archivos en paralelo */
  fullyParallel: true,
  /* Fallar el build en CI si olvidaste test.only */
  forbidOnly: !!process.env.CI,
  /* Reintentos */
  retries: process.env.CI ? 2 : 0,
  /* Opt-out de ejecución paralela en CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter a usar. Ver https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Ajustes compartidos para todos los proyectos abajo. Ver https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL para usar en acciones como `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',

    /* Recolectar traza cuando falla el primer reintento de un test. Ver https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configurar proyectos para navegadores mayores */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* Ejecutar tu servidor local antes de empezar los tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
