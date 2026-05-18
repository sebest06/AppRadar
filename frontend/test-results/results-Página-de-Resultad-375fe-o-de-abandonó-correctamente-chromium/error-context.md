# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: results.spec.ts >> Página de Resultados >> debe mostrar el estado de abandonó correctamente
- Location: tests/results.spec.ts:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('table')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('table')

```

```yaml
- navigation:
  - link "AppRadar":
    - /url: /
    - img
    - text: AppRadar
  - link "Ingresar":
    - /url: /login
  - link "Registrarse":
    - /url: /register
- link:
  - /url: /
  - img
- heading [level=1]
- link "Ver en vivo":
  - /url: /races/test-trail-uuid/live
- img
- heading "Sin resultados todavía" [level=3]
- paragraph: La carrera aún no comenzó o no hay datos de corredores.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Página de Resultados', () => {
  4  |   test('debe mostrar el estado de abandonó correctamente', async ({ page }) => {
  5  |     // Nota: Para que este test funcione E2E real, el backend debe tener datos.
  6  |     // Aquí asumimos que navegamos a una carrera existente.
  7  |     await page.goto('/races/test-trail-uuid/results');
  8  | 
  9  |     // Verificar que el título de la página o algún elemento de carga desaparezca
  10 |     const table = page.locator('table');
> 11 |     await expect(table).toBeVisible();
     |                         ^ Error: expect(locator).toBeVisible() failed
  12 | 
  13 |     // Buscar una fila que debería tener el estado de abandono
  14 |     // En un entorno de test controlado, crearíamos este dato primero.
  15 |     const abandonedBadge = page.locator('text=✕ Abandonó');
  16 |     // Si el dato existe, verificamos su estilo
  17 |     if (await abandonedBadge.count() > 0) {
  18 |       await expect(abandonedBadge).toHaveClass(/bg-red-100/);
  19 |       await expect(abandonedBadge).toHaveClass(/text-red-700/);
  20 |     }
  21 |   });
  22 | 
  23 |   test('debe permitir cambiar entre vista general y equipo en vivo', async ({ page }) => {
  24 |     await page.goto('/races/test-trail-uuid/live');
  25 | 
  26 |     // Si el usuario está logueado y tiene equipo, debería ver los botones
  27 |     const teamButton = page.getByRole('button', { name: 'Mi Equipo' });
  28 |     if (await teamButton.isVisible()) {
  29 |       await teamButton.click();
  30 |       await expect(page.getByRole('button', { name: 'Mi Equipo' })).toHaveClass(/bg-green-600/);
  31 |     }
  32 |   });
  33 | });
  34 | 
```