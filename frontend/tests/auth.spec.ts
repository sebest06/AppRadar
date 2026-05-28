import { test, expect } from '@playwright/test'
import { loginViaUI, ADMIN } from './helpers'

test.describe('Autenticación', () => {
  test('login exitoso redirige al dashboard y muestra el nombre', async ({ page }) => {
    await loginViaUI(page)

    await expect(page).toHaveURL('/')
    await expect(page.getByText('Admin', { exact: false })).toBeVisible()
  })

  test('credenciales incorrectas muestran mensaje de error', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('tu_usuario').fill('admin')
    await page.getByPlaceholder('••••••••').fill('clave_incorrecta')
    await page.getByRole('button', { name: /ingresar/i }).click()

    await expect(page.getByText(/incorrecto/i)).toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('usuario vacío no permite enviar el formulario', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('••••••••').fill(ADMIN.passw)
    await page.getByRole('button', { name: /ingresar/i }).click()

    // HTML5 validation prevents submission — URL stays at /login
    await expect(page).toHaveURL('/login')
  })

  test('ruta protegida redirige a login sin sesión', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })

  test('cerrar sesión limpia el estado y redirige a login', async ({ page }) => {
    await loginViaUI(page)
    await page.getByRole('button', { name: /salir/i }).click()
    await expect(page).toHaveURL('/login')

    // Volver al dashboard sin sesión redirige de vuelta
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })
})
