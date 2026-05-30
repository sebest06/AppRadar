/**
 * Tests E2E para la recepción de mensajes del organizador en LiveRace:
 *  - Notificaciones al cargar la página (poll inmediato en mount)
 *  - Notificaciones durante la sesión (poll por intervalo de 20s)
 *  - Filtrado correcto (el corredor no ve mensajes de otros)
 *  - Auto-descarte de notificaciones tras 10 segundos
 */

import { test, expect, type APIRequestContext } from '@playwright/test'
import { randomUUID } from 'crypto'
import { API, loginViaUI } from './helpers'

// ── Helpers de setup ──────────────────────────────────────────────────────────

async function registerOrg(request: APIRequestContext, suffix: string) {
  const res = await request.post(`${API}/auth/register`, {
    data: {
      user: `org_lrm_${suffix}`,
      passw: '123456',
      nombre: `Org Mensajes ${suffix}`,
      role: 'organizer',
      team: `Equipo LRM ${suffix}`,
    },
  })
  const body = await res.json()
  return {
    token: body.token as string,
    uuid: body.user.uuid as string,
    teamUuid: body.user.uuid_team as string,
    nombre: body.user.nombre as string,
    user: `org_lrm_${suffix}`,
  }
}

async function registerRunner(request: APIRequestContext, teamUuid: string, suffix: string) {
  const res = await request.post(`${API}/auth/register`, {
    data: { user: `runner_lrm_${suffix}`, passw: '123456', nombre: `Corredor LRM ${suffix}`, role: 'runner', uuid_team: teamUuid },
  })
  const body = await res.json()
  return { token: body.token as string, uuid: body.user.uuid as string, user: `runner_lrm_${suffix}` }
}

async function createTrail(request: APIRequestContext, token: string, name: string) {
  const res = await request.post(`${API}/trails`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      description: 'LRM E2E',
      distanceKm: 5,
      elevationM: 100,
      maxSkip: 1,
      waypoints: [
        { order: 0, name: 'Largada', lat: -34.6037, lon: -58.3816, radius: 50 },
        { order: 1, name: 'Meta',    lat: -34.6100, lon: -58.3900, radius: 50 },
      ],
    },
  })
  return (await res.json()) as { trailUuid: string }
}

