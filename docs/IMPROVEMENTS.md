# Mejoras Sugeridas — Análisis de Plataformas Similares

Basado en el análisis de LiveTrail, Trackleaders, RTRT.me, Traccar y proyectos open-source similares.

---

## Mejoras Críticas (Bloquean funcionalidad básica)

### 1. WebSocket para posiciones en tiempo real
**Estado: ✅ Implementado**
Socket.IO v4 en el backend con rooms por carrera (`race:<trailUuid>`). El frontend React recibe `position_broadcast` y `race_update` en tiempo real. El Android aún usa REST polling (pendiente migrar a WebSocket para recibir posiciones de compañeros).

### 2. Persistencia real de la base de datos
**Estado: ✅ Implementado**
SQLite con `better-sqlite3`. Los datos persisten en un volumen Docker (`/app/data/appradar.db`). Migración a PostgreSQL pendiente para escala horizontal.

### 3. Autenticación real con JWT
**Estado: ✅ Implementado**
JWT access token (1h) + refresh token (30d). Contraseñas hasheadas con bcryptjs. El frontend renueva el token automáticamente antes de que expire.

---

## Mejoras de Alta Prioridad

### 4. Replay de carrera (inspirado en Trackleaders)
**Estado: ✅ Implementado**
El backend guarda todas las posiciones GPS históricas. El endpoint `GET /races/:id/replay` devuelve los datos. El frontend tiene la página `/races/:id/replay` con reproducción animada de marcadores.  
**Pendiente:** controles de velocidad (1x/2x/5x) y exportación para redes sociales.

### 5. Vista espectador optimizada para móvil
**Descripción:** LiveTrail tiene la mejor UX para espectadores. La vista en vivo debe funcionar bien en mobile browser (espectadores en el evento).  
**Implementación:**
- Frontend responsive con Tailwind (prioridad mobile-first)
- PWA opcional con Service Worker para modo offline básico

### 6. Notificaciones a espectadores
**Descripción:** RTRT.me y LiveTrail envían notificaciones push cuando un corredor pasa un checkpoint.  
**Implementación:**
- Web Push API (notificaciones en el browser)
- El espectador sigue a un corredor específico y recibe alertas
- Notificación: "Juan Pérez pasó el Checkpoint 3 — va en 2° lugar"

---

## Mejoras de Valor Diferencial

### 7. "Ghost Runner" / Pace target (inspirado en LiveTrail)
**Descripción:** LiveTrail tiene un "ghost runner" que muestra el ritmo de un corredor de referencia (ej. el ganador del año anterior). 
**Implementación:**
- Importar tracks históricos de carreras pasadas
- Mostrar en el mapa un marcador fantasma con el ritmo objetivo
- En la app Android: indicador de si vas adelantado/atrasado vs el ghost

### 8. Predicción de tiempo de llegada
**Descripción:** Basado en el ritmo actual del corredor y la distancia restante, calcular hora estimada de llegada.  
**Implementación:**
- Calcular velocidad media de los últimos N waypoints
- Proyectar tiempo restante con variación de elevación
- Mostrar en leaderboard: "ETA: 14:32"

### 9. Heatmap de posiciones (inspirado en RTRT.me)
**Descripción:** Vista de densidad de corredores en el mapa, útil para organizadores para saber donde se concentra el pelotón.  
**Implementación:** `leaflet.heat` plugin, datos en tiempo real del WebSocket.

### 10. SOS / Emergencias (inspirado en LiveTrail)
**Estado: ✅ Parcialmente implementado**
La app Android tiene botón SOS. El backend almacena el flag `sos` en la carrera. El mapa del frontend muestra marcador de emergencia con ícono 🆘 y badge "S.O.S" parpadeante en rojo.  
**Pendiente:** notificación push al organizador cuando se activa el SOS.

### 11. Registro de actividad física post-carrera
**Descripción:** FitTrackee/Strava permiten analizar los datos de la carrera después.  
**Implementación:**
- Exportar track completo como GPX
- Estadísticas: velocidad media, desnivel, tiempo en movimiento vs parado
- Botón "Compartir en Strava" via OAuth

---

## Mejoras de Arquitectura

### 12. Soporte para GPS hardware dedicado (para rutas sin cobertura)
**Contexto:** Trackleaders usa dispositivos SPOT/Garmin inReach para eventos en zonas sin señal celular.  
**Relevancia para trail running en Argentina:** Muchas carreras en Patagonia/Andes tienen cobertura nula.  
**Implementación futura:**
- Endpoint en el backend para recibir datos de trackers vía webhook (SPOT/Garmin)
- En la app: modo "satellite" que indica que la posición viene de tracker externo

### 13. Redis pub/sub para escala horizontal
**Contexto:** Traccar usa esta arquitectura. Si el backend necesita múltiples instancias (>500 corredores simultáneos), Socket.IO necesita un broker para sincronizar rooms entre instancias.  
**Cuando implementar:** Cuando una sola instancia Node.js no sea suficiente.

### 14. Tiles de mapa offline para zonas sin internet
**Descripción:** En montaña sin señal, el mapa del frontend web no carga los tiles de OSM.  
**Implementación:**
- Pre-cargar tiles de OSM para la zona de la carrera antes del evento
- Android: OSMDroid ya soporta tiles offline, completar implementación
- Web: `leaflet.offline` plugin para PWA

---

## Comparativa con Competidores

| Feature | AppRadar actual | LiveTrail | Trackleaders | Recomendación |
|---------|----------------|-----------|--------------|---------------|
| GPS tracking offline | ✅ | ✅ | ✅ (satellite) | Mantener |
| Tiempo real WebSocket | ✅ (frontend) | ✅ | ✅ | Android pendiente |
| Frontend web | ✅ | ✅ | ✅ | Completado |
| Registro de usuarios | ✅ | ✅ | ✅ | Completado |
| Crear carreras desde web | ✅ | ✅ | ✅ | Completado |
| Replay de carrera | ✅ | ✅ | ✅ | Completado |
| Notificaciones push | ❌ | ✅ | ❌ | Mejora #6 |
| SOS / Emergencias | ✅ parcial | ✅ | ❌ | Push pendiente |
| Satellite tracker support | ❌ | ❌ | ✅ | Mejora #12 (futuro) |
| Self-hostable | ✅ | ❌ | ❌ | Ventaja competitiva |
| Open source | ✅ | ❌ | ❌ | Ventaja competitiva |

---

## Prioridad de Implementación

1. ~~**Inmediato:** Backend con persistencia real + JWT + CRUD de carreras~~ ✅ Completado
2. ~~**Siguiente:** Frontend React con auth + dashboard + vista en vivo~~ ✅ Completado
3. **Siguiente:** WebSocket en Android para recibir posiciones de compañeros en tiempo real
4. **Valor agregado:** Notificaciones push (SOS al organizador, compañero pasa waypoint)
5. **Escala:** Redis pub/sub, satellite trackers
