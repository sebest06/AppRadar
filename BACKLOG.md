# Backlog de AppRadar

## Prioridad: CRÍTICA — Backend Producción

### B1. Migrar backend a persistencia real
- [ ] Agregar SQLite con `better-sqlite3` o `knex` al backend
- [ ] Migrar usuarios, trails, waypoints, tracks y raceRuns a tablas SQL
- [ ] Crear script de migración inicial con datos de ejemplo
- [ ] Agregar `dotenv` y leer configuración desde variables de entorno

### B2. Autenticación real con JWT
- [ ] Instalar `jsonwebtoken` y `bcryptjs`
- [ ] Endpoint `POST /auth/register` — crear nuevo usuario con contraseña hasheada
- [ ] Modificar `POST /auth/login` para devolver JWT access token
- [ ] Middleware `authMiddleware` que valide el token en rutas protegidas
- [ ] Endpoint `POST /auth/refresh` para renovar tokens
- [ ] Aplicar `authMiddleware` a todos los endpoints excepto login/register

### B3. WebSocket para tiempo real
- [ ] Instalar `socket.io` en el backend
- [ ] Evento `join_race` — corredor se une al room de una carrera
- [ ] Evento `position_update` — corredor envía posición GPS cada N segundos
- [ ] Broadcast `position_broadcast` — el server reenvía la posición a todos en el room
- [ ] Evento `waypoint_reached` — notificación cuando alguien pasa un waypoint
- [ ] Evento `race_update` — ranking actualizado en tiempo real

### B4. Endpoints CRUD de carreras (para frontend web)
- [ ] `POST /trails` — crear carrera (con nombre, distancia, elevación, waypoints)
- [ ] `PUT /trails/:id` — editar carrera
- [ ] `DELETE /trails/:id` — eliminar carrera (solo organizador)
- [ ] `POST /trails/:id/waypoints` — agregar waypoints
- [ ] `GET /races/live` — carreras activas ahora mismo

### B5. Dockerización y despliegue
- [ ] Crear `Dockerfile` en `/backend`
- [ ] Crear `docker-compose.yml` para entorno local (backend + db)
- [ ] Crear `.env.example` con todas las variables requeridas
- [ ] Documentar proceso de despliegue en Railway/Render/DO

---

## Prioridad: ALTA — Frontend ReactJS

### F1. Setup del proyecto frontend
- [ ] `npm create vite@latest frontend -- --template react-ts`
- [ ] Instalar dependencias: `react-router-dom`, `axios`, `leaflet`, `react-leaflet`, `socket.io-client`, `@tanstack/react-query`, `tailwindcss`
- [ ] Configurar `VITE_API_URL` como variable de entorno
- [ ] Crear estructura de carpetas: `pages/`, `components/`, `services/`, `hooks/`, `store/`
- [ ] Configurar React Router con rutas protegidas

### F2. Autenticación en el frontend
- [ ] Página `/login` — formulario usuario + contraseña
- [ ] Página `/register` — formulario de registro con nombre, email, contraseña, equipo
- [ ] Guardar JWT en `localStorage` o cookie httpOnly
- [ ] `AuthContext` o Zustand store para estado de autenticación global
- [ ] Redirect automático si el token expira

### F3. Dashboard principal
- [ ] Página `/dashboard` — lista de carreras disponibles
- [ ] Componente `RaceCard` con nombre, fecha, distancia, estado (activa/finalizada)
- [ ] Filtros: mis carreras / todas las carreras / carreras activas
- [ ] Búsqueda por nombre de carrera

### F4. Creación de carreras (organizador)
- [ ] Página `/races/new` — formulario de creación de carrera
- [ ] Input de nombre, descripción, distancia, elevación, fecha
- [ ] Upload de archivo GPX para extraer waypoints automáticamente
- [ ] Vista previa del recorrido en mapa Leaflet
- [ ] Edición de waypoints en el mapa (drag & drop, agregar, eliminar)
- [ ] Configurar parámetro `maxSkip` (waypoints saltables)
- [ ] Botón "Publicar carrera" que la hace visible a todos

### F5. Vista en vivo de una carrera (espectador)
- [ ] Página `/races/:id/live` — mapa con posiciones en tiempo real
- [ ] Conectar Socket.IO al iniciar la página
- [ ] Mostrar marcadores de cada corredor en el mapa con su nombre
- [ ] Sidebar con tabla de posiciones actualizada en tiempo real
- [ ] Mostrar ruta del trail en el mapa
- [ ] Marcadores de waypoints (alcanzados / pendientes)
- [ ] Indicador de última actualización de posición por corredor
- [ ] Auto-zoom para mostrar todos los corredores

### F6. Resultados de carrera
- [ ] Página `/races/:id/results` — resultados finales
- [ ] Tabla con posición, nombre, equipo, tiempo total, waypoints
- [ ] Exportar resultados a CSV
- [ ] Vista de historial de carrera de un corredor específico

### F7. Perfil de usuario
- [ ] Página `/profile` — datos del usuario
- [ ] Historial de carreras del usuario
- [ ] Estadísticas: total de carreras, km totales, etc.
- [ ] Cambiar contraseña

---

## Prioridad: ALTA — Android App (Mejoras)

### A1. Enviar posición GPS en tiempo real (WebSocket)
- [ ] Integrar Socket.IO en el cliente Android (`socket.io-client:2.1.0`)
- [ ] Conectar al iniciar una carrera y enviar posición cada 10 segundos
- [ ] Manejar reconexión automática si se pierde la señal
- [ ] Fallback a modo offline si no hay conexión

### A2. Ver posiciones de compañeros de equipo en el mapa
- [ ] Recibir `position_broadcast` via WebSocket
- [ ] Mostrar marcadores de compañeros en OSMDroid
- [ ] Actualizar posición suavemente con animación
- [ ] Mostrar nombre del compañero en el marcador

### A3. Notificaciones de progreso del equipo
- [ ] Notificación cuando un compañero alcanza un waypoint
- [ ] Notificación cuando alguien completa la carrera

---

## Prioridad: MEDIA — Features adicionales

### M1. Modo espectador en la app Android
- [ ] Pantalla de seguimiento sin estar corriendo
- [ ] Ver en tiempo real a todos los corredores de una carrera

### M2. Replay de carrera
- [ ] Almacenar historial de posiciones GPS (cada 30 segundos)
- [ ] Reproducir el recorrido completo de cada corredor en el frontend web
- [ ] Control de velocidad de reproducción (1x, 2x, 5x)

### M3. SOS / Emergencias
- [ ] Botón SOS en la app Android
- [ ] Alerta al organizador con posición GPS exacta
- [ ] Notificación a todos los espectadores del evento

### M4. Integración con hardware GPS dedicado
- [ ] Soporte para trackers Garmin inReach via API
- [ ] Soporte para dispositivos SPOT

---

## Futuro / Ideas

- Integración con Strava (importar/exportar actividades)
- App iOS (React Native para compartir código con frontend)
- Sistema de puntos y rankings históricos entre carreras
- Predicción de tiempos basada en ritmo actual
- Gestión de equipos y roles (organizador, corredor, espectador)
- Notificaciones push web (PWA)
- Modo offline del frontend web (Service Worker)
