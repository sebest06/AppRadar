# Skills y Tecnologías Requeridas — AppRadar

## Backend

### Core (Ya existe / Completar)
- **Node.js + Express** — ya implementado, requiere refactoring
  - Agregar persistencia con `better-sqlite3` o `knex` + migrations
  - Estructurar en módulos: `routes/`, `controllers/`, `models/`, `middleware/`

### Autenticación
- **`jsonwebtoken`** — generar y validar JWT tokens
- **`bcryptjs`** — hashear contraseñas
- **`express-rate-limit`** — limitar intentos de login

### Tiempo Real
- **`socket.io`** v4 — WebSocket server para posiciones GPS en vivo
  - Rooms por carrera (`race:${raceId}`)
  - Eventos: `join_race`, `position_update`, `position_broadcast`, `waypoint_reached`

### Base de Datos
- **`better-sqlite3`** (MVP) — SQLite síncrono, simple, sin dependencias externas
- **`knex`** — query builder + sistema de migrations (reemplaza SQL manual)
- Alternativa avanzada: **PostgreSQL + PostGIS** para consultas geoespaciales nativas

### Validación y Seguridad
- **`zod`** o **`joi`** — validación de payloads de entrada
- **`helmet`** — headers de seguridad HTTP
- **`cors`** — ya implementado, configurar para producción

### Infraestructura
- **Docker** — `Dockerfile` + `docker-compose.yml` para dev y producción
- **`dotenv`** — variables de entorno
- **`winston`** o **`pino`** — logging estructurado

---

## Frontend (ReactJS — Por crear)

### Setup
- **Vite** — build tool (más rápido que CRA)
- **TypeScript** — tipado estático
- **`react-router-dom` v6** — routing con rutas protegidas

### UI/UX
- **Tailwind CSS** — estilos utilitarios, responsive
- **`shadcn/ui`** o **`@headlessui/react`** — componentes accesibles sin vendor lock-in
- Alternativa: **Ant Design** o **Material UI** si se prefiere UI más completa lista para usar

### Mapas (CRÍTICO)
- **`leaflet`** + **`react-leaflet`** — mapas OpenStreetMap, gratuitos, sin API key
  - Visualizar ruta del trail (GeoJSON/GPX)
  - Marcadores de corredores con actualización en tiempo real
  - Marcadores de waypoints (alcanzado / pendiente)
  - Layers para OSM tile server

### Tiempo Real
- **`socket.io-client`** v4 — recibir posiciones GPS en vivo
  - Hook custom `useRaceSocket(raceId)` para gestionar conexión

### Estado y Datos
- **`@tanstack/react-query`** v5 — fetching, caching, revalidación automática
- **`zustand`** — estado global ligero (user auth, config)

### HTTP
- **`axios`** — cliente HTTP con interceptor para JWT token

### Formularios
- **`react-hook-form`** + **`zod`** — formularios con validación

### GPX / Geo
- **`leaflet-gpx`** — parsear y visualizar archivos GPX en el mapa
- **`toGeoJSON`** — convertir GPX a GeoJSON

---

## Android (Mejoras pendientes)

### WebSocket
- **`socket.io-client`** para Android (`io.socket:socket.io-client:2.1.0`)
  - Enviar posición GPS al servidor cada 15 segundos durante carrera activa
  - Recibir posiciones de compañeros de equipo en tiempo real

### Mapas de Compañeros
- **OSMDroid** (ya implementado) — agregar marcadores dinámicos para compañeros
  - Custom marker con nombre del corredor
  - Animación suave al actualizar posición

### Mejoras de GPS
- `FusedLocationProviderClient` con `Priority.PRIORITY_HIGH_ACCURACY`
- Ajustar intervalos: 15 seg en movimiento, 60 seg en pausa

---

## DevOps / CI-CD

### Despliegue Recomendado (MVP)
1. **Railway** o **Render** — push to deploy desde git, incluye PostgreSQL
2. Variables de entorno gestionadas desde el dashboard del proveedor
3. HTTPS automático con Let's Encrypt

### Futuro
- **GitHub Actions** — CI para tests y lint en cada PR
- **Docker Hub** — publicar imagen del backend

---

## Herramientas de Desarrollo

| Herramienta | Uso |
|-------------|-----|
| Android Studio | Desarrollo Android |
| VS Code | Backend + Frontend |
| Postman / Insomnia | Testing de la API REST |
| Bruno (open source) | Alternativa a Postman, archivos de colección en git |
| DBeaver | Explorar base de datos SQLite/PostgreSQL |
| Wireshark / Charles Proxy | Debug de tráfico de red en Android |

---

## Estimación de Esfuerzo

| Área | Tareas | Estimado |
|------|--------|----------|
| Backend — persistencia + auth | B1, B2 | 2-3 días |
| Backend — WebSocket | B3 | 1-2 días |
| Backend — CRUD carreras | B4 | 1 día |
| Backend — Docker + deploy | B5 | 0.5 días |
| Frontend — Setup + Auth | F1, F2 | 1-2 días |
| Frontend — Dashboard + Crear carrera | F3, F4 | 2-3 días |
| Frontend — Vista en vivo | F5 | 2-3 días |
| Frontend — Resultados + Perfil | F6, F7 | 1-2 días |
| Android — WebSocket + ver compañeros | A1, A2 | 2-3 días |
| **Total MVP completo** | | **~15-20 días** |
