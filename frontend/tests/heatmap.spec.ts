/**
 * Tests E2E para el heatmap de posiciones (M4).
 * Setup: 50 corredores, ruta con 40 waypoints (1 km entre cada uno).
 * Los 50 corredores corren en paralelo, subiendo GPS + tracks por cada waypoint.
 * El test verifica que el botón activa la capa de calor en el mapa.
 *
 * Tiempo estimado de setup: ~15-30 s (requests paralelas al backend local).
 */

import { test, expect, type APIRequestContext } from '@playwright/test'
import { randomUUID } from 'crypto'
import { API, loginViaUI, apiLogin } from './helpers'

const RUNNER_COUNT = 50
const WAYPOINT_COUNT = 40
const BASE_LAT = -34.6037
const BASE_LON = -58.3816
const WP_LAT_STEP = 0.009   // ~1 km por waypoint en latitud
const WP_LON_STEP = 0.002   // leve variación en longitud

// ── Helpers de setup ─────────────────────────────────────────────────────────

async function apiRegisterRunner(
  request: APIRequestContext,
  uuid_team: string,
  suffix: string
) {
  const res = await request.post(`${API}/auth/register`, {
    data: { user: `runner_hm_${suffix}`, passw: '1234', nombre: `Corredor HM ${suffix}`, role: 'runner', uuid_team },
  })
  const body = await res.json()
  return { userUuid: body.user.uuid as string, token: body.token as string }
}

async function apiAcceptRunner(request: APIRequestContext, adminToken: string, userUuid: string) {
  await request.post(`${API}/team/requests/${userUuid}/accept`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
}

async function apiCreateBigTrail(request: APIRequestContext, token: string, name: string) {
  const waypoints = Array.from({ length: WAYPOINT_COUNT }, (_, i) => ({
    order: i,
    name: i === 0 ? 'Largada' : i === WAYPOINT_COUNT - 1 ? 'Meta' : `CP${i}`,
    lat: +(BASE_LAT + i * WP_LAT_STEP).toFixed(6),
    lon: +(BASE_LON + i * WP_LON_STEP).toFixed(6),
    radius: 100,
  }))
  const res = await request.post(`${API}/trails`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, description: 'Heatmap E2E', distanceKm: 40, elevationM: 1200, maxSkip: 5, waypoints },
  })
  return res.json() as Promise<{ trailUuid: string }>
}

async function apiSimulateRunner(
  request: APIRequestContext,
  adminToken: string,
  runnerToken: string,
  userUuid: string,
  trailUuid: string,
  waypoints: Array<{ waypointUuid: string; lat: number; lon: number }>,
  startTime: number
) {
  const runUuid = randomUUID()
  const endTime = startTime + waypoints.length * 5 * 60_000

  await request.post(`${API}/runs/upload`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      runUuid, trailUuid, userUuid,
      startTime, endTime, totalTime: endTime - startTime,
      isCompleted: true, isAbandoned: false, sos: false,
    },
  })

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i]
    const ts = startTime + i * 5 * 60_000
    await request.post(`${API}/gps/upload`, {
      headers: { Authorization: `Bearer ${runnerToken}` },
      data: { trailUuid, lat: wp.lat, lon: wp.lon, accuracy: 8, timestamp: ts },
    })
    await request.post(`${API}/tracks/upload`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { trackUuid: randomUUID(), runUuid, waypointUuid: wp.waypointUuid, trailUuid, userUuid, timestamp: ts },
    })
  }
}

// ── Setup global (se ejecuta una vez antes de todos los tests del archivo) ───

let trailUuid = ''

