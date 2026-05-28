import { test, expect } from '@playwright/test'
import { loginViaUI, apiLogin, apiCreateTrail, apiCreateRun } from './helpers'

test.describe('Perfil de usuario', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page)
    await page.goto('/profile')
  })

  test('muestra el tab de editar perfil con los datos del usuario', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /mi perfil/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /editar perfil/i })).toBeVisible()
    // Nombre del usuario en el input
    await expect(page.getByRole('textbox').first()).toHaveValue(/admin/i)
  })

  test('tab Mis carreras carga sin error cuando no hay historial', async ({ page }) => {
    await page.getByRole('button', { name: /mis carreras/i }).click()

    // No debe mostrar el mensaje de error
    await expect(page.getByText(/no se pudo cargar/i)).not.toBeVisible()

    // Muestra estado vacío o historial
    const isEmpty = await page.getByText(/sin carreras todavía/i).isVisible()
    const hasTable = await page.locator('table, .divide-y').isVisible()
    expect(isEmpty || hasTable).toBe(true)
  })

  test('tab Mis carreras muestra las carreras del usuario', async ({ page, request }) => {
    const { token, userUuid } = await apiLogin(request)
    const trail = await apiCreateTrail(request, token, `E2E Profile ${Date.now()}`)
    await apiCreateRun(request, token, trail.trailUuid, userUuid, { isCompleted: true })

    await page.goto('/profile')
    await page.getByRole('button', { name: /mis carreras/i }).click()

    // La carrera debe aparecer en el historial
    await expect(page.getByText(trail.name)).toBeVisible()

    // No hay error visible
    await expect(page.getByText(/no se pudo cargar/i)).not.toBeVisible()

    // Badge de completado
    await expect(page.getByText('✓ Completó').first()).toBeVisible()
  })

  test('guardar cambios en el perfil actualiza el nombre', async ({ page }) => {
    const newName = `Admin E2E ${Date.now()}`
    const nameInput = page.getByRole('textbox').first()
    await nameInput.clear()
    await nameInput.fill(newName)

    await page.getByRole('button', { name: /guardar cambios/i }).click()

    await expect(page.getByText(/perfil actualizado/i)).toBeVisible()
  })
})
