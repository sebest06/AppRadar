# AppRadar — Documentación Técnica

## Arquitectura del Sistema

```
┌─────────────────┐     WebSocket/REST     ┌────────────────────┐
│  Android App    │◄──────────────────────►│   Backend (Node.js) │
│  (Kotlin)       │                        │   Puerto 3000        │
└─────────────────┘                        └────────┬───────────┘
                                                    │ REST/WebSocket
┌─────────────────┐                        ┌────────▼───────────┐
│  Frontend Web   │◄──────────────────────►│   Base de Datos     │
│  (React)        │     REST/WebSocket     │   SQLite            │
└─────────────────┘                        └────────────────────┘
```

## Stack Tecnológico

### Android App
| Tecnología | Versión | Uso |
|------------|---------|-----|
| Kotlin | 1.9+ | Lenguaje principal |
| Jetpack Compose | BOM 2024 | UI declarativa |
| Room | 2.6+ | Base de datos local (SQLite) |
| Retrofit | 2.9+ | Cliente HTTP |
| Hilt | 2.50+ | Inyección de dependencias |
| WorkManager | 2.9+ | Sincronización en background |
| Play Services Location | 21+ | GPS |
| OSMDroid | 6.1+ | Mapas OpenStreetMap |
| DataStore | 1.0+ | Preferencias de usuario |

### Backend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| Node.js | 22+ | Runtime |
| Express | 4.x | Framework HTTP |
| better-sqlite3 | 11.x | Persistencia SQLite síncrona |
| Socket.IO | 4.x | WebSocket tiempo real |
| jsonwebtoken | 9.x | JWT access tokens (1h) + refresh tokens (30d) |
| bcryptjs | 3.x | Hash de contraseñas |
| zod | 3.x | Validación de inputs en todos los endpoints |

### Frontend Web
| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 19 | Framework UI |
| TypeScript | 5.x | Tipado estático |
| Vite | 6.x | Build tool |
| React Router | v7 | Routing con rutas protegidas |
| Tailwind CSS | 4.x | Estilos utilitarios |
| Leaflet + react-leaflet | 4.x | Mapas OpenStreetMap |
| Socket.IO Client | 4.x | Posiciones GPS en tiempo real |
| @tanstack/react-query | 5.x | Fetching y caché de datos |
| Zustand | 5.x | Estado global (auth, config) |

---

## Modelos de Datos

### Entidades Android (Room)

#### UserEntity
```kotlin
data class UserEntity(
    val uuid: String,
    val user: String,
    val nombre: String,
    val team: String,
    val uuid_team: String,
    val role: String,
    val activityType: String,
    val teamStatus: String
)
```

#### TrailEntity
```kotlin
data class TrailEntity(
    val trailUuid: String,
    val name: String,
    val description: String,
    val distanceKm: Double,
    val elevationM: Double,
    val maxSkip: Int,
    val isActive: Boolean
)
```

#### WaypointEntity
```kotlin
data class WaypointEntity(
    val waypointUuid: String,
    val trailUuid: String,
    val order: Int,
    val lat: Double,
    val lon: Double,
    val radius: Double,
    val name: String
)
```

#### TrackEntity (registro de paso por waypoint)
```kotlin
data class TrackEntity(
    val trackUuid: String,
    val runUuid: String,
    val waypointUuid: String,
    val trailUuid: String,
    val timestamp: Long,
    val isSynced: Boolean
)
```

#### RaceRunEntity
```kotlin
data class RaceRunEntity(
    val runUuid: String,
    val trailUuid: String,
    val userUuid: String,
    val startTime: Long,
    val endTime: Long?,
    val totalTime: Long,
    val isCompleted: Boolean,
    val isAbandoned: Boolean,
    val sos: Boolean,
    val sessionUuid: String?,
    val isSynced: Boolean
)
```

### Modelos Backend (JSON)

#### Usuario
```json
{
  "uuid": "user-123",
  "user": "corredor1",
  "nombre": "Juan Pérez",
  "team": "Los Cóndores",
  "uuid_team": "team-uuid",
  "role": "runner",
  "activityType": "runner",
  "teamStatus": "accepted"
}
```

#### Trail (Carrera)
```json
{
  "trailUuid": "trail-abc",
  "name": "Ultra Sierras 2025",
  "description": "...",
  "distanceKm": 42.5,
  "elevationM": 2800,
  "maxSkip": 2,
  "isActive": true,
  "createdBy": "user-uuid",
  "teamUuid": "team-uuid"
}
```

#### RankingEntry (paginado)
```json
{
  "data": [
    {
      "userUuid": "user-123",
      "userName": "Juan Pérez",
      "waypointsReached": 3,
      "totalWaypoints": 10,
      "lastWaypointTime": 1715000000000,
      "totalTime": 7200000,
      "isCompleted": false,
      "isAbandoned": false,
      "sos": false
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}
```

---

## API REST — Endpoints

