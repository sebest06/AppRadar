import { type Page, type APIRequestContext } from '@playwright/test'

export const API = 'http://localhost:3000'
export const ADMIN = { user: 'admin', passw: '1234' }

export async function apiLogin(request: APIRequestContext, creds = ADMIN) {
  const res = await request.post(`${API}/auth/login`, { data: creds })
  const body = await res.json()
  return body.token as string
}

export async function apiCreateTrail(request: APIRequestContext, token: string, name: string) {
  const res = await request.post(`${API}/trails`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      description: 'Trail E2E',
      distanceKm: 10,
      elevationM: 500,
      maxSkip: 1,
      waypoints: [
        { order: 0, name: 'Largada', lat: -34.6037, lon: -58.3816, radius: 50 },
        { order: 1, name: 'Meta',    lat: -34.6100, lon: -58.3900, radius: 50 },
      ],
    },
  })
  return (await res.json()) as { trailUuid: string; name: string }
}

export async function loginViaUI(page: Page, creds = ADMIN) {
  await page.goto('/login')
  await page.getByPlaceholder('tu_usuario').fill(creds.user)
  await page.getByPlaceholder('••••••••').fill(creds.passw)
  await page.getByRole('button', { name: /ingresar/i }).click()
  await page.waitForURL('/')
}
