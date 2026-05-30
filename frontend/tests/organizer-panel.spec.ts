/**
 * Tests E2E para el Panel del Organizador (A3):
 *  - Lista de corredores con estados (SOS, completó, abandonó, en carrera)
 *  - Envío de mensajes individuales y broadcast
 *  - Control de acceso: solo organizadores
 *  - Link "Panel" en la vista en vivo
 */

import { test, expect, type APIRequestContext } from '@playwright/test'
import { randomUUID } from 'crypto'
import { API, loginViaUI, apiLogin } from './helpers'

// ── Helpers de setup ──────────────────────────────────────────────────────────

async function apiRegisterOrganizer(request: APIRequestContext, suffix: string) {
  const res = await request.post(`${API}/auth/register`, {
    data: {
      user: `org_panel_${suffix}`,
      passw: '123456',
      nombre: `Organizador Panel ${suffix}`,
      role: 'organizer',
      team: `Equipo Panel ${suffix}`,
    },
  })
  const body = await res.json()
  return { token: body.token as string, uuid: body.user.uuid as string, teamUuid: body.user.uuid_team as string }
}

async function apiRegisterRunner(request: APIRequestContext, teamUuid: string, suffix: string) {
  const res = await request.post(`${API}/auth/register`, {
    data: { user: `runner_panel_${suffix}`, passw: '123456', nombre: `Corredor ${suffix}`, role: 'runner', uuid_team: teamUuid },
  })
  const body = await res.json()
  return { token: body.token as string, uuid: body.user.uuid as string }
}

async function apiCreateTrailSimple(request: APIRequestContext, token: string, name: string) {
  const res = await request.post(`${API}/trails`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      description: 'Panel E2E',
      distanceKm: 5,
      elevationM: 300,
      maxSkip: 1,
      waypoints: [
        { order: 0, name: 'Largada', lat: -34.6037, lon: -58.3816, radius: 50 },
        { order: 1, name: 'CP1',     lat: -34.6100, lon: -58.3850, radius: 50 },
        { order: 2, name: 'Meta',    lat: -34.6160, lon: -58.3900, radius: 50 },
      ],
    },
  })
  return (await res.json()) as { trailUuid: string }
}

async function apiUploadRun(
  request: APIRequestContext,
  token: string,
  trailUuid: string,
  userUuid: string,
  opts: { isCompleted?: boolean; isAbandoned?: boolean; sos?: boolean } = {}
) {
  const now = Date.now()
  await request.post(`${API}/runs/upload`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      runUuid: randomUUID(),
      trailUuid,
      userUuid,
      startTime: now - 3_600_000,
      endTime: opts.isCompleted || opts.isAbandoned ? now : undefined,
      totalTime: 3_600_000,
      isCompleted: opts.isCompleted ?? false,
      isAbandoned: opts.isAbandoned ?? false,
      sos: opts.sos ?? false,
    },
  })
}

// ── Setup global ──────────────────────────────────────────────────────────────

interface PanelSetup {
  trailUuid: string
  orgToken: string
  orgUser: string
  orgPassw: string
  runnerUser: string
  runnerPassw: string
}

let setup: PanelSetup

