# Backlog de AppRadar

## Estado general del proyecto

| Área | Estado |
|------|--------|
| Backend (persistencia, auth, WebSocket, CRUD) | ✅ Completado |
| Frontend React (auth, dashboard, live, resultados, perfil) | ✅ Completado |
| Android (GPS, sync, offline-first, WearOS) | ✅ Completado |
| Tests (Jest, Playwright, JVM, Maestro) | ✅ Completado |
| Docker + CI/CD | ✅ Completado |

---

## Prioridad: ALTA — Android App (pendiente)

### A1. Notificaciones de progreso del equipo
- [ ] Configurable desde Ajustes (activar/desactivar)

### A2. Notificación push al organizador en SOS
El SOS ya se guarda en el backend y muestra en el mapa web, pero no hay alerta proactiva.
- [ ] Enviar notificación push al dispositivo del organizador cuando un corredor activa SOS
- [ ] Incluir coordenadas GPS exactas en la notificación

### A3. Crear una pantalla de visión general del equipo para el organizador
- [ ] Crear una pantalla donde pueda ver en una lista ordenada la posicion de todos los corredores del equipo
- [ ] Distinguir en la lista, si el corredor, abandono, pidio SOS, o termino la carrera
- [ ] Permitir enviar un mensaje a algun corredor o a todos y que el corredor lo reciba como una notificación en la aplicación Android
---

## Prioridad: ALTA — Frontend (pendiente)

---

## Prioridad: MEDIA — Features adicionales

### ~~M1. Predicción de tiempo de llegada (ETA)~~ ✅ Completado
- [x] Calcular ritmo promedio entre waypoints alcanzados
- [x] Proyectar hora estimada de llegada a la meta
- [x] Mostrar ETA en vista en vivo (badge verde/naranja si pasó la hora)
- [x] Mostrar ETA en tabla de resultados como columna adicional

### M2. "Ghost Runner" — corredor de referencia
Inspirado en LiveTrail. Permite comparar el ritmo actual vs cualquier participante anterior incluso uno mismo.
- [ ] Importar track histórico (GPX o JSON) como referencia
- [ ] Mostrar marcador fantasma en el mapa con su posición teórica
- [ ] Indicador en la app Android: "vas 3 min adelantado al ghost"

### ~~M3. Estadísticas de carrera post-evento~~ ✅ Completado
- [x] Velocidad media y máxima por corredor en la fila expandida de resultados
- [x] Distancia total entre waypoints alcanzados
- [x] Exportar GPX del recorrido completo (endpoint `GET /races/:id/gpx/:userUuid`)
- [x] Botón "Compartir" copia la URL pública al portapapeles
- [ ] Gráfico de elevación vs tiempo (requiere datos de altitud — no disponibles en GPS actual)

### ~~M4. Heatmap de posiciones~~ ✅ Completado
- [x] Vista de densidad de corredores en el mapa (`leaflet.heat`)
- [x] Botón toggle "🔥 Heatmap" en la vista en vivo, filtrado por sesión activa
- [x] Endpoint `GET /races/:trailId/heatmap?sessionUuid=` devuelve posiciones GPS

### M5. Integración con hardware GPS dedicado
Para carreras en zonas sin cobertura celular (Patagonia, Andes).
- [ ] Endpoint para recibir datos de trackers Garmin inReach / SPOT via webhook
- [ ] Mostrar posición en el mapa con indicador "vía satellite"

### M6. Notificaciones de actividad del equipo (Android)
- [ ] Push notification cuando el organizador acepta/rechaza la solicitud de un corredor
- [ ] Feedback inmediato en lugar de tener que refrescar manualmente

### M7. Permitir crear lista de amigos dentro del equipo
Cuando estas en carrera, no queres tener tanta información distrayendote
- [ ] Agregar una configuración para seleccionar si queres ver a todos los competidores, a ninguno, solo a todos tus amigos, o solo a algunos amigos
- [ ] En el mapa durante la carrera solo se muestran los competidores que seleccionaste

### M8. Notificaciones push web (Web Push API)
- [ ] Service Worker para recibir push notifications
- [ ] Suscripción a alertas de un corredor específico
- [ ] Notificación: "Juan pasó el Checkpoint 3 — va en 2° lugar"
- [ ] Notificación: "Ana activó el S.O.S."

---

## Prioridad: BAJA — Mejoras técnicas

### T1. Rate limiting en auth
- [ ] Instalar `express-rate-limit`
- [ ] Limitar intentos de login: max 5 por IP por minuto
- [ ] Limitar registro: max 10 por IP por hora

### T2. Headers de seguridad HTTP
- [ ] Instalar `helmet` en el backend
- [ ] Configurar CSP, X-Frame-Options, HSTS

### T3. Migración a PostgreSQL
- [ ] Cuando el volumen de corredores supere la capacidad de SQLite
- [ ] Script de migración de datos SQLite → PostgreSQL
- [ ] Usar `knex` como query builder para soportar ambos motores

### T4. Redis pub/sub para escala horizontal
- [ ] Si se necesitan múltiples instancias Node.js en paralelo
- [ ] Socket.IO necesita Redis adapter para sincronizar rooms entre instancias

### T5. Tiles de mapa offline (frontend web)
- [ ] Pre-cargar tiles OSM para la zona de la carrera antes del evento
- [ ] Plugin `leaflet.offline` + Service Worker
- [ ] Útil cuando el espectador tiene señal débil en el evento

### T6. Android — Tests de integración en CI
- [ ] Los tests Maestro actualmente no corren en GitHub Actions
- [ ] Agregar job que levante emulador Android en CI y corra los flujos

---

## Completado (referencia)

### ✅ Backend
- Persistencia SQLite con `better-sqlite3`
- JWT access token (1h) + refresh token (30d)
- bcrypt para contraseñas
- Zod para validación de inputs
- Socket.IO con rooms por carrera
- CRUD completo de trails y waypoints
- Endpoints: login, register, refresh, me, rankings, live, replay, events, sessions
- Paginación en rankings y sessions
- Autorización por rol (organizer/superuser/runner)
- Cooldown entre carreras
- Delete de sesión con autorización

### ✅ Frontend
- Login y registro
- Dashboard con filtros (todas/en vivo/mis carreras) y búsqueda
- Crear carrera con waypoints manuales o GPX
- Editar carrera
- Vista en vivo con mapa Leaflet + WebSocket + ranking
- Resultados con podio, tabla, gráfico de velocidad por tramo
- Replay de carrera animado
- Perfil de usuario, historial de carreras, cambio de contraseña
- Manejo de errores en todas las pantallas
- Refresh tokens automático

### ✅ Android
- GPS tracking offline-first con Room
- Sincronización en background con WorkManager
- Soporte GPX
- URL del backend configurable
- WearOS app
- Notificaciones de ranking durante carrera
- Mapa con waypoints

### ✅ Testing
- 94 tests Jest (backend)
- 35+ tests Playwright E2E (frontend)
- 33 tests JVM/Robolectric (Android)
- 5 flujos Maestro (Android integración)
- Test de simulación de carrera completa (2 corredores, 10 waypoints)
- Test de heatmap (50 corredores, 40 waypoints, 2000 puntos GPS)

### ✅ DevOps
- Dockerfile multi-stage (frontend embebido en imagen backend)
- docker-compose.prod.yml, local.yml, tests.yml, integration.yml
- GitHub Actions CI (Jest + Playwright + Docker build)
