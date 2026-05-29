# Gaps y Preguntas Abiertas (AppRadar)

Preguntas de negocio o técnicas que aún no tienen respuesta definitiva. Las cerradas se documentan para referencia.

---

## Abiertas

### G06 — Frecuencia de actualización GPS en Android
**Estado:** Abierto  
**Pregunta:** ¿Con qué frecuencia envía la app Android la posición GPS al backend?  
**Trade-offs:**
- Cada 5 seg → muy preciso, consume mucha batería y datos
- Cada 30 seg → ahorra batería, posición puede estar desactualizada
- **Recomendación:** Cada 15 segundos en movimiento, cada 60 en pausa
**Pendiente:** Actualmente la app usa intervalos fijos. Adaptar según velocidad/pausa.

### G11 — Proveedor de nube para producción
**Estado:** Abierto  
**Opciones:**
- **Railway** → Deploy automático desde git, ~$5-20/mes. Recomendado para MVP.
- **Render** → Plan gratuito disponible (se suspende tras 15min inactividad)
- **DigitalOcean App Platform** → $5/mes, sin suspensión
- **VPS (DigitalOcean/Hetzner)** → Máximo control, requiere configurar NGINX y SSL

### G12 — Cobertura móvil en las carreras
**Estado:** Abierto  
**Pregunta:** ¿Las carreras se harán en zonas con cobertura móvil razonable?  
**Situación actual:** La app Android ya maneja offline (offline-first con Room). Las posiciones se sincronizan cuando vuelve la señal. El frontend web no recibirá actualizaciones durante zonas sin cobertura.  
**Si hay zonas sin señal:** Evaluar integración con trackers Garmin/SPOT (ver BACKLOG M5).

### G13 — HTTPS en producción
**Estado:** Abierto  
**Requerimiento:** La app Android tiene `network_security_config.xml` que permite HTTP plano en desarrollo. En producción **debe** usarse HTTPS.  
**Acción pendiente:** Actualizar `network_security_config.xml` para solo permitir HTTPS en builds de release. El proveedor cloud elegido (G11) debería proveer SSL automático.

### G14 — Escala máxima esperada
**Estado:** Abierto  
**Pregunta:** ¿Cuántos corredores simultáneos esperamos manejar?  
**Referencia:** Node.js single-process puede manejar cientos de WebSockets con SQLite. Para +500 corredores simultáneos considerar Redis pub/sub y replicación (ver BACKLOG T4).

### G15 — Última posición conocida cuando no hay señal (Android)
**Estado:** Abierto  
**Pregunta:** En la app Android, cuando un compañero lleva más de N minutos sin actualizar posición, ¿mostramos su última posición conocida con un indicador de "sin señal" o directamente no mostramos el marcador?  
**Sugerencia:** Mostrar el marcador con color gris y timestamp "hace X min" para indicar que es una posición vieja.

### G16 — Internacionalización
**Estado:** Abierto  
**Pregunta:** ¿La app solo en español o también en inglés/portugués?  
**Situación actual:** App Android y frontend en español. Backend devuelve mensajes de error en español.

### G17 — Visibilidad pública de resultados
**Estado:** Abierto  
**Pregunta:** ¿Los resultados de una carrera deben ser accesibles sin login (para compartir el link con espectadores que no tienen cuenta)?  
**Situación actual:** La vista en vivo (`/races/:id/live`) y resultados (`/races/:id/results`) requieren login. El backend no requiere auth para `GET /rankings` ni `GET /races/live`.  
**Acción:** Decidir si el frontend debe permitir acceso anónimo a estas páginas.

### G18 — Categorías de corredores
**Estado:** Abierto  
**Pregunta:** ¿Se necesitan categorías (masculino/femenino, por edad, por modalidad)?  
**Situación actual:** El backend tiene la tabla `users_categories` y el endpoint `GET /rankings` acepta `categoryUuid` como filtro. El frontend tiene un select de categoría en Resultados. Falta definir si el organizador puede asignar categorías al registrar una carrera.

---

## Cerradas (referencia)

### G01 — Validación de waypoints ✅ Resuelto
**Decisión:** Radio variable por waypoint (campo `radius` en metros en cada `WaypointEntity`). El organizador lo configura al crear la carrera. Por defecto 50 metros. La detección usa `distanceTo()` de Android (equivalente a Haversine).

### G02 — Roles de usuario ✅ Resuelto
**Decisión:** Tres roles implementados:
- `runner` — puede correr carreras y ver resultados de su equipo
- `organizer` — puede crear/editar/eliminar sus carreras, gestionar su equipo
- `superuser` (admin) — acceso total, ve todas las carreras y equipos  
Los corredores se registran asociados al equipo del organizador. La membresía requiere aprobación del organizador.

### G03 — Visibilidad de carreras ✅ Resuelto
**Decisión:** Las carreras tienen visibilidad basada en equipo:
- Carreras sin `teamUuid` → públicas (creadas por admin)
- Carreras con `teamUuid` → visibles solo para miembros del equipo con `teamStatus: accepted`
- Admin ve todas

### G04 — Inscripción a carreras ✅ Resuelto
**Decisión:** No hay inscripción previa a una carrera específica. El corredor puede participar en cualquier carrera visible para su equipo en cualquier momento. La app Android sincroniza la lista de carreras desde el backend.

### G05 — Equipos vs individuos ✅ Resuelto
**Decisión:** El sistema es por equipos (organizador crea equipo, los corredores se unen). El leaderboard muestra individuos con su equipo. No hay modalidad de correr sin equipo.

### G07 — Sincronización tiempo real ✅ Resuelto
**Decisión:** Socket.IO implementado en backend y frontend web. El frontend recibe `position_broadcast` (posición GPS) y `race_update` (ranking actualizado) en tiempo real. La app Android aún usa REST polling para enviar posiciones (WebSocket en Android pendiente para recibir posiciones de compañeros).

### G08 — Base de datos del backend ✅ Resuelto
**Decisión:** SQLite con `better-sqlite3` para el MVP. Sin ORM, SQL directo. El archivo de la DB se monta como volumen Docker (`/app/data/appradar.db`). Migración a PostgreSQL queda como tarea futura cuando el volumen lo requiera.

### G09 — Almacenamiento de posiciones GPS históricas ✅ Resuelto
**Decisión:** Se guardan todas las posiciones GPS en la tabla `gps_positions`. Esto habilita el replay de carrera. Una carrera de 5h con 20 corredores enviando cada 30 seg ≈ 12,000 filas, manejable con SQLite.

### G10 — Autenticación mobile vs web ✅ Resuelto
**Decisión:** El mismo sistema JWT para app Android y frontend web. La app Android guarda el token en DataStore. El frontend web en memoria (Zustand) + localStorage. El token de acceso dura 1h y se renueva con refresh token (30 días) automáticamente.