async function sendMessage(
  request: APIRequestContext,
  token: string,
  trailUuid: string,
  content: string,
  recipientUuid?: string | null
) {
  const res = await request.post(`${API}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { trailUuid, content, recipientUuid: recipientUuid ?? null },
  })
  return res
}

// ── Setup global ──────────────────────────────────────────────────────────────

interface Setup {
  trailUuid:    string
  orgToken:     string
  orgNombre:    string
  orgUser:      string
  runner1:      { uuid: string; user: string }
  runner2:      { uuid: string; user: string }
}

let S: Setup

test.beforeAll(async ({ request }) => {
  const suffix = Date.now()

  const org     = await registerOrg(request, String(suffix))
  const runner1 = await registerRunner(request, org.teamUuid, `${suffix}_r1`)
  const runner2 = await registerRunner(request, org.teamUuid, `${suffix}_r2`)

  // Aceptar corredores en el equipo
  for (const r of [runner1, runner2]) {
    await request.post(`${API}/team/requests/${r.uuid}/accept`, {
      headers: { Authorization: `Bearer ${org.token}` },
    })
  }

  const trail = await createTrail(request, org.token, `LRM Race ${suffix}`)

  S = {
    trailUuid: trail.trailUuid,
    orgToken:  org.token,
    orgNombre: org.nombre,
    orgUser:   org.user,
    runner1,
    runner2,
  }
})

// ── Helpers de navegación ─────────────────────────────────────────────────────

async function goToLiveRaceAsRunner(page: any, runnerUser: string) {
  await loginViaUI(page, { user: runnerUser, passw: '123456' })
  await page.goto(`/races/${S.trailUuid}/live`)
  await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15_000 })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Notificaciones de mensajes del organizador en LiveRace', () => {

  test.describe('Poll inmediato al cargar la página', () => {

    test('aparece una notificación de mensaje broadcast al cargar LiveRace', async ({ page, request }) => {
      const content = `Broadcast mount test ${randomUUID().slice(0, 8)}`
      await sendMessage(request, S.orgToken, S.trailUuid, content, null)

      await goToLiveRaceAsRunner(page, S.runner1.user)

      await expect(page.getByText(content)).toBeVisible({ timeout: 8_000 })
    })

    test('aparece una notificación de mensaje individual al cargar LiveRace', async ({ page, request }) => {
      const content = `Individual mount test ${randomUUID().slice(0, 8)}`
      await sendMessage(request, S.orgToken, S.trailUuid, content, S.runner1.uuid)

      await goToLiveRaceAsRunner(page, S.runner1.user)

      await expect(page.getByText(content)).toBeVisible({ timeout: 8_000 })
    })

    test('la notificación muestra el nombre del organizador como remitente', async ({ page, request }) => {
      const content = `Sender name test ${randomUUID().slice(0, 8)}`
      await sendMessage(request, S.orgToken, S.trailUuid, content, null)

      await goToLiveRaceAsRunner(page, S.runner1.user)

      // El banner azul incluye el nombre del organizador
      await expect(page.getByText(content)).toBeVisible({ timeout: 8_000 })
      await expect(page.getByText(new RegExp(S.orgNombre, 'i'))).toBeVisible()
    })

    test('NO aparece notificación de mensaje dirigido a otro corredor', async ({ page, request }) => {
      // Mensaje solo para runner2
      const content = `Solo runner2 ${randomUUID().slice(0, 8)}`
      await sendMessage(request, S.orgToken, S.trailUuid, content, S.runner2.uuid)

      // Runner1 carga LiveRace
      await goToLiveRaceAsRunner(page, S.runner1.user)
      // Esperar a que el poll termine
      await page.waitForTimeout(2_000)

      await expect(page.getByText(content)).toBeHidden()
    })

  })

  test.describe('Poll por intervalo (mensajes enviados mientras se está en LiveRace)', () => {

    test('detecta un mensaje nuevo enviado durante la sesión tras el intervalo de polling', async ({ page, request }) => {
      const content = `Intervalo poll test ${randomUUID().slice(0, 8)}`

      // Interceptar la primera llamada a /messages y devolver vacío para simular
      // que el mensaje se envía DESPUÉS de cargar la página
      let intercepted = false
      await page.route('**/messages*', async route => {
        if (!intercepted) {
          intercepted = true
          await route.fulfill({ json: [] })
        } else {
          await route.continue()
        }
      })

      await page.clock.install({ time: Date.now() })
      await goToLiveRaceAsRunner(page, S.runner1.user)

      // El primer poll ya disparó y devolvió []
      await expect(page.getByText(content)).toBeHidden()

      // Enviar el mensaje ahora (mientras el corredor está en la página)
      await sendMessage(request, S.orgToken, S.trailUuid, content, S.runner1.uuid)

      // Avanzar 21 segundos → el intervalo dispara el segundo poll
      await page.clock.fastForward(21_000)

      await expect(page.getByText(content)).toBeVisible({ timeout: 5_000 })
    })

  })

  test.describe('Auto-descarte de notificaciones', () => {

    test('la notificación de mensaje se auto-descarta tras 10 segundos', async ({ page, request }) => {
      const content = `Autodismiss test ${randomUUID().slice(0, 8)}`
      await sendMessage(request, S.orgToken, S.trailUuid, content, null)

      await page.clock.install({ time: Date.now() })
      await goToLiveRaceAsRunner(page, S.runner1.user)

      // La notificación aparece al montar
      await expect(page.getByText(content)).toBeVisible({ timeout: 8_000 })

      // Avanzar 11 segundos → el setTimeout de 10s se dispara
      await page.clock.fastForward(11_000)

      await expect(page.getByText(content)).toBeHidden()
    })

  })

  test.describe('Envío desde el OrganizerPanel', () => {

    test('el mensaje enviado desde el OrganizerPanel llega al corredor en LiveRace', async ({ page, request }) => {
      const content = `Panel → LiveRace ${randomUUID().slice(0, 8)}`

      // Enviar mensaje vía OrganizerPanel UI
      await loginViaUI(page, { user: S.orgUser, passw: '123456' })
      await page.goto(`/races/${S.trailUuid}/organizer`)
      // El botón "Mensaje a todos" siempre está en el header, aunque no haya runs
      await expect(page.getByRole('button', { name: /mensaje a todos/i })).toBeVisible({ timeout: 10_000 })

      await page.getByRole('button', { name: /mensaje a todos/i }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.getByPlaceholder(/escribe el mensaje/i).fill(content)
      await page.getByRole('button', { name: /^enviar$/i }).click()
      await expect(page.getByText(/mensaje enviado a todos/i)).toBeVisible({ timeout: 5_000 })

      // Verificar que el mensaje está en el backend
      const { token: r1Token } = await (async () => {
        const res = await request.post(`${API}/auth/login`, {
          data: { user: S.runner1.user, passw: '123456' },
        })
        return (await res.json()) as { token: string }
      })()

      const msgRes = await request.get(`${API}/messages`, {
        headers: { Authorization: `Bearer ${r1Token}` },
        params: { trailUuid: S.trailUuid, since: 0 },
      })
      expect(msgRes.status()).toBe(200)
      const msgs = await msgRes.json()
      const found = msgs.find((m: any) => m.content === content)
      expect(found).toBeDefined()
      expect(found.senderName).toBe(S.orgNombre)
    })

    test('el endpoint GET /messages filtra correctamente por trailUuid y recipientUuid', async ({ request }) => {
      const broadcastContent  = `Broadcast filter ${randomUUID().slice(0, 8)}`
      const individualContent = `Individual filter ${randomUUID().slice(0, 8)}`
      const otherContent      = `Otro runner filter ${randomUUID().slice(0, 8)}`

      await sendMessage(request, S.orgToken, S.trailUuid, broadcastContent, null)
      await sendMessage(request, S.orgToken, S.trailUuid, individualContent, S.runner1.uuid)
      await sendMessage(request, S.orgToken, S.trailUuid, otherContent, S.runner2.uuid)

      const loginRes = await request.post(`${API}/auth/login`, {
        data: { user: S.runner1.user, passw: '123456' },
      })
      const { token: r1Token } = await loginRes.json()

      const res = await request.get(`${API}/messages`, {
        headers: { Authorization: `Bearer ${r1Token}` },
        params: { trailUuid: S.trailUuid, since: 0 },
      })

      expect(res.status()).toBe(200)
      const contents = (await res.json()).map((m: any) => m.content)

      expect(contents).toContain(broadcastContent)   // broadcast → sí
      expect(contents).toContain(individualContent)  // para runner1 → sí
      expect(contents).not.toContain(otherContent)   // para runner2 → no
    })

  })

})
