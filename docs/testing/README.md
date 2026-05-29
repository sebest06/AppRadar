# Backlog de Testing — AppRadar

Inventario completo de todos los tests del proyecto. Cada test está descrito en lenguaje natural explicando qué verifica, cómo lo hace y dónde está ubicado.

## Resumen general

| Tipo | Archivos | Tests | Documento |
|------|----------|-------|-----------|
| Backend unitarios (Jest) | 6 | 94 | [01-backend-jest.md](01-backend-jest.md) |
| Frontend E2E (Playwright) | 7 | 35+ | [02-frontend-playwright.md](02-frontend-playwright.md) |
| Android unitarios (JVM/Robolectric) | 5 | 33 | [03-android-unit.md](03-android-unit.md) |
| Android integración (Maestro) | 7 | 5 flujos + 1 suite | [04-android-maestro.md](04-android-maestro.md) |
| E2E legacy (Maestro) | 2 | 2 flujos | [04-android-maestro.md](04-android-maestro.md) |

## Cómo correr cada suite

```bash
# Backend (Jest)
cd backend && npm test

# Frontend E2E (Playwright) — levanta backend + Vite automáticamente
cd frontend && npm run test:e2e

# Android unitarios (JVM)
./gradlew :app:test

# Android integración (Maestro) — requiere emulador/dispositivo + backend corriendo
# Instalar Maestro primero: curl -Ls "https://get.maestro.mobile.dev" | bash
maestro test tests/android/suites/smoke.yaml -e API_URL=http://10.0.2.2:3000/

# Todos los tests en Docker (backend Jest + Playwright)
docker compose -f docker-compose.tests.yml up --exit-code-from tests
```

## Estructura de archivos

```
docs/testing/
├── README.md                    ← este archivo (índice)
├── 01-backend-jest.md           ← 94 tests Jest (auth, gps, me, races, teams, trails)
├── 02-frontend-playwright.md    ← 35+ tests Playwright (auth, dashboard, profile, race, simulación, stats, heatmap)
├── 03-android-unit.md           ← 33 tests JVM/Robolectric (entidad, ViewModel, helpers)
└── 04-android-maestro.md        ← 5 flujos Maestro + legacy (integración E2E Android)
```