test.beforeAll(async ({ request }) => {
  const { token: adminToken } = await apiLogin(request)

  const meRes = await request.get(`${API}/me`, { headers: { Authorization: `Bearer ${adminToken}` } })
  const me = await meRes.json()
  const teamUuid = me.uuid_team as string

  // Crear ruta con 40 waypoints
  const trail = await apiCreateBigTrail(request, adminToken, `Heatmap Race ${Date.now()}`)
  trailUuid = trail.trailUuid

  // Obtener waypoints con sus UUIDs ordenados
  const detailsRes = await request.get(`${API}/trails/${trailUuid}/details`)
  const details = await detailsRes.json()
  const waypoints = (details.waypoints as any[])
    .sort((a: any, b: any) => a.order - b.order)
    .map((w: any) => ({ waypointUuid: w.waypointUuid, lat: w.lat, lon: w.lon }))

  // Registrar 50 corredores en paralelo
  const suffix = `${Date.now()}`
  const runners = await Promise.all(
    Array.from({ length: RUNNER_COUNT }, (_, i) =>
      apiRegisterRunner(request, teamUuid, `${suffix}_${i}`)
    )
  )

  // Aceptar a los 50 corredores en el equipo
  await Promise.all(runners.map(r => apiAcceptRunner(request, adminToken, r.userUuid)))

  // Simular la carrera completa de los 50 corredores en paralelo
  // Cada corredor empieza 10 s después del anterior para que los timestamps no colisionen
  const baseStart = Date.now() - WAYPOINT_COUNT * 6 * 60_000
  await Promise.all(
    runners.map((r, i) =>
      apiSimulateRunner(request, adminToken, r.token, r.userUuid, trailUuid, waypoints, baseStart + i * 10_000)
    )
  )
}, 300_000)

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Heatmap de posiciones (M4)', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page)
  })

  test('el botón Heatmap activa la capa de calor en el mapa', async ({ page }) => {
    await page.goto(`/races/${trailUuid}/live`)
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15_000 })

    const heatmapBtn = page.getByRole('button', { name: /heatmap/i })
    await expect(heatmapBtn).toBeVisible()

    // Estado inicial: desactivado (fondo blanco)
    await expect(heatmapBtn).not.toHaveClass(/bg-orange-500/)

    // Interceptar la llamada al endpoint de heatmap para confirmar que se ejecuta
    const heatmapRequest = page.waitForResponse(
      res => res.url().includes('/heatmap') && res.status() === 200
    )

    await heatmapBtn.click()

    // El endpoint de heatmap responde con los puntos GPS
    const heatmapRes = await heatmapRequest
    const points = await heatmapRes.json()
    expect(points.length).toBe(RUNNER_COUNT * WAYPOINT_COUNT)  // 50 × 40 = 2000

    // Botón cambia a estado activo (naranja)
    await expect(heatmapBtn).toHaveClass(/bg-orange-500/, { timeout: 5_000 })

    // La capa canvas del heatmap aparece en el mapa
    await expect(page.locator('canvas.leaflet-heatmap-layer')).toBeVisible({ timeout: 10_000 })
  })

  test('el heatmap se desactiva al hacer clic nuevamente', async ({ page }) => {
    await page.goto(`/races/${trailUuid}/live`)
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15_000 })

    const heatmapBtn = page.getByRole('button', { name: /heatmap/i })

    // Activar
    await heatmapBtn.click()
    await expect(heatmapBtn).toHaveClass(/bg-orange-500/, { timeout: 5_000 })
    await expect(page.locator('canvas.leaflet-heatmap-layer')).toBeVisible({ timeout: 10_000 })

    // Desactivar
    await heatmapBtn.click()
    await expect(heatmapBtn).not.toHaveClass(/bg-orange-500/)
    await expect(page.locator('canvas.leaflet-heatmap-layer')).toBeHidden({ timeout: 5_000 })
  })

  test('el endpoint de heatmap devuelve los 2000 puntos GPS sin autenticación', async ({ request }) => {
    const res = await request.get(`${API}/races/${trailUuid}/heatmap`)
    expect(res.status()).toBe(200)
    const points = await res.json()

    // 50 corredores × 40 waypoints = 2000 puntos GPS
    expect(points).toHaveLength(RUNNER_COUNT * WAYPOINT_COUNT)

    // Cada punto es [lat, lon]
    const first = points[0]
    expect(first).toHaveLength(2)
    expect(typeof first[0]).toBe('number')
    expect(typeof first[1]).toBe('number')
  })

  test('el endpoint de heatmap filtrado por sesión devuelve solo los puntos de esa sesión', async ({ request }) => {
    const { token } = await apiLogin(request)

    // Sin filtro: 2000 puntos
    const allRes = await request.get(`${API}/races/${trailUuid}/heatmap`)
    const allPoints = await allRes.json()
    expect(allPoints.length).toBe(RUNNER_COUNT * WAYPOINT_COUNT)

    // Con sesión inexistente: 0 puntos
    const emptyRes = await request.get(
      `${API}/races/${trailUuid}/heatmap?sessionUuid=00000000-0000-0000-0000-000000000000`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    expect(emptyRes.status()).toBe(200)
    expect(await emptyRes.json()).toHaveLength(0)
  })
})