test.beforeAll(async ({ request }) => {
  const suffix = Date.now()

  const org = await apiRegisterOrganizer(request, String(suffix))
  const teamUuid = org.teamUuid

  // 4 corredores con distintos estados
  const r1 = await apiRegisterRunner(request, teamUuid, `${suffix}_completed`)
  const r2 = await apiRegisterRunner(request, teamUuid, `${suffix}_sos`)
  const r3 = await apiRegisterRunner(request, teamUuid, `${suffix}_abandoned`)
  const r4 = await apiRegisterRunner(request, teamUuid, `${suffix}_running`)
  const rRunner = await apiRegisterRunner(request, teamUuid, `${suffix}_plain`)

  // Aceptar todos
  for (const r of [r1, r2, r3, r4, rRunner]) {
    await request.post(`${API}/team/requests/${r.uuid}/accept`, {
      headers: { Authorization: `Bearer ${org.token}` },
    })
  }

  const trail = await apiCreateTrailSimple(request, org.token, `Panel Race ${suffix}`)

  // Crear runs con distintos estados (con token del org que tiene permiso de escritura)
  await apiUploadRun(request, org.token, trail.trailUuid, r1.uuid, { isCompleted: true })
  await apiUploadRun(request, org.token, trail.trailUuid, r2.uuid, { sos: true })
  await apiUploadRun(request, org.token, trail.trailUuid, r3.uuid, { isAbandoned: true })
  await apiUploadRun(request, org.token, trail.trailUuid, r4.uuid, {})

  setup = {
    trailUuid: trail.trailUuid,
    orgToken: org.token,
    orgUser: `org_panel_${suffix}`,
    orgPassw: '123456',
    runnerUser: `runner_panel_${suffix}_plain`,
    runnerPassw: '123456',
  }
})

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Panel del Organizador (A3)', () => {

  test.describe('acceso y visualización', () => {
    test('el organizador ve el panel con la lista de corredores', async ({ page }) => {
      await loginViaUI(page, { user: setup.orgUser, passw: setup.orgPassw })
      await page.goto(`/races/${setup.trailUuid}/organizer`)

      await expect(page.getByRole('heading', { name: /panel del organizador/i })).toBeVisible()
      await expect(page.locator('table')).toBeVisible({ timeout: 10_000 })

      // Al menos 4 corredores en la tabla
      const rows = page.locator('table tbody tr')
      await expect(rows).toHaveCount(4, { timeout: 10_000 })
    })

    test('muestra el badge "Completó" para el corredor que terminó', async ({ page }) => {
      await loginViaUI(page, { user: setup.orgUser, passw: setup.orgPassw })
      await page.goto(`/races/${setup.trailUuid}/organizer`)
      await expect(page.locator('table')).toBeVisible({ timeout: 10_000 })

      await expect(page.getByText('Completó')).toBeVisible()
    })

    test('muestra el badge "SOS activo" para el corredor en emergencia', async ({ page }) => {
      await loginViaUI(page, { user: setup.orgUser, passw: setup.orgPassw })
      await page.goto(`/races/${setup.trailUuid}/organizer`)
      await expect(page.locator('table')).toBeVisible({ timeout: 10_000 })

      await expect(page.getByText('SOS activo')).toBeVisible()
    })

    test('muestra el badge "Abandonó" para el corredor que abandonó', async ({ page }) => {
      await loginViaUI(page, { user: setup.orgUser, passw: setup.orgPassw })
      await page.goto(`/races/${setup.trailUuid}/organizer`)
      await expect(page.locator('table')).toBeVisible({ timeout: 10_000 })

      await expect(page.getByText('Abandonó')).toBeVisible()
    })

    test('muestra el badge "En carrera" para el corredor activo', async ({ page }) => {
      await loginViaUI(page, { user: setup.orgUser, passw: setup.orgPassw })
      await page.goto(`/races/${setup.trailUuid}/organizer`)
      await expect(page.locator('table')).toBeVisible({ timeout: 10_000 })

      await expect(page.locator('table tbody').getByText('En carrera')).toBeVisible()
    })

    test('un corredor ve el mensaje de acceso denegado', async ({ page }) => {
      await loginViaUI(page, { user: setup.runnerUser, passw: setup.runnerPassw })
      await page.goto(`/races/${setup.trailUuid}/organizer`)

      await expect(page.getByText(/solo los organizadores/i)).toBeVisible({ timeout: 8_000 })
      // No redirige a /login (la página carga pero muestra el error)
      await expect(page).not.toHaveURL('/login')
    })
  })

  test.describe('envío de mensajes', () => {
    test('el organizador puede enviar un mensaje individual a un corredor', async ({ page }) => {
      await loginViaUI(page, { user: setup.orgUser, passw: setup.orgPassw })
      await page.goto(`/races/${setup.trailUuid}/organizer`)
      await expect(page.locator('table')).toBeVisible({ timeout: 10_000 })

      // Clic en el primer botón "Mensaje" de la tabla
      await page.getByRole('button', { name: /mensaje/i }).first().click()

      // El diálogo aparece
      await expect(page.getByRole('dialog')).toBeVisible()

      // Escribir el mensaje
      await page.getByPlaceholder(/escribe el mensaje/i).fill('¡Vas muy bien, sigue así!')

      // Enviar
      await page.getByRole('button', { name: /^enviar$/i }).click()

      // Toast de confirmación
      await expect(page.getByText(/mensaje enviado/i)).toBeVisible({ timeout: 5_000 })
    })

    test('el organizador puede enviar un mensaje a todos los corredores', async ({ page }) => {
      await loginViaUI(page, { user: setup.orgUser, passw: setup.orgPassw })
      await page.goto(`/races/${setup.trailUuid}/organizer`)
      await expect(page.locator('table')).toBeVisible({ timeout: 10_000 })

      await page.getByRole('button', { name: /mensaje a todos/i }).click()

      await expect(page.getByRole('dialog')).toBeVisible()
      await page.getByPlaceholder(/escribe el mensaje/i).fill('Buen ritmo equipo, quedan 2 km!')
      await page.getByRole('button', { name: /^enviar$/i }).click()

      await expect(page.getByText(/mensaje enviado a todos/i)).toBeVisible({ timeout: 5_000 })
    })

    test('el botón Enviar está desactivado con el campo vacío', async ({ page }) => {
      await loginViaUI(page, { user: setup.orgUser, passw: setup.orgPassw })
      await page.goto(`/races/${setup.trailUuid}/organizer`)
      await expect(page.locator('table')).toBeVisible({ timeout: 10_000 })

      await page.getByRole('button', { name: /mensaje a todos/i }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      const sendBtn = page.getByRole('button', { name: /^enviar$/i })
      await expect(sendBtn).toBeDisabled()
    })

    test('cancelar el diálogo cierra sin enviar', async ({ page }) => {
      await loginViaUI(page, { user: setup.orgUser, passw: setup.orgPassw })
      await page.goto(`/races/${setup.trailUuid}/organizer`)
      await expect(page.locator('table')).toBeVisible({ timeout: 10_000 })

      await page.getByRole('button', { name: /mensaje a todos/i }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      await page.getByRole('button', { name: /cancelar/i }).click()

      await expect(page.getByRole('dialog')).toBeHidden()
      // No hay toast de confirmación
      await expect(page.getByText(/mensaje enviado/i)).toBeHidden()
    })
  })

  test.describe('endpoint backend', () => {
    test('POST /messages acepta mensajes del organizador', async ({ request }) => {
      const res = await request.post(`${API}/messages`, {
        headers: { Authorization: `Bearer ${setup.orgToken}` },
        data: { trailUuid: setup.trailUuid, content: 'Test backend directo', recipientUuid: null },
      })
      expect(res.status()).toBe(200)
      expect((await res.json()).ok).toBe(true)
    })

    test('GET /messages devuelve los mensajes broadcast enviados', async ({ request }) => {
      const { token } = await apiLogin(request, { user: setup.runnerUser, passw: setup.runnerPassw })
      const res = await request.get(`${API}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { trailUuid: setup.trailUuid, since: 0 },
      })
      expect(res.status()).toBe(200)
      const msgs = await res.json()
      const contents = msgs.map((m: any) => m.content)
      expect(contents).toContain('Buen ritmo equipo, quedan 2 km!')
    })
  })

  test.describe('integración con vista en vivo', () => {
    test('el link "Panel" es visible en la barra de LiveRace para el organizador', async ({ page }) => {
      await loginViaUI(page, { user: setup.orgUser, passw: setup.orgPassw })
      await page.goto(`/races/${setup.trailUuid}/live`)
      await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15_000 })

      await expect(page.getByRole('link', { name: /📋 panel/i })).toBeVisible()
    })

    test('el link "Panel" lleva al organizador al panel correcto', async ({ page }) => {
      await loginViaUI(page, { user: setup.orgUser, passw: setup.orgPassw })
      await page.goto(`/races/${setup.trailUuid}/live`)
      await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15_000 })

      await page.getByRole('link', { name: /📋 panel/i }).click()

      await expect(page).toHaveURL(`/races/${setup.trailUuid}/organizer`)
      await expect(page.getByRole('heading', { name: /panel del organizador/i })).toBeVisible()
    })

    test('el link "Panel" NO es visible en LiveRace para un corredor normal', async ({ page }) => {
      await loginViaUI(page, { user: setup.runnerUser, passw: setup.runnerPassw })
      await page.goto(`/races/${setup.trailUuid}/live`)
      await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15_000 })

      // El link de panel no debe aparecer para un runner
      await expect(page.getByRole('link', { name: /📋 panel/i })).toBeHidden()
    })
  })
})
