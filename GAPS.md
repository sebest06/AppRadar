# Gaps y Preguntas Abiertas (AppRadar)

## 1. Reglas de Negocio

### G01 — Validación de waypoints
**Estado:** Abierto  
**Pregunta:** ¿A cuántos metros de distancia de las coordenadas de un waypoint se considera que el corredor "pasó"? ¿El radio es configurable por carrera o fijo global?  
**Impacto:** Afecta `WaypointEntity.radius` y la lógica de `LocationHelper`  
**Contexto:** Actualmente implementado con radio variable por waypoint (campo `radius` en la entidad). Se usa la distancia Haversine.

### G02 — Roles de usuario
**Estado:** Abierto  
**Pregunta:** ¿Qué roles necesitamos? Propuesta: `RUNNER` (corre), `ORGANIZER` (crea/edita carreras), `SPECTATOR` (solo ve). ¿Puede un corredor ser organizador?  
**Impacto:** Afecta el modelo de datos de usuario y los permisos del backend

### G03 — Visibilidad de carreras
**Estado:** Abierto  
**Pregunta:** ¿Las carreras son públicas (cualquiera puede ver los resultados) o privadas (solo equipo/invitados)?  
**Impacto:** Afecta el endpoint `/races/live` y el frontend de espectadores

### G04 — Inscripción a carreras
**Estado:** Abierto  
**Pregunta:** ¿Los corredores se inscriben previamente a una carrera o pueden unirse en cualquier momento?  
**Impacto:** Afecta flujo en la app Android (actualmente solo selecciona una carrera de la lista)

### G05 — Equipos vs individuos
**Estado:** Abierto  
**Pregunta:** ¿La carrera es siempre por equipos o también se puede correr individualmente? ¿El leaderboard muestra individuos, equipos, o ambos?

---

## 2. Decisiones Técnicas

### G06 — Frecuencia de actualización GPS
**Estado:** Abierto  
**Pregunta:** ¿Con qué frecuencia envía la app Android la posición GPS al servidor via WebSocket?  
**Trade-offs:**
- Cada 5 seg → muy preciso, consume mucha batería y datos
- Cada 30 seg → ahorra batería, pero la posición puede estar desactualizada
- **Recomendación:** Cada 15 segundos en movimiento, cada 60 en pausa (basado en velocidad)

### G07 — Sincronización tiempo real vs polling
**Estado:** Parcialmente resuelto  
**Decisión actual:** Polling cada 20 minutos para el leaderboard  
**Pendiente:** Migrar a WebSocket para posiciones en tiempo real en la vista de espectador web  
**Razonamiento:** En montaña la señal es inestable; WebSocket debe reconectarse automáticamente con backoff exponencial

### G08 — Base de datos del backend
**Estado:** Abierto  
**Opciones:**
- **SQLite** (`better-sqlite3`): Simple, sin config adicional, ideal para comenzar. Limitaciones en escrituras concurrentes.
- **PostgreSQL + PostGIS**: Soporte nativo para consultas geoespaciales (distancias, cercano a punto). Recomendado si hay +100 corredores simultáneos.
- **Recomendación:** SQLite para MVP, migrar a Postgres cuando el volumen lo requiera

### G09 — Almacenamiento de posiciones GPS históricas
**Estado:** Abierto  
**Pregunta:** ¿Guardamos cada posición GPS emitida por los corredores o solo los waypoints alcanzados?  
**Impacto en storage:** Una carrera de 5h con 20 corredores enviando cada 15 seg = 24,000 posiciones  
**Opciones:** Guardar todo (habilita replay) vs solo waypoints (mucho menos storage)

### G10 — Autenticación mobile vs web
**Estado:** Abierto  
**Pregunta:** ¿La app Android y el frontend web usan el mismo sistema de auth?  
**Recomendación:** Sí, mismos endpoints JWT. La app Android guarda el token en DataStore, el frontend en localStorage o cookie httpOnly.

---

## 3. Infraestructura

### G11 — Proveedor de nube
**Estado:** Abierto  
**Opciones:**
- **Railway** → Deploy automático desde git, Postgres incluido, ~$5-20/mes. Recomendado para MVP.
- **Render** → Similar a Railway, plan gratuito (se suspende tras 15min inactividad)
- **DigitalOcean App Platform** → $5/mes, sin suspensión
- **VPS (DigitalOcean/Hetzner)** → Máximo control, requiere configurar NGINX, SSL, etc.
- **Firebase** → Más complejo de usar con Express, pero tiene Firestore y Auth integrados

### G12 — Zona de cobertura y conectividad
**Estado:** Abierto  
**Pregunta:** ¿Las carreras se harán en zonas con cobertura móvil razonable?  
**Si hay zonas sin cobertura:** La app Android ya maneja esto (offline-first con Room). Pero el frontend web no recibirá actualizaciones durante esas zonas.

### G13 — SSL/HTTPS
**Estado:** Abierto  
**Requerimiento:** La app Android tiene `network_security_config.xml` que permite HTTP plano en desarrollo. En producción **debe** usarse HTTPS.  
**Acción:** Actualizar `network_security_config.xml` para solo permitir HTTPS en builds de release.

### G14 — Escala del sistema
**Estado:** Abierto  
**Pregunta:** ¿Cuántos corredores simultáneos esperamos manejar?  
**Impacto:** Un Node.js single-process puede manejar cientos de WebSockets. Si se necesita escala horizontal, agregar Redis como pub/sub broker entre instancias.

---

## 4. Experiencia de Usuario

### G15 — Visualización cuando no hay señal
**Estado:** Abierto  
**Pregunta:** En la app Android, ¿mostramos la última posición conocida de los compañeros cuando no hay señal, con un indicador de "desactualizado"?

### G16 — Internacionalización
**Estado:** Abierto  
**Pregunta:** ¿La app solo en español o también en inglés/portugués?
