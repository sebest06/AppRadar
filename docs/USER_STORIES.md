# Historias de Usuario - AppRadar

Este documento detalla las funcionalidades principales de AppRadar desde la perspectiva del usuario para las plataformas Mobile (Teléfono) y Wearable (Reloj).

---

## 📱 Aplicación Mobile (Android)

### 👤 Autenticación y Perfil
1. **Registro de Corredor**: Como corredor, quiero registrarme en la aplicación seleccionando un equipo existente, para que mis tiempos se contabilicen para mi club.
2. **Login Seguro**: Como usuario, quiero iniciar sesión con mis credenciales, para acceder a mi historial y carreras activas.
3. **Selección de Icono**: Como corredor, quiero elegir un icono que me represente (corredor, ciclista, coche) en el mapa en vivo, para que otros me identifiquen fácilmente.

### 🏁 Gestión de Carreras (Organizador)
4. **Creación de Rutas**: Como organizador, quiero crear una carrera definiendo el nombre, distancia, desnivel y puntos de paso (waypoints), para que los corredores puedan participar.
5. **Definición de Waypoints**: Como organizador, quiero situar los waypoints en el mapa y definir su radio de detección, para asegurar que los corredores sigan la ruta correcta.
6. **Activación de Carrera**: Como organizador, quiero activar una carrera en un momento específico, para que sea visible y accesible para los participantes.

### 🏃 Durante la Carrera (Corredor)
7. **Inicio de Carrera**: Como corredor, quiero pulsar "Iniciar" en una carrera activa, para que el sistema empiece a cronometrar mi tiempo y rastrear mi posición.
8. **Seguimiento en Segundo Plano**: Como corredor, quiero que el rastreo GPS siga funcionando aunque apague la pantalla del celular o use otra app, para no perder el registro de mi carrera.
9. **Detección Automática de Waypoints**: Como corredor, quiero que la app detecte automáticamente cuando paso por un punto de control, para no tener que interactuar con el teléfono mientras corro.
10. **Mapa en Tiempo Real**: Como corredor, quiero ver mi posición actual y los waypoints pendientes en un mapa, para orientarme durante la ruta.
11. **Abandono de Carrera**: Como corredor, quiero poder terminar la carrera en cualquier momento (aunque no llegue a la meta), marcándola como abandonada para informar a los organizadores.
12. **Reanudación de Sesión**: Como corredor, si salgo de la aplicación por error, quiero poder volver a la pantalla de carrera activa y continuar desde donde estaba.

### 📊 Información y Social
13. **Ranking en Vivo**: Como usuario, quiero consultar el ranking en tiempo real de una carrera, para ver mi posición respecto a otros competidores.
14. **Sincronización con Reloj**: Como corredor, quiero enviar la configuración y las carreras a mi reloj inteligente, para poder correr sin necesidad de mirar el teléfono.

---

## ⌚ Aplicación Wearable (WearOS)

### 🔄 Configuración
1. **Sincronización de Datos**: Como corredor, quiero que mi reloj reciba automáticamente la URL del servidor y mi token de acceso desde mi teléfono, para evitar configuraciones manuales tediosas.
2. **Lista de Carreras**: Como corredor, quiero ver en mi reloj la lista de carreras que tengo disponibles en mi teléfono, para seleccionar una rápidamente.

### ⏱️ Competición en la Muñeca
3. **Interfaz de Carrera**: Como corredor, quiero ver mi tiempo transcurrido, la distancia al siguiente waypoint y el conteo de puntos alcanzados de un vistazo en mi reloj.
4. **Mapa Simplificado**: Como corredor, quiero ver una representación visual de la ruta y los waypoints en la pantalla circular del reloj, para saber si voy por buen camino.
5. **Notificaciones de Posición**: Como corredor, quiero que mi reloj vibre y me notifique cuando gano o pierdo una posición en el ranking general, para mantenerme motivado.
6. **Persistencia**: Como corredor, quiero que si el reloj se reinicia o la app se cierra, pueda volver a la carrera en curso con el tiempo sincronizado.
7. **Control Táctil con Guantes**: Como corredor, quiero botones grandes y claros para iniciar, pausar o detener la carrera, facilitando el uso durante el ejercicio intenso.

---

## 🛡️ Reglas de Negocio (Backend)
1. **Restricción de Largada**: Como sistema, no permitiré que un corredor inicie la misma carrera más de una vez en un intervalo de 1 hora, para evitar abusos y errores de registro.
2. **Validación de Waypoints (Skip)**: Como sistema, permitiré saltar un número máximo de waypoints (definido por el organizador) antes de invalidar la carrera, para dar flexibilidad en terrenos difíciles.
