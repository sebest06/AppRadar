# Mejoras Sugeridas — Análisis de Plataformas Similares

Basado en el análisis de LiveTrail, Trackleaders, RTRT.me, Traccar y proyectos open-source similares.

---

## Mejoras Críticas (Bloquean funcionalidad básica)

### 1. WebSocket para posiciones en tiempo real
**Contexto:** Actualmente el leaderboard usa polling cada 20 minutos. Las plataformas líderes (Traccar, LiveTrail) usan WebSocket para actualizaciones sub-segundo.  
**Implementación propuesta:**
- Backend: Socket.IO con rooms por carrera
- Android: emitir posición GPS cada 15 segundos
- Frontend web: recibir y renderizar marcadores dinámicos en Leaflet
- Fallback: si WebSocket falla, reintentar con backoff exponencial (crítico en zonas de montaña con señal inestable)

### 2. Persistencia real de la base de datos
**Contexto:** El backend actual usa arrays in-memory. Cualquier reinicio del servidor pierde todos los datos.  
**Implementación propuesta:** SQLite con `better-sqlite3` + migrations via `knex` para MVP, migrar a PostgreSQL cuando escale.

### 3. Autenticación real con JWT
**Contexto:** Actualmente credenciales en texto plano sin tokens.  
**Estándar de la industria:** JWT access token (15 min) + refresh token (7 días) en httpOnly cookie.

---

## Mejoras de Alta Prioridad

### 4. Replay de carrera (inspirado en Trackleaders)
**Descripción:** Trackleaders es muy valorado por su función de replay. Permite a organizadores y espectadores reproducir toda la carrera con animación de marcadores.  
**Implementación:**
- Guardar posición GPS cada 30 segundos en tabla `gps_history`
- Frontend: controles de reproducción (play/pause, velocidad 1x/2x/5x)
- Valor: enorme para post-race analysis y contenido en redes sociales

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
**Descripción:** LiveTrail tiene botón SOS que alerta a la organización con coordenadas exactas.  
**Implementación:**
- Botón SOS en la app Android (requiere confirmación en 2 pasos para evitar accidentes)
- Alerta al organizador via WebSocket con prioridad alta
- Almacenar incidente con coordenadas y timestamp
- En el mapa del organizador: marcador de emergencia parpadeante

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
| Tiempo real WebSocket | ❌ (polling) | ✅ | ✅ | Implementar en B3 |
| Frontend web | ❌ | ✅ | ✅ | Implementar en F1-F7 |
| Registro de usuarios | ❌ (mock) | ✅ | ✅ | Implementar en B2/F2 |
| Crear carreras desde web | ❌ | ✅ | ✅ | Implementar en F4 |
| Replay de carrera | ❌ | ✅ | ✅ | Mejora #4 |
| Notificaciones push | ❌ | ✅ | ❌ | Mejora #6 |
| SOS / Emergencias | ❌ | ✅ | ❌ | Mejora #10 |
| Satellite tracker support | ❌ | ❌ | ✅ | Mejora #12 (futuro) |
| Self-hostable | ✅ | ❌ | ❌ | Ventaja competitiva |
| Open source | ✅ | ❌ | ❌ | Ventaja competitiva |

---

## Prioridad de Implementación

1. **Inmediato:** Backend con persistencia real + JWT + CRUD de carreras
2. **Siguiente:** Frontend React con auth + dashboard + vista en vivo
3. **Después:** WebSocket en Android para posiciones de compañeros
4. **Valor agregado:** Replay, notificaciones, SOS
5. **Escala:** Redis, satellite trackers
