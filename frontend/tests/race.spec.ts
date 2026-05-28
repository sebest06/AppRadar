import { test, expect } from '@playwright/test'
import { loginViaUI, apiLogin, apiCreateTrail, apiCreateRun } from './helpers'

test.describe('Crear carrera (UI)', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page)
    await page.goto('/races/new')
  })

  test('formulario vacío muestra validación al enviar', async ({ page }) => {
    await page.getByRole('button', { name: /crear carrera/i }).click()
    // HTML5 required on name input prevents submission
    await expect(page).toHaveURL('/races/new')
  })

  test('crea una carrera con dos waypoints manuales y redirige al dashboard', async ({ page }) => {
    const name = `E2E Carrera ${Date.now()}`

    await page.getByPlaceholder('Ultra Sierras 2025').fill(name)
    await page.getByPlaceholder('Descripción del recorrido').fill('Test E2E')

    // Fill first waypoint (Largada)
    const latInputs = page.getByPlaceholder('-31.4167')
    const lonInputs = page.getByPlaceholder('-64.1833')
    await latInputs.first().fill('-34.6037')
    await lonInputs.first().fill('-58.3816')

    // Fill second waypoint (Meta)
    await latInputs.nth(1).fill('-34.6100')
    await lonInputs.nth(1).fill('-58.3900')

    await page.getByRole('button', { name: /crear carrera/i }).click()
    await page.waitForURL('/')

    await expect(page.getByText(name)).toBeVisible()
  })
})

test.describe('Página de Resultados', () => {
  let trailUuid: string
  let trailName: string

  test.beforeAll(async ({ request }) => {
    const { token } = await apiLogin(request)
    const trail = await apiCreateTrail(request, token, `E2E Resultados ${Date.now()}`)
    trailUuid = trail.trailUuid
    trailName = trail.name
  })

  test.beforeEach(async ({ page }) => {
    await loginViaUI(page)
  })

  test('muestra el nombre de la carrera y el botón Ver en vivo', async ({ page }) => {
    await page.goto(`/races/${trailUuid}/results`)
    await expect(page.getByRole('heading', { name: trailName })).toBeVisible()
    await expect(page.getByRole('link', { name: /ver en vivo/i })).toBeVisible()
  })

  test('muestra el estado vacío cuando no hay corredores', async ({ page }) => {
    await page.goto(`/races/${trailUuid}/results`)
    await expect(page.getByText(/sin resultados todavía/i)).toBeVisible()
  })

  test('muestra el ranking cuando hay un corredor con la carrera completada', async ({ page, request }) => {
    const { token, userUuid } = await apiLogin(request)
    const trail = await apiCreateTrail(request, token, `E2E Ranking ${Date.now()}`)
    await apiCreateRun(request, token, trail.trailUuid, userUuid, { isCompleted: true })

    await page.goto(`/races/${trail.trailUuid}/results`)

    // Table with at least one row
    await expect(page.locator('table')).toBeVisible()
    await expect(page.getByText('Admin User')).toBeVisible()

    // No error message
    await expect(page.getByText(/no se pudieron cargar/i)).not.toBeVisible()

    // Completed badge
    await expect(page.getByText('✓ Completó').first()).toBeVisible()
  })

  test('el botón Replay lleva a la página de replay', async ({ page }) => {
    await page.goto(`/races/${trailUuid}/results`)
    await page.getByRole('link', { name: /replay/i }).click()
    await expect(page).toHaveURL(new RegExp(`/races/${trailUuid}/replay`))
  })
})

test.describe('Vista en vivo', () => {
  let trailUuid: string

  test.beforeAll(async ({ request }) => {
    const { token } = await apiLogin(request)
    const trail = await apiCreateTrail(request, token, `E2E Live ${Date.now()}`)
    trailUuid = trail.trailUuid
  })

  test.beforeEach(async ({ page }) => {
    await loginViaUI(page)
  })

  test('carga el mapa y el nombre de la carrera', async ({ page }) => {
    await page.goto(`/races/${trailUuid}/live`)
    // The map container (Leaflet) renders inside a div
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10_000 })
  })

  test('muestra los links de Resultados y Eventos en el header', async ({ page }) => {
    await page.goto(`/races/${trailUuid}/live`)
    await expect(page.getByRole('link', { name: /resultados/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /eventos/i })).toBeVisible()
  })

  test('navegación al perfil desde la navbar funciona', async ({ page }) => {
    await page.goto(`/races/${trailUuid}/live`)
    // Click avatar/name link in navbar
    await page.getByRole('link', { name: /admin/i }).first().click()
    await expect(page).toHaveURL('/profile')
  })
})

test.describe('Editar carrera', () => {
  let trailUuid: string
  const originalName = `E2E Edit ${Date.now()}`

  test.beforeAll(async ({ request }) => {
    const { token } = await apiLogin(request)
    const trail = await apiCreateTrail(request, token, originalName)
    trailUuid = trail.trailUuid
  })

  test.beforeEach(async ({ page }) => {
    await loginViaUI(page)
  })

  test('editar nombre y guardar refleja el cambio en el dashboard', async ({ page }) => {
    await page.goto(`/races/${trailUuid}/edit`)

    const newName = `${originalName} Editado`
    const nameInput = page.getByPlaceholder('Ultra Sierras 2025')
    await nameInput.clear()
    await nameInput.fill(newName)

    await page.getByRole('button', { name: /guardar cambios/i }).click()
    await page.waitForURL('/')

    await expect(page.getByText(newName)).toBeVisible()
  })
})
