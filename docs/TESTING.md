# Guía de Testing — AppRadar

## Resumen rápido

| Qué | Sin Docker | Con Docker |
|-----|-----------|------------|
| Tests backend (Jest) | `cd backend && npm test` | `docker compose -f docker-compose.tests.yml up` |
| Tests Android (unitarios) | `./gradlew :app:test` | — (requiere JDK) |
| Tests E2E (Playwright) | `cd frontend && npm run test:e2e` | `docker compose -f docker-compose.tests.yml up` |
| Tests integración Android | Maestro en el host | Backend en Docker + Maestro en host |
| **Todos juntos (Docker)** | — | `docker compose -f docker-compose.tests.yml up --exit-code-from tests` |

---

## Tests unitarios del backend (Jest)

```bash
cd backend
npm test
```

94 tests. No requiere servidores corriendo ni Docker.

---

## Tests unitarios de la app Android

Tests JVM sin dispositivo ni emulador. Usan **Robolectric** y **MockK**.

```bash
# Desde Android Studio: Run > Run Tests in 'com.appradar'

# Desde terminal (requiere Gradle wrapper)
./gradlew :app:test
```

### Suites (30 tests)

| Suite | Tests | Tipo | Qué cubre |
|-------|-------|------|-----------|
| `TimeUtilsTest` | 7 | JVM puro | `formatElapsedTime` |
| `RankingNotificationUtilsTest` | 7 | JVM puro | `formatGapLine` |
| `RaceRunEntityTest` | 8 | JVM puro | Data class, defaults, copy, igualdad |
| `LocationHelperTest` | 8 | Robolectric | `isWithinWaypointRadius` |
| `ActiveTrailViewModelTest` | 10 | JUnit4 + MockK | Estado inicial, loadTrail, waypoints |

### Estructura

```
app/src/test/
├── resources/robolectric.properties
└── java/com/appradar/
    ├── util/TimeUtilsTest.kt
    ├── util/LocationHelperTest.kt
    ├── util/RankingNotificationUtilsTest.kt
    ├── data/local/entity/RaceRunEntityTest.kt
    └── ui/viewmodel/ActiveTrailViewModelTest.kt
```

---

## Tests E2E del frontend (Playwright)

Playwright levanta el backend y el frontend automáticamente.

```bash
cd frontend
npm run test:e2e
```

### Comandos útiles

```bash
npx playwright show-report          # ver reporte HTML
npx playwright test tests/auth.spec.ts    # un solo archivo
npx playwright test --headed         # con navegador visible
npx playwright test -g "login exitoso"   # test específico
```

### Estructura (24+ tests)

```
frontend/tests/
├── helpers.ts                  # apiLogin, apiCreateTrail, apiCreateRun, loginViaUI
├── auth.spec.ts                # Login, logout, rutas protegidas (5 tests)
├── dashboard.spec.ts           # Filtros, búsqueda, navegación (4 tests)
├── race.spec.ts                # Crear carrera, resultados, live view, editar (10 tests)
├── profile.spec.ts             # Perfil, historial de carreras (4 tests)
└── race-simulation.spec.ts     # Simulación completa: 2 corredores, GPS, ganador (1 test ~45s)
```

### Variables de entorno (modo E2E)

| Variable | Valor |
|----------|-------|
| `DATABASE_PATH` | `/tmp/appradar_e2e.db` |
| `JWT_SECRET` | `e2e_test_secret` |
| `RACE_COOLDOWN_MINUTES` | `0` |
| `PORT` | `3000` |

---

## Tests de integración Android (Maestro)

Tests end-to-end que interactúan con la UI real de la app en un dispositivo o emulador.

### Sin Docker (desarrollo normal)

```bash
# 1. Levantar el backend localmente
cd backend && node server.js

# 2. Instalar la app en el emulador/dispositivo
./gradlew :app:installDebug

# 3. Ejecutar los tests
maestro test tests/android/flows/01_login.yaml -e API_URL=http://10.0.2.2:3000/
```

### Con Docker (backend aislado)

```bash
# 1. Levantar el backend en modo integración (DB fresca)
docker compose -f docker-compose.integration.yml up -d

# 2. Esperar a que esté listo
docker compose -f docker-compose.integration.yml wait backend

# 3. Ejecutar Maestro desde el host
# Emulador:
maestro test tests/android/suites/smoke.yaml -e API_URL=http://10.0.2.2:3000/
# Dispositivo físico:
maestro test tests/android/suites/smoke.yaml -e API_URL=http://$(hostname -I | awk '{print $1}'):3000/

# 5. Bajar el backend al terminar
docker compose -f docker-compose.integration.yml down
```

### Flujos disponibles (5 flows)

| Flujo | Qué testea |
|-------|-----------|
| `01_login_fallido.yaml` | Campos vacíos y credenciales incorrectas |
| `02_login.yaml` | Login exitoso |
| `03_home.yaml` | Home, sync, navegación a historial y settings |
| `04_settings.yaml` | Selección de ícono, logout |
| `05_race_start_stop.yaml` | Iniciar, pausar, reanudar y terminar carrera |

---

## Correr todo en Docker

```bash
# Ejecutar todos los tests (backend Jest + frontend E2E)
docker compose -f docker-compose.tests.yml up --exit-code-from tests

# Limpiar cachés de node_modules y browsers
docker compose -f docker-compose.tests.yml down -v
```

El contenedor instala las dependencias, corre Jest, luego inicia automáticamente
el backend y el frontend Vite, y finalmente corre Playwright. El exit code
del compose refleja si todos los tests pasaron.

---

## Sin Docker (local completo)

```bash
# Backend
cd backend && npm test

# Android (requiere JDK + Gradle)
./gradlew :app:test

# E2E
cd frontend && npm run test:e2e
```

---

## CI (GitHub Actions)

El workflow `.github/workflows/ci.yml` corre en cada push/PR a `main`:

1. **`test`** — Jest (94 tests)
2. **`build-frontend`** — Vite build
3. **`e2e`** — Playwright (24 tests, Chromium)
4. **`docker`** — build de la imagen de producción

Los tests de Android (unitarios y Maestro) no corren en CI automáticamente
ya que requieren el SDK de Android y un dispositivo/emulador.
