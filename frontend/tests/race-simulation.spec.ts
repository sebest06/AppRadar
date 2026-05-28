/**
 * Simulación de carrera completa con dos corredores.
 *
 * Flujo:
 *  1. Crear organizador + equipo
 *  2. Crear dos corredores en ese equipo
 *  3. Organizador acepta a los dos corredores
 *  4. Organizador crea una carrera con 10 waypoints
 *  5. Abrir la vista en vivo como organizador
 *  6. Cada GPS_INTERVAL_MS el runner1 llega al siguiente waypoint, luego runner2
 *  7. Verificar que ambos corredores aparecen en el panel de la carrera
 *  8. Runner1 termina la carrera → verificar que aparece como ganador en Resultados
 *
 * Duración estimada: ~45s (10 waypoints × GPS_INTERVAL_MS × 2 runners)
 */

import { test, expect, type APIRequestContext } from '@playwright/test'
import { randomUUID } from 'crypto'
import { API, loginViaUI } from './helpers'

// 10 waypoints en línea recta (zona Buenos Aires, ~100 m entre cada uno)
const WAYPOINTS_DEF = Array.from({ length: 10 }, (_, i) => ({
  order: i,
  name: i === 0 ? 'Largada' : i === 9 ? 'Meta' : `WP ${i + 1}`,
  lat: -34.600 - i * 0.001,
  lon: -58.380 - i * 0.001,
  radius: 50,
}))

// Simula la cadencia de GPS de la app (5 s en producción, 2 s en tests)
const GPS_INTERVAL_MS = 2_000

// ── API helpers ──────────────────────────────────────────────────────────────

async function registerUser(
  request: APIRequestContext,
  data: { user: string; passw: string; nombre: string; role: string; team?: string; uuid_team?: string }
) {
  const res = await request.post(`${API}/auth/register`, { data })
  return res.json() as Promise<{ token: string; user: { uuid: string; uuid_team: string } }>
}

async function loginAs(request: APIRequestContext, user: string, passw: string) {
  const res = await request.post(`${API}/auth/login`, { data: { user, passw } })
  const body = await res.json()
  return { token: body.token as string, userUuid: body.user.uuid as string }
}

async function acceptRunner(request: APIRequestContext, organizerToken: string, runnerUuid: string) {
  await request.post(`${API}/team/requests/${runnerUuid}/accept`, {
    headers: { Authorization: `Bearer ${organizerToken}` },
  })
}

async function startRun(
  request: APIRequestContext,
  token: string,
  trailUuid: string,
  userUuid: string,
  runUuid: string
) {
  const res = await request.post(`${API}/runs/upload`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { runUuid, trailUuid, userUuid, startTime: Date.now(), isCompleted: false, isAbandoned: false, sos: false },
  })
  return res.json() as Promise<{ ok: boolean; sessionUuid: string }>
}

async function finishRun(
  request: APIRequestContext,
  token: string,
  trailUuid: string,
  userUuid: string,
  runUuid: string
) {
  const now = Date.now()
  await request.post(`${API}/runs/upload`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { runUuid, trailUuid, userUuid, startTime: now - 30_000, endTime: now, totalTime: 30_000, isCompleted: true, isAbandoned: false, sos: false },
  })
}

async function uploadGps(
  request: APIRequestContext,
  token: string,
  trailUuid: string,
  lat: number,
  lon: number
) {
  await request.post(`${API}/gps/upload`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { trailUuid, lat, lon, accuracy: 5, timestamp: Date.now() },
  })
}

async function reachWaypoint(
  request: APIRequestContext,
  token: string,
  runUuid: string,
  trailUuid: string,
  userUuid: string,
  waypointUuid: string
) {
  await request.post(`${API}/tracks/upload`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { trackUuid: randomUUID(), runUuid, waypointUuid, trailUuid, userUuid, timestamp: Date.now() },
  })
}

// ── Test suite ───────────────────────────────────────────────────────────────

