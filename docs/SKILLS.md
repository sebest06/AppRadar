# Skills y Tecnologías — AppRadar

Estado actual de implementación de cada tecnología en el proyecto.

---

## Backend (✅ Completado)

| Tecnología | Estado | Uso |
|------------|--------|-----|
| Node.js 22 + Express 4 | ✅ | Framework HTTP, dividido en `src/routes/`, `src/middleware/`, `src/services/` |
| better-sqlite3 | ✅ | Persistencia SQLite síncrona, sin ORM |
| Socket.IO v4 | ✅ | WebSocket con rooms por carrera (`race:<trailUuid>`) |
| jsonwebtoken | ✅ | Access token (1h) + refresh token (30d) |
| bcryptjs | ✅ | Hash de contraseñas con factor 10 |
| zod | ✅ | Validación de inputs en todos los endpoints |
| cors | ✅ | Configurado via `CORS_ORIGINS` |
| Docker multi-stage | ✅ | Build frontend + deps nativas + imagen final Alpine |

### Pendiente (backend)
- `helmet` — headers de seguridad HTTP
- `express-rate-limit` — limitar intentos de login
- PostgreSQL — migración desde SQLite cuando escale

---

## Frontend Web (✅ Completado)

| Tecnología | Estado | Uso |
|------------|--------|-----|
| React 19 + TypeScript | ✅ | Framework UI con tipado estático |
| Vite 6 | ✅ | Build tool y dev server |
| React Router v7 | ✅ | Routing con rutas protegidas por JWT |
| Tailwind CSS v4 | ✅ | Estilos utilitarios |
| Leaflet + react-leaflet | ✅ | Mapa con marcadores de corredores y waypoints |
| Socket.IO Client | ✅ | Posiciones GPS en tiempo real |
| @tanstack/react-query | ✅ | Fetching y caché de datos |
| Zustand | ✅ | Estado global (auth) |

### Páginas implementadas
- `/login` — autenticación con JWT
- `/` — dashboard con filtros (todas / en vivo / mis carreras) y búsqueda
- `/races/new` — crear carrera con waypoints manuales o GPX
- `/races/:id/edit` — editar nombre y descripción de carrera
- `/races/:id/live` — vista en vivo con mapa Leaflet + ranking + WebSocket
- `/races/:id/results` — resultados con podio, gráfico de velocidad y replay
- `/races/:id/replay` — reproducción animada de la carrera
- `/profile` — perfil de usuario, historial de carreras, cambio de contraseña

### Pendiente (frontend)
- Notificaciones push (Web Push API)
- PWA / modo offline

---

## Android (Parcialmente completado)

| Tecnología | Estado | Uso |
|------------|--------|-----|
| Kotlin + Jetpack Compose | ✅ | UI declarativa |
| Room | ✅ | Base de datos local offline-first |
| Retrofit | ✅ | Cliente HTTP con JWT |
| Hilt | ✅ | Inyección de dependencias |
| WorkManager | ✅ | Sincronización en background |
| FusedLocationProvider | ✅ | GPS de alta precisión |
| OSMDroid | ✅ | Mapas offline |
| DataStore | ✅ | Preferencias (URL backend, token, ícono) |
| WearOS (módulo :wear) | ✅ | App para reloj inteligente |

### Pendiente (Android)
- Mostrar posiciones de compañeros en el mapa en tiempo real (recibir WebSocket)
- Notificaciones de progreso del equipo durante la carrera

---

## Testing (✅ Implementado)

| Suite | Tecnología | Tests |
|-------|------------|-------|
| Backend unitarios | Jest | 94 tests |
| Frontend E2E | Playwright (Chromium) | 24+ tests |
| Android unitarios | JUnit4 + MockK + Robolectric | 33 tests |
| Android integración | Maestro | 5 flujos |

---

## DevOps / CI-CD (✅ Implementado)

| Herramienta | Estado | Uso |
|-------------|--------|-----|
| Docker multi-stage | ✅ | Imagen de producción con frontend embebido |
| docker-compose.prod.yml | ✅ | Deploy en servidor con volumen persistente |
| docker-compose.local.yml | ✅ | Deploy local, zero config |
| docker-compose.tests.yml | ✅ | Jest + Playwright en Docker |
| docker-compose.integration.yml | ✅ | Backend para tests Maestro |
| GitHub Actions | ✅ | CI con Jest + Playwright + Docker build |

---

## Herramientas de Desarrollo

| Herramienta | Uso |
|-------------|-----|
| Android Studio | Desarrollo Android |
| VS Code | Backend + Frontend |
| Postman / Insomnia | Testing de la API REST |
| Bruno | Alternativa a Postman, colecciones en git |
| DBeaver | Explorar base de datos SQLite |
| Maestro | Tests de integración Android (UI automation) |
| Playwright | Tests E2E del frontend web |
