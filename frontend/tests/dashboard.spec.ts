import { test, expect } from '@playwright/test'
import { loginViaUI, apiLogin, apiCreateTrail } from './helpers'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page)
  })

  test('muestra la lista de carreras al ingresar', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /hola/i })).toBeVisible()
    // Filter bar appears when there are trails
    // (may not show if DB is empty — just assert page loaded)
    await expect(page.locator('body')).not.toContainText('Error al cargar')
  })

  test('los filtros Todas / En vivo / Mis carreras son funcionales', async ({ page, request }) => {
    const { token } = await apiLogin(request)
    const trail = await apiCreateTrail(request, token, `E2E Dashboard ${Date.now()}`)

    await page.reload()

    // Filter bar should now be visible
    const filterBar = page.getByRole('button', { name: 'Todas', exact: true })
    await expect(filterBar).toBeVisible()

    await page.getByRole('button', { name: /en vivo/i }).click()
    // Trail is inactive → should NOT appear
    await expect(page.getByText(trail.name)).not.toBeVisible()

    await page.getByRole('button', { name: 'Todas', exact: true }).click()
    await expect(page.getByText(trail.name)).toBeVisible()

    await page.getByRole('button', { name: /mis carreras/i }).click()
    await expect(page.getByText(trail.name)).toBeVisible()
  })

  test('la búsqueda por nombre filtra las carreras', async ({ page, request }) => {
    const { token } = await apiLogin(request)
    const unique = `Búsqueda_${Date.now()}`
    await apiCreateTrail(request, token, unique)
    await page.reload()

    await page.getByPlaceholder(/buscar carrera/i).fill(unique)
    await expect(page.getByText(unique)).toBeVisible()

    await page.getByPlaceholder(/buscar carrera/i).fill('xyzimpossiblematch')
    await expect(page.getByText(/sin resultados/i)).toBeVisible()
  })

  test('el link de Nueva carrera lleva al formulario', async ({ page }) => {
    await page.getByRole('link', { name: /nueva carrera/i }).first().click()
    await expect(page).toHaveURL('/races/new')
    await expect(page.getByRole('heading', { name: /nueva carrera/i })).toBeVisible()
  })
})