test.describe('Simulación de carrera completa', () => {
  const suffix = Date.now()
  const ORG_CREDS  = { user: `org_${suffix}`,  passw: 'password123' }
  const R1_CREDS   = { user: `ana_${suffix}`,  passw: 'password123' }
  const R2_CREDS   = { user: `bru_${suffix}`,  passw: 'password123' }
  const R1_NAME    = `Ana ${suffix}`
  const R2_NAME    = `Bruno ${suffix}`

  let organizerToken: string
  let r1Token: string
  let r1Uuid: string
  let r2Token: string
  let r2Uuid: string
  let trailUuid: string
  let waypoints: Array<{ waypointUuid: string; lat: number; lon: number }>

  test.beforeAll(async ({ request }) => {
    // 1. Registrar organizador
    const org = await registerUser(request, { ...ORG_CREDS, nombre: `Org ${suffix}`, role: 'organizer', team: `Equipo ${suffix}` })
    organizerToken = org.token
    const teamUuid = org.user.uuid_team

    // 2. Registrar dos corredores en el mismo equipo
    const r1 = await registerUser(request, { ...R1_CREDS, nombre: R1_NAME, role: 'runner', uuid_team: teamUuid })
    r1Uuid = r1.user.uuid

    const r2 = await registerUser(request, { ...R2_CREDS, nombre: R2_NAME, role: 'runner', uuid_team: teamUuid })
    r2Uuid = r2.user.uuid

    // 3. Organizador acepta a los dos corredores
    await acceptRunner(request, organizerToken, r1Uuid)
    await acceptRunner(request, organizerToken, r2Uuid)

    // Re-login para obtener tokens con teamStatus: accepted
    ;({ token: r1Token } = await loginAs(request, R1_CREDS.user, R1_CREDS.passw))
    ;({ token: r2Token } = await loginAs(request, R2_CREDS.user, R2_CREDS.passw))

    // 4. Organizador crea la carrera con 10 waypoints
    const trailRes = await request.post(`${API}/trails`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
      data: {
        name: `Sim ${suffix}`,
        description: 'Carrera simulada E2E',
        distanceKm: 10,
        elevationM: 300,
        maxSkip: 0,
        waypoints: WAYPOINTS_DEF,
      },
    })
    const trail = await trailRes.json()
    trailUuid = trail.trailUuid

    // Obtener los waypointUuids del backend (en orden)
    const detailsRes = await request.get(`${API}/trails/${trailUuid}/details`)
    const details = await detailsRes.json()
    waypoints = (details.waypoints as any[]).sort((a, b) => a.order - b.order)
  })

  test('dos corredores completan la carrera y el primero aparece como ganador', async ({ page, request }) => {
    // ── Ambos corredores inician la carrera ──────────────────────────────────
    const r1RunUuid = randomUUID()
    const r2RunUuid = randomUUID()

    await startRun(request, r1Token, trailUuid, r1Uuid, r1RunUuid)
    await startRun(request, r2Token, trailUuid, r2Uuid, r2RunUuid)

    // ── 5. El organizador abre la vista en vivo ──────────────────────────────
    await loginViaUI(page, ORG_CREDS)
    await page.goto(`/races/${trailUuid}/live`)
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10_000 })

    // ── 6. Simulación GPS: cada GPS_INTERVAL_MS los corredores avanzan ───────
    // Runner1 llega primero a cada waypoint, Runner2 llega GPS_INTERVAL_MS/2 después.
    // Esto garantiza que Runner1 tenga timestamps menores → gana el desempate.
    for (const wp of waypoints) {
      // Runner 1 llega al waypoint
      await uploadGps(request, r1Token, trailUuid, wp.lat, wp.lon)
      await reachWaypoint(request, r1Token, r1RunUuid, trailUuid, r1Uuid, wp.waypointUuid)

      await page.waitForTimeout(GPS_INTERVAL_MS / 2)

      // Runner 2 llega al mismo waypoint, más tarde
      await uploadGps(request, r2Token, trailUuid, wp.lat, wp.lon)
      await reachWaypoint(request, r2Token, r2RunUuid, trailUuid, r2Uuid, wp.waypointUuid)

      await page.waitForTimeout(GPS_INTERVAL_MS / 2)
    }

    // ── 7. Verificar que ambos corredores aparecen en el panel lateral ────────
    await expect(page.getByText(R1_NAME, { exact: false })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(R2_NAME, { exact: false })).toBeVisible({ timeout: 10_000 })

    // ── 8. Runner1 termina la carrera ────────────────────────────────────────
    await finishRun(request, r1Token, trailUuid, r1Uuid, r1RunUuid)

    // ── Verificar ganador en la página de Resultados ─────────────────────────
    await page.goto(`/races/${trailUuid}/results`)
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 })

    // La primera fila debe ser Runner1 con el badge de completado
    const firstRow = page.locator('table tbody tr').first()
    await expect(firstRow.getByText(R1_NAME, { exact: false })).toBeVisible()
    await expect(firstRow.getByText('✓ Completó')).toBeVisible()

  })
})
