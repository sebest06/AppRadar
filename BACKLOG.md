# Backlog de AppRadar

Este documento mantiene un registro priorizado de las tareas y funcionalidades necesarias para desarrollar AppRadar.

## Sprint 1: Fundaciones y Setup
- [ ] Inicializar repositorio y proyecto en Android Studio con Kotlin y Compose.
- [ ] Configurar inyección de dependencias (Hilt/Koin).
- [ ] Implementar la base de datos local (Room) con las entidades iniciales (User, Trail, Waypoint, Track).
- [ ] Configurar la navegación básica con Jetpack Navigation Compose.

## Sprint 2: Core Offline-First y Geolocalización
- [ ] Crear repositorios locales para escribir/leer datos de SQLite.
- [ ] Configurar el cliente HTTP (Retrofit) y las interfaces de servicio simulando las respuestas de la REST API.
- [ ] Implementar la obtención de la ubicación GPS (Foreground Service + Permissions).
- [ ] Lógica para validar el paso por un waypoint basado en las coordenadas actuales.

## Sprint 3: Sincronización y Backend (Fase 1)
- [ ] Implementar lógica de sincronización usando WorkManager.
- [ ] **[Backend]** Iniciar el proyecto backend (API REST) y crear endpoints básicos (GET waypoints, POST tracks).
- [ ] Conectar la app al backend real para descarga de carreras e inserción de tracks.

## Sprint 4: Experiencia de Usuario y Posiciones
- [ ] UI: Pantallas de carga, listado de carreras disponibles, y detalle de la carrera.
- [ ] UI: Pantalla en vivo de seguimiento (distancia al próximo waypoint, tiempo, etc.).
- [ ] **[Backend]** Endpoint para obtener la tabla de posiciones en vivo.
- [ ] UI: Mostrar notificaciones al usuario sobre su posición actual cuando haya señal.

## Futuro (Ideas)
- Integración con mapas offline (Mapbox u OpenStreetMap).
- Login y perfiles de usuarios robustos.
- Estadísticas post-carrera.
