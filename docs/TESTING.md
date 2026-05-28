# Guía de Testing — AppRadar

## Tests unitarios del backend (Jest)

```bash
cd backend
npm test
```

79 tests. No requiere servidores corriendo ni Docker.

---

## Tests E2E (Playwright)

Playwright levanta **ambos servidores automáticamente** — no hace falta hacerlos a mano.

```bash
cd frontend
npm run test:e2e
```

Internamente ejecuta `npx playwright test`, que:
1. Arranca el backend en `localhost:3000` con una DB de test en `/tmp/appradar_e2e.db`
2. Arranca el frontend Vite en `localhost:5173`
3. Corre los 15 tests en Chromium
4. Al terminar muestra el resumen; si algo falla genera un reporte HTML

### Comandos útiles

```bash
# Ver el reporte HTML después de una ejecución
npx playwright show-report

# Correr solo un archivo
npx playwright test tests/auth.spec.ts

# Ver el navegador (útil para debuggear)
npx playwright test --headed

# Correr un test específico por nombre
npx playwright test -g "login exitoso"
```

---

## Correr todo junto desde la raíz

```bash
cd backend && npm test && cd ../frontend && npm run test:e2e
```

---

## Con Docker

Docker sirve para el **deploy en producción**, no para los tests. Los tests siempre corren contra los servidores locales.

Verificar que el Dockerfile construye correctamente:

```bash
# Desde la raíz del repo
docker build -f backend/Dockerfile .
```

Levantar la imagen de producción localmente:

```bash
JWT_SECRET=mi_clave docker compose up --build
```

---

## Resumen rápido

| Qué | Comando | Directorio |
|-----|---------|------------|
| Tests unitarios backend | `npm test` | `backend/` |
| Tests E2E | `npm run test:e2e` | `frontend/` |
| Reporte E2E | `npx playwright show-report` | `frontend/` |
| Build Docker | `docker build -f backend/Dockerfile .` | raíz |
| Deploy local | `JWT_SECRET=x docker compose up` | raíz |

---

## Estructura de los tests E2E

```
frontend/tests/
├── helpers.ts          # apiLogin, apiCreateTrail, loginViaUI
├── auth.spec.ts        # Login, logout, rutas protegidas (5 tests)
├── dashboard.spec.ts   # Filtros, búsqueda, navegación (4 tests)
└── race.spec.ts        # Crear carrera, resultados, live view, editar (10 tests)
```

### Variables de entorno del backend en modo E2E

| Variable | Valor |
|----------|-------|
| `DATABASE_PATH` | `/tmp/appradar_e2e.db` |
| `JWT_SECRET` | `e2e_test_secret` |
| `RACE_COOLDOWN_MINUTES` | `0` |
| `PORT` | `3000` |