### Autenticación (`/auth`)
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Login, retorna JWT + refreshToken | No |
| POST | `/auth/register` | Registro de usuario (runner/organizer) | No |
| POST | `/auth/refresh` | Renovar access token con refresh token | No |
| GET | `/auth/me` | Perfil del usuario autenticado | Sí |
| PUT | `/auth/me` | Actualizar nombre y tipo de actividad | Sí |
| PUT | `/auth/me/password` | Cambiar contraseña | Sí |
| GET | `/auth/me/history` | Historial de carreras del usuario (paginado) | Sí |

### Carreras y GPS
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/runs/upload` | Iniciar/actualizar/completar una carrera | Sí |
| POST | `/tracks/upload` | Subir waypoints alcanzados | Sí |
| POST | `/gps/upload` | Subir posición GPS actual | Sí |
| GET | `/rankings` | Ranking de la sesión (paginado) | No |
| GET | `/races/live` | Posiciones GPS en vivo | No |
| GET | `/races/sessions` | Listado de sesiones por ruta (paginado) | No |
| GET | `/races/:trailId/replay` | Datos completos para reproducir una carrera | No |
| GET | `/races/:trailId/events` | Eventos de carrera (waypoints alcanzados) | No |
| GET | `/races/:trailId/route-history/:userUuid` | Historial GPS de un corredor | No |
| DELETE | `/races/sessions/:sessionUuid` | Borrar sesión (creador o admin) | Sí |

### Rutas (Trails)
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/trails` | Lista de rutas visibles para el usuario | Opt |
| GET | `/trails/:id/details` | Detalle + waypoints de una ruta | Opt |
| POST | `/trails` | Crear nueva ruta con waypoints | Sí (organizer) |
| PUT | `/trails/:id` | Editar nombre, descripción, distancia | Sí (creador/admin) |
| DELETE | `/trails/:id` | Eliminar ruta y sus waypoints (cascada) | Sí (creador/admin) |
| POST | `/trails/:id/activate` | Activar ruta para competencia | Sí (creador/admin) |

### Equipos
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/teams` | Listado de equipos | No |
| GET | `/team/requests` | Solicitudes pendientes del equipo | Sí (organizer) |
| POST | `/team/requests/:userUuid/accept` | Aceptar corredor | Sí (organizer) |
| POST | `/team/requests/:userUuid/reject` | Rechazar corredor | Sí (organizer) |

## WebSocket — Eventos (Socket.IO)

Los clientes se unen a la room `race:<trailUuid>` al conectarse.

| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `position_broadcast` | Server→Client | Posición GPS actualizada de un corredor |
| `race_update` | Server→Client | Ranking actualizado tras paso por waypoint |

---

## Flujo de Datos — Carrera Activa

```
Corredor en campo:
GPS → TrackingService → Room (local) → SyncWorker → Backend API → Socket.IO broadcast

Espectador web:
Browser → React App → WebSocket (Socket.IO) → Mapa Leaflet en vivo
                    → REST polling → Ranking actualizado
```

## Configuración de URL del Backend

La app Android permite configurar la URL del backend dinámicamente via `DynamicBaseUrlInterceptor`. El usuario la ingresa en la pantalla de Login. La URL se persiste en DataStore.

El frontend web lee la URL del backend desde la variable de entorno `VITE_API_URL`. Si está vacía, usa `/` (modo integrado en el mismo servidor Docker).

---

## Despliegue

### Docker (producción) — imagen multi-stage

```dockerfile
# Stage 1: build frontend
FROM node:22-alpine AS frontend-build
# Stage 2: instalar dependencias nativas (better-sqlite3)
FROM node:22-alpine AS prod-deps
RUN apk add --no-cache python3 make g++
# Stage 3: imagen final
FROM node:22-alpine
```

Ver `backend/Dockerfile` para el Dockerfile completo. El contexto de build debe ser la raíz del repositorio:

```bash
docker build -f backend/Dockerfile .
```

### Variables de Entorno
```
PORT=3000
DATABASE_PATH=./data/appradar.db   # ruta del archivo SQLite
JWT_SECRET=<secreto_largo_aleatorio>
CORS_ORIGINS=https://tudominio.com
RACE_COOLDOWN_MINUTES=60           # cooldown entre carreras (default 60)
NODE_ENV=production
```

### Plataformas de Despliegue Recomendadas
- **Railway** — deploy automático desde git
- **Render** — similar a Railway, plan gratuito disponible
- **DigitalOcean App Platform** — más control, ~$5/mes
- **VPS genérico** — máximo control, requiere más configuración

---

## Seguridad — Estado Actual

| Mecanismo | Estado | Detalle |
|-----------|--------|---------|
| JWT tokens | ✅ Implementado | Access token 1h + refresh token 30d |
| bcrypt | ✅ Implementado | Factor 10 para hash de contraseñas |
| Validación de inputs | ✅ Implementado | Zod en todos los endpoints |
| CORS | ✅ Implementado | Configurable via `CORS_ORIGINS` |
| Autorización por rol | ✅ Implementado | `requireRole()` en rutas protegidas |
| HTTPS | ⚠️ Pendiente | Depende del proveedor de hosting |
| Rate limiting | ⚠️ Pendiente | No implementado aún |
