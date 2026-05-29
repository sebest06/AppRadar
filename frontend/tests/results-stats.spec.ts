/**
 * Tests para las funcionalidades de estadísticas post-carrera (M3):
 *  - Velocidad media, máxima y distancia en la fila expandida de resultados
 *  - Botón "Descargar GPX" y endpoint de descarga
 *  - Botón "Compartir" que copia la URL al portapapeles
 */

import { test, expect, type APIRequestContext, type BrowserContext } from '@playwright/test'
import { randomUUID } from 'crypto'
import { API, loginViaUI, apiLogin, apiCreateTrail } from './helpers'

// ── API helpers ──────────────────────────────────────────────────────────────

async function apiCreateRunWithUuid(
  request: APIRequestContext,
  token: string,
  trailUuid: string,
  userUuid: string,
  runUuid: string,
  startTime: number
) {
  const now = Date.now()
  const res = await request.post(`${API}/runs/upload`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      runUuid,
      trailUuid,
      userUuid,
      startTime,
      endTime: now,
      totalTime: now - startTime,
      isCompleted: true,
      isAbandoned: false,
      sos: false,
    },
  })
  return res.json() as Promise<{ ok: boolean; sessionUuid: string }>
}

async function apiUploadTrack(
  request: APIRequestContext,
  token: string,
  runUuid: string,
  trailUuid: string,
  userUuid: string,
  waypointUuid: string,
  timestamp: number
) {
  await request.post(`${API}/tracks/upload`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { trackUuid: randomUUID(), runUuid, waypointUuid, trailUuid, userUuid, timestamp },
  })
}

async function apiUploadGps(
  request: APIRequestContext,
  token: string,
  trailUuid: string,
  lat: number,
  lon: number,
  timestamp: number
) {
  await request.post(`${API}/gps/upload`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { trailUuid, lat, lon, accuracy: 5, timestamp },
  })
}

// ── Setup compartido ─────────────────────────────────────────────────────────

interface RaceSetup {
  trailUuid: string
  sessionUuid: string
  runUuid: string
  waypoints: Array<{ waypointUuid: string; lat: number; lon: number }>
}

async function setupRaceWithStats(request: APIRequestContext): Promise<RaceSetup> {
  const { token, userUuid } = await apiLogin(request)
  const trail = await apiCreateTrail(request, token, `Stats E2E ${Date.now()}`)
  const trailUuid = trail.trailUuid

  // Obtener waypoints con sus UUIDs
  const detailsRes = await request.get(`${API}/trails/${trailUuid}/details`)
  const details = await detailsRes.json()
  const waypoints = (details.waypoints as any[]).sort((a: any, b: any) => a.order - b.order)

  // Crear run
  const runUuid = randomUUID()
  const startTime = Date.now() - 3_600_000
  const { sessionUuid } = await apiCreateRunWithUuid(request, token, trailUuid, userUuid, runUuid, startTime)

  // Subir tracks para cada waypoint con 30 minutos de diferencia entre ellos
  // → permite calcular velocidad entre segmentos
  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i]
    const ts = startTime + i * 30 * 60 * 1000  // +30 min por waypoint
    await apiUploadTrack(request, token, runUuid, trailUuid, userUuid, wp.waypointUuid, ts)
  }

  // Subir posiciones GPS (necesarias para el endpoint GPX)
  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i]
    const ts = startTime + i * 30 * 60 * 1000
    await apiUploadGps(request, token, trailUuid, wp.lat, wp.lon, ts)
  }

  return { trailUuid, sessionUuid, runUuid, waypoints }
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Estadísticas post-carrera (M3)', () => {
  let setup: RaceSetup

  test.beforeAll(async ({ request }) => {
    setup = await setupRaceWithStats(request)
  })

  test.beforeEach(async ({ page }) => {
    await loginViaUI(page)
  })

  test('la fila expandida muestra distancia y velocidad media del corredor', async ({ page }) => {
    await page.goto(`/races/${setup.trailUuid}/results`)
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 })

    // Expandir la fila del corredor haciendo clic en la celda de posición
    await page.locator('table tbody tr').first().locator('td').first().click()

    // Verificar que aparecen los stats de velocidad
    const expandedRow = page.locator('table tbody tr').nth(1)
    await expect(expandedRow).toContainText('km')       // distancia total
    await expect(expandedRow).toContainText('media')    // velocidad media
    await expect(expandedRow).toContainText('km/h')     // unidad de velocidad
  })

  test('la fila expandida muestra la velocidad máxima del corredor', async ({ page }) => {
    await page.goto(`/races/${setup.trailUuid}/results`)
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 })

    await page.locator('table tbody tr').first().locator('td').first().click()

    const expandedRow = page.locator('table tbody tr').nth(1)
    await expect(expandedRow).toContainText('máx')
  })

  test('la fila expandida muestra el botón de descarga GPX', async ({ page }) => {
    await page.goto(`/races/${setup.trailUuid}/results`)
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 })

    await page.locator('table tbody tr').first().locator('td').first().click()

    const expandedRow = page.locator('table tbody tr').nth(1)
    await expect(expandedRow.getByRole('link', { name: /descargar gpx/i })).toBeVisible()
  })

  test('el endpoint GPX devuelve un archivo GPX válido', async ({ request }) => {
    const { token, userUuid } = await apiLogin(request)
    const res = await request.get(
      `${API}/races/${setup.trailUuid}/gpx/${userUuid}?sessionUuid=${setup.sessionUuid}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('gpx+xml')

    const body = await res.text()
    expect(body).toContain('<gpx')
    expect(body).toContain('<trkpt')
    expect(body).toContain('</gpx>')
  })

  test('el endpoint GPX devuelve 404 si la sesión no existe', async ({ request }) => {
    const { token, userUuid } = await apiLogin(request)
    const res = await request.get(
      `${API}/races/${setup.trailUuid}/gpx/${userUuid}?sessionUuid=00000000-0000-0000-0000-000000000000`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    expect(res.status()).toBe(404)
  })

  test('el botón Compartir copia la URL al portapapeles y muestra confirmación', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    await page.goto(`/races/${setup.trailUuid}/results`)
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: /compartir/i }).click()

    // Aparece el texto de confirmación
    await expect(page.getByText(/link copiado/i)).toBeVisible()

    // El portapapeles contiene la URL de resultados
    const clipboard = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboard).toContain(`/races/${setup.trailUuid}/results`)
  })

  test('el link de resultados es accesible sin iniciar sesión', async ({ browser }) => {
    // Abrir en un contexto limpio (sin cookies ni storage)
    const ctx = await browser.newContext()
    const publicPage = await ctx.newPage()

    await publicPage.goto(`/races/${setup.trailUuid}/results`)

    // La página muestra la tabla sin redirigir al login
    await expect(publicPage.locator('table')).toBeVisible({ timeout: 10_000 })
    await expect(publicPage).not.toHaveURL('/login')

    await ctx.close()
  })
})
