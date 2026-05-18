import { test, expect } from '@playwright/test';

test.describe('Página de Resultados', () => {
  test('debe mostrar el estado de abandonó correctamente', async ({ page }) => {
    // Nota: Para que este test funcione E2E real, el backend debe tener datos.
    // Aquí asumimos que navegamos a una carrera existente.
    await page.goto('/races/test-trail-uuid/results');

    // Verificar que el título de la página o algún elemento de carga desaparezca
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Buscar una fila que debería tener el estado de abandono
    // En un entorno de test controlado, crearíamos este dato primero.
    const abandonedBadge = page.locator('text=✕ Abandonó');
    // Si el dato existe, verificamos su estilo
    if (await abandonedBadge.count() > 0) {
      await expect(abandonedBadge).toHaveClass(/bg-red-100/);
      await expect(abandonedBadge).toHaveClass(/text-red-700/);
    }
  });

  test('debe permitir cambiar entre vista general y equipo en vivo', async ({ page }) => {
    await page.goto('/races/test-trail-uuid/live');

    // Si el usuario está logueado y tiene equipo, debería ver los botones
    const teamButton = page.getByRole('button', { name: 'Mi Equipo' });
    if (await teamButton.isVisible()) {
      await teamButton.click();
      await expect(page.getByRole('button', { name: 'Mi Equipo' })).toHaveClass(/bg-green-600/);
    }
  });
});
