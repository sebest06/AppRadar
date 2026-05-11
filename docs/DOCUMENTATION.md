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
│  (React)        │     REST/WebSocket     │   SQLite/PostgreSQL  │
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
| Node.js | 18+ | Runtime |
| Express | 4.x | Framework HTTP |
| SQLite/PostgreSQL | - | Persistencia (pendiente migración) |
| Socket.IO | 4.x | WebSocket tiempo real (pendiente) |
| JWT | - | Autenticación (pendiente) |
| bcrypt | - | Hash de contraseñas (pendiente) |

### Frontend Web (Por implementar)
| Tecnología | Uso |
|------------|-----|
| React 18 | Framework UI |
| Vite | Build tool |
| React Router v6 | Routing |
| Leaflet + react-leaflet | Mapas OpenStreetMap |
| Socket.IO Client | Tiempo real |
| Axios | HTTP client |
| Zustand o Redux Toolkit | Estado global |
| Tailwind CSS | Estilos |
| React Query (TanStack) | Caché y fetching de datos |

---

## Modelos de Datos

### Entidades Android (Room)

#### UserEntity
```kotlin
data class UserEntity(
    val uuid: String,         // UUID del usuario
    val user: String,         // Username
    val passw: String,        // Password (solo para mock; en prod usar tokens)
    val nombre: String,       // Nombre completo
    val team: String,         // Nombre del equipo
    val uuid_team: String     // UUID del equipo
)
```

#### TrailEntity
```kotlin
data class TrailEntity(
    val trailUuid: String,    // UUID de la carrera
    val name: String,         // Nombre de la carrera
    val maxSkip: Int          // Waypoints que se puede saltar
)
```

#### WaypointEntity
```kotlin
data class WaypointEntity(
    val waypointUuid: String,
    val trailUuid: String,    // FK a TrailEntity
    val order: Int,           // Orden del waypoint
    val lat: Double,
    val lon: Double,
    val radius: Double        // Radio en metros para detectar el paso
)
```

#### TrackEntity (registro de paso por waypoint)
```kotlin
data class TrackEntity(
    val trackUuid: String,
    val runUuid: String,      // FK a RaceRunEntity
    val waypointUuid: String,
    val trailUuid: String,
    val timestamp: Long,      // Epoch milliseconds
    val isSynced: Boolean     // Flag de sincronización con backend
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
    val isCompleted: Boolean
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
  "uuid_team": "team-1"
}
```

#### Trail (Carrera)
```json
{
  "trailUuid": "trail-abc",
  "name": "Ultra Sierras 2025",
  "maxSkip": 2,
  "distanceKm": 42.5,
  "elevationM": 2800
}
```

#### Waypoint
```json
{
  "waypointUuid": "wp-001",
  "trailUuid": "trail-abc",
  "order": 1,
  "lat": -31.4167,
  "lon": -64.1833,
  "radius": 50,
  "name": "Checkpoint 1"
}
```

#### RankingEntry
```json
{
  "userUuid": "user-123",
  "userName": "Juan Pérez",
  "teamName": "Los Cóndores",
  "waypointsReached": 3,
  "totalWaypoints": 10,
  "lastWaypointTime": 1715000000000,
  "totalTime": 7200000,
  "isCompleted": false,
  "currentPosition": { "lat": -31.42, "lon": -64.19 }
}
```

---

## API REST — Endpoints Actuales

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Login usuario | No |
| GET | `/trails` | Lista de carreras | Sí |
| GET | `/trails/:id/details` | Detalle + waypoints | Sí |
| POST | `/runs/upload` | Subir carrera completada | Sí |
| POST | `/tracks/upload` | Subir tracks (waypoints pasados) | Sí |
| GET | `/rankings` | Tabla de posiciones | Sí |

## API REST — Endpoints Faltantes (Por implementar)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/register` | Registro nuevo usuario |
| POST | `/auth/refresh` | Refresh token JWT |
| POST | `/trails` | Crear nueva carrera |
| PUT | `/trails/:id` | Editar carrera |
| DELETE | `/trails/:id` | Eliminar carrera |
| POST | `/trails/:id/waypoints` | Agregar waypoints a carrera |
| GET | `/users/me` | Perfil del usuario actual |
| GET | `/races/live` | Carreras activas en este momento |
| GET | `/positions/live` | Posiciones en tiempo real (WebSocket) |

## WebSocket — Eventos (Por implementar)

| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `join_race` | Client→Server | El corredor se une a una carrera |
| `position_update` | Client→Server | El corredor envía su posición GPS |
| `position_broadcast` | Server→Client | Broadcast de posición a todos en la carrera |
| `waypoint_reached` | Server→Client | Notificación de waypoint alcanzado |
| `race_update` | Server→Client | Actualización de ranking |

---

## Flujo de Datos — Carrera Activa

```
Corredor en campo:
GPS → TrackingService → Room (local) → SyncWorker → Backend API

Espectador web:
Browser → React App → Polling/WebSocket → Backend API → Mapa en vivo
```

## Configuración de URL del Backend

La app Android permite configurar la URL del backend dinámicamente via `DynamicBaseUrlInterceptor`. El usuario la ingresa en la pantalla de Login. La URL se persiste en DataStore.

El frontend web debe leer la URL del backend desde una variable de entorno `VITE_API_URL`.

---

## Despliegue

### Backend (Docker)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Variables de Entorno Requeridas
```
PORT=3000
DATABASE_URL=sqlite:./data/appradar.db
JWT_SECRET=<secreto_largo_aleatorio>
JWT_EXPIRY=7d
CORS_ORIGINS=https://tudominio.com
```

### Plataformas de Despliegue Recomendadas
- **Railway** — deploy automático desde git, SQLite o Postgres incluido
- **Render** — similar a Railway, plan gratuito disponible
- **DigitalOcean App Platform** — más control, ~$5/mes
- **VPS genérico** — máximo control, requiere más configuración

---

## Seguridad

### Pendiente de Implementar
1. **JWT tokens** en lugar de enviar usuario/contraseña en cada request
2. **bcrypt** para hashear contraseñas en la base de datos
3. **HTTPS** obligatorio en producción
4. **Rate limiting** en endpoints de auth
5. **Validación de inputs** en todos los endpoints del backend
6. **CORS** restringido a dominios conocidos

### Configuración Actual (Solo desarrollo)
- No hay autenticación real (mock usuario/1234)
- Backend acepta cualquier origen CORS
- Sin HTTPS
- Contraseñas en texto plano
