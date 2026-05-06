# Gaps y Preguntas Abiertas (AppRadar)

Este archivo sirve para registrar las incertidumbres técnicas y de negocio que deben resolverse a medida que avanza el proyecto.

## 1. Reglas de Negocio
- **Autenticación:** [RESUELTO] Se utilizará Google Login en el futuro. Por ahora se usará un Mock: usuario/usuario.
- **Asignación de Carreras:** [MOCK] Se utilizará una carrera fija mockeada en las sierras de Córdoba con waypoints predefinidos.
- **Validación de Waypoints:** ¿A cuántos metros de distancia de las coordenadas de un waypoint consideramos que el corredor ha "pasado" por ahí? ¿Será igual para todas las carreras?

## 2. Decisiones Técnicas
- **Stack del Backend:** Necesitamos definir qué framework/lenguaje se usará para el Backend (REST API). Node.js, Spring Boot (Java/Kotlin), Ktor, etc.
- **Sincronización en Tiempo Real vs Polling:** Para saber la posición (1ro, 2do, etc.), ¿haremos peticiones periódicas (polling) cada X minutos cuando haya señal, o implementaremos WebSockets/Server-Sent Events (SSE)? Por la naturaleza inestable de las redes móviles en montaña, el polling suele ser más seguro.
- **Rendimiento de Batería:** El GPS continuo drena la batería. ¿Configuraremos un intervalo de actualización de ubicación agresivo (ej. cada 1 segundo) o espaciado (ej. cada 10 segundos o usando geofencing) para optimizar el consumo?
- **Recuperación ante fallos:** Si el teléfono se reinicia en medio de la carrera, la app debe saber retomar el estado (gracias a Room) e iniciar el Foreground Service de nuevo automáticamente.

## 3. Infraestructura y Despliegue
- ¿Dónde alojaremos el backend y la base de datos central? (AWS, Google Cloud, Firebase, un VPS de DigitalOcean, etc.).
