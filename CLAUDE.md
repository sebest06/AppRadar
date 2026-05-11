# AppRadar — Contexto para Claude

## Qué es AppRadar

AppRadar es una aplicación de seguimiento GPS para carreras de trail running que permite a los corredores ver en tiempo real la posición de sus compañeros de equipo durante una carrera. El sistema consta de tres componentes:

1. **Android App** — app nativa que los corredores llevan durante la carrera
2. **Backend REST API** — servidor Node.js desplegado en la nube
3. **Frontend Web (React)** — panel web para organizadores y espectadores

## Documentación del Proyecto

| Archivo | Contenido |
|---------|-----------|
| `docs/DOCUMENTATION.md` | Arquitectura técnica completa, stack, modelos de datos, APIs |
| `docs/SKILLS.md` | Tecnologías, librerías y skills necesarias para completar el proyecto |
| `BACKLOG.md` | Tareas pendientes priorizadas por sprint |
| `GAPS.md` | Preguntas abiertas técnicas y de negocio |
| `docs/IMPROVEMENTS.md` | Mejoras sugeridas basadas en análisis de plataformas similares |

## Estructura del Repositorio

```
AppRadar/
├── app/                    # Android App (Kotlin + Jetpack Compose)
│   └── src/main/java/com/appradar/
│       ├── data/           # Room DB, Retrofit, Repository
│       ├── service/        # TrackingService (Foreground GPS)
│       ├── ui/             # Screens + ViewModels (MVVM)
│       └── utils/          # LocationHelper, GpxParser, TimeUtils
├── backend/                # Node.js Express API
│   └── server.js           # Servidor principal (puerto 3000)
├── frontend/               # React Web App (POR CREAR)
│   └── src/
│       ├── pages/          # Login, Register, Dashboard, Race, Leaderboard
│       ├── components/     # Map, RaceCard, Leaderboard, etc.
│       └── services/       # API client, WebSocket
└── docs/                   # Documentación técnica
```

## Estado Actual del Proyecto

### Completado
- Android app con GPS tracking offline-first
- Backend básico en Node.js (in-memory, sin persistencia)
- Leaderboard por waypoints
- Sincronización en background con WorkManager
- Soporte para GPX files
- URL del backend configurable desde la app

### Pendiente (Crítico)
- Frontend ReactJS (no existe aún)
- Persistencia real del backend (SQLite/PostgreSQL)
- WebSocket para ubicaciones en tiempo real
- Registro de nuevos usuarios
- Creación de carreras desde el frontend web
- Dockerización del backend
- Despliegue en nube

## Reglas de Desarrollo

- El backend debe ser stateless y deployable en cualquier nube
- La URL del backend es configurable (ya implementado en Android via DynamicBaseUrlInterceptor)
- Arquitectura offline-first en Android (Room es la fuente de verdad local)
- El frontend web debe poder ver resultados en tiempo real sin necesidad de la app Android
- Nunca hardcodear URLs — siempre usar variables de entorno o configuración

## Comandos Útiles

```bash
# Backend local
cd backend && npm install && node server.js

# Frontend (cuando exista)
cd frontend && npm install && npm run dev

# Android
# Abrir en Android Studio y compilar con Gradle
```

## Variables de Entorno del Backend

```env
PORT=3000
DATABASE_URL=sqlite:./appradar.db   # o postgres://...
JWT_SECRET=tu_secreto_aqui
CORS_ORIGINS=http://localhost:5173,https://tudominio.com
```
