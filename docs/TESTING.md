# Guía de Testing — AppRadar

## Tests unitarios del backend (Jest)

```bash
cd backend
npm test
```

94 tests. No requiere servidores corriendo ni Docker.

---

## Tests unitarios de la app Android

Tests JVM que corren sin dispositivo ni emulador. Usan **Robolectric** para las clases que dependen de APIs Android y **MockK** para mocking.

```bash
# Desde Android Studio: Run > Run Tests in 'com.appradar'

# Desde terminal (requiere Gradle wrapper)
./gradlew :app:test
```

### Suites disponibles (30 tests)

| Suite | Tests | Tipo | Qué cubre |
|-------|-------|------|-----------|
| `TimeUtilsTest` | 7 | JVM puro | `formatElapsedTime`: cero, segundos, minutos, horas, combinado |
| `RankingNotificationUtilsTest` | 7 | JVM puro | `formatGapLine`: diferencia WP, gap en segundos/minutos, edge cases |
| `RaceRunEntityTest` | 8 | JVM puro | Data class: construcción, valores por defecto, `copy`, igualdad |
| `LocationHelperTest` | 8 | Robolectric | `isWithinWaypointRadius`: dentro/fuera del radio, radio custom, diagonal |
| `ActiveTrailViewModelTest` | 10 | Robolectric + MockK | Estado inicial, `loadTrail`, `togglePause`, detección de waypoints |

### Estructura

```
app/src/test/
├── resources/
│   └── robolectric.properties          # sdk=34
└── java/com/appradar/
    ├── util/
    │   ├── TimeUtilsTest.kt
    │   ├── LocationHelperTest.kt
    │   └── RankingNotificationUtilsTest.kt
    ├── data/local/entity/
    │   └── RaceRunEntityTest.kt
    └── ui/viewmodel/
        └── ActiveTrailViewModelTest.kt
```

### Dependencias de test (en `app/build.gradle.kts`)

| Librería | Versión | Uso |
|----------|---------|-----|
| `junit:junit` | 4.13.2 | Runner base |
| `org.robolectric:robolectric` | 4.11.1 | APIs Android en JVM |
| `io.mockk:mockk` | 1.13.9 | Mocking de clases Kotlin |
| `kotlinx-coroutines-test` | 1.7.3 | Testing de coroutines y StateFlow |
| `androidx.arch.core:core-testing` | 2.2.0 | `InstantTaskExecutorRule` para LiveData |
| `androidx.test:core-ktx` | 1.5.0 | `ApplicationProvider` para Context |

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
3. Corre los tests en Chromium
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

### Estructura

```
frontend/tests/
├── helpers.ts          # apiLogin, apiCreateTrail, apiCreateRun, loginViaUI
├── auth.spec.ts        # Login, logout, rutas protegidas (5 tests)
├── dashboard.spec.ts   # Filtros, búsqueda, navegación (4 tests)
├── race.spec.ts        # Crear carrera, resultados, live view, editar (11 tests)
└── profile.spec.ts     # Perfil, historial de carreras (4 tests)
```

### Variables de entorno del backend en modo E2E

| Variable | Valor |
|----------|-------|
| `DATABASE_PATH` | `/tmp/appradar_e2e.db` |
| `JWT_SECRET` | `e2e_test_secret` |
| `RACE_COOLDOWN_MINUTES` | `0` |
| `PORT` | `3000` |

---

## Correr todo junto desde la raíz

```bash
# Backend
cd backend && npm test

# Android (desde la raíz del repo)
./gradlew :app:test

# E2E
cd frontend && npm run test:e2e
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
| Tests unitarios Android | `./gradlew :app:test` | raíz |
| Tests E2E | `npm run test:e2e` | `frontend/` |
| Reporte E2E | `npx playwright show-report` | `frontend/` |
| Build Docker | `docker build -f backend/Dockerfile .` | raíz |
| Deploy local | `JWT_SECRET=x docker compose up` | raíz |
