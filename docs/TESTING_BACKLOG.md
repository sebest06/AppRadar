# Backlog de Testing — AppRadar

Inventario completo de todos los tests del proyecto. Cada test está descrito en lenguaje natural explicando qué verifica, cómo lo hace y dónde está ubicado.

---

## Resumen general

| Tipo | Archivos | Tests |
|------|----------|-------|
| Backend unitarios (Jest) | 6 | 94 |
| Frontend E2E (Playwright) | 4 | 24 |
| Android unitarios (JVM/Robolectric) | 5 | 33 |
| Android integración (Maestro) | 7 | 5 flujos + 1 suite |
| E2E legacy (Maestro) | 2 | 2 flujos |

---

## 1. Tests de Backend — Jest

Tests unitarios/integración del servidor Node.js. Corren con una base de datos SQLite en memoria, sin servidores externos. Cada archivo de test crea su propia app y DB aislada.

**Cómo correrlos:** `cd backend && npm test`

---

### 1.1 Autenticación de usuarios

**Archivo:** `backend/tests/auth.test.js`

---

**1. Login exitoso del administrador**
Verifica que el usuario administrador puede iniciar sesión con sus credenciales por defecto (`admin` / `1234`). Envía un POST a `/auth/login` con esas credenciales y comprueba que la respuesta tiene código 200 y contiene un token JWT válido.

---

**2. Datos de usuario incluidos en la respuesta del login**
Verifica que al hacer login, además del token, la respuesta incluye los datos del usuario (nombre de usuario y rol). También comprueba que el campo de contraseña nunca se devuelve en la respuesta.

---

**3. Login rechazado con contraseña incorrecta**
Verifica que proporcionar la contraseña incorrecta con un usuario válido resulta en un error 401. Comprueba que se devuelve un mensaje de error.

---

**4. Login rechazado cuando el usuario no existe**
Verifica que intentar hacer login con un nombre de usuario que no existe en la base de datos devuelve un error 401.

---

**5. Registro de organizador con equipo propio**
Verifica que un nuevo usuario con rol de organizador puede registrarse indicando el nombre de su equipo. Comprueba que el código de respuesta es 201, el rol queda como `organizer` y el estado de membresía queda como `accepted` (los organizadores pertenecen automáticamente a su propio equipo).

---

**6. Registro de corredor asociado a un equipo existente**
Verifica que un corredor puede registrarse usando el UUID del equipo de un organizador ya existente. Comprueba que el rol queda como `runner` y que la asignación al equipo es correcta.

---

**7. Corredor registrado queda con estado "pendiente"**
Verifica que cuando un corredor se registra en un equipo existente, su estado de membresía queda como `pending` hasta que el organizador lo apruebe. Esto modela el flujo de aprobación manual de corredores.

---

**8. Registro rechazado si el corredor no selecciona equipo**
Verifica que un usuario con rol `runner` no puede registrarse sin especificar a qué equipo quiere unirse. La respuesta debe ser un error 400 con un mensaje que mencione "equipo".

---

**9. Registro rechazado si la contraseña es muy corta**
Verifica que las contraseñas de menos de 6 caracteres son rechazadas durante el registro. La respuesta debe ser un error 400.

---

**10. Registro rechazado si faltan campos obligatorios**
Verifica que intentar registrarse sin proveer todos los datos requeridos (usuario, contraseña, nombre) resulta en un error 400.

---

**11. Registro rechazado por nombre de usuario duplicado**
Verifica que si alguien intenta registrarse con un nombre de usuario que ya existe, el servidor devuelve un error 409 (conflicto).

---

**12. Registro rechazado si el UUID del equipo no existe**
Verifica que si un corredor proporciona el UUID de un equipo que no existe en la base de datos, el servidor devuelve un error 404. Usa un UUID válido en formato pero inexistente (`00000000-0000-...`).

---

### 1.2 Posiciones GPS

**Archivo:** `backend/tests/gps.test.js`

---

**1. Registro correcto de una posición GPS**
Verifica que un corredor autenticado puede subir su posición GPS (latitud, longitud, precisión) y que ésta queda guardada en la base de datos con las coordenadas correctas.

---

**2. Actualización del tipo de actividad al subir GPS**
Verifica que si el payload de GPS incluye el campo `activityType` (por ejemplo `bike`), el tipo de actividad del usuario se actualiza en la base de datos. Esto permite que el mapa muestre el ícono correcto para cada corredor.

---

**3. Uso del timestamp del servidor cuando no se provee uno**
Verifica que si el cliente no envía un `timestamp` en el payload, el servidor usa la hora actual. Comprueba que el timestamp guardado cae dentro de un rango esperado.

---

**4. Error cuando falta el UUID de la ruta**
Verifica que subir una posición GPS sin indicar la ruta (`trailUuid`) devuelve un error 400.

---

**5. Error cuando faltan las coordenadas**
Verifica que subir una posición GPS sin latitud o longitud devuelve un error 400.

---

**6. Error sin autenticación**
Verifica que intentar subir una posición GPS sin token JWT devuelve un error 401.

---

### 1.3 Perfil de usuario

**Archivo:** `backend/tests/me.test.js`

---

**1. Obtención del perfil propio**
Verifica que un usuario autenticado puede consultar sus propios datos de perfil mediante GET `/auth/me`. Comprueba que la respuesta incluye el nombre de usuario y que el campo de contraseña no aparece.

---

**2. Perfil rechazado sin autenticación**
Verifica que consultar el perfil sin token JWT devuelve un error 401.

---

**3. Actualización del nombre de usuario**
Verifica que un usuario puede cambiar su nombre de display enviando un PUT a `/auth/me` con el nuevo nombre. Comprueba que el cambio se refleja en la respuesta.

---

**4. Actualización del tipo de actividad**
Verifica que un usuario puede cambiar su tipo de actividad (corredor, ciclista, vehículo) enviando un PUT a `/auth/me`. Comprueba que el cambio se persiste correctamente.

---

**5. Tipo de actividad inválido rechazado**
Verifica que intentar establecer un tipo de actividad fuera de los valores permitidos (`runner`, `bike`, `car`) devuelve un error 400.

---

**6. Cambio de contraseña exitoso**
Verifica que un usuario puede cambiar su contraseña proporcionando la contraseña actual correcta y una nueva contraseña válida. Comprueba que la operación devuelve éxito. Usa un usuario dedicado para este test para no afectar al administrador.

---

**7. Cambio de contraseña rechazado si la actual es incorrecta**
Verifica que si la contraseña actual proporcionada no coincide con la real, el servidor devuelve un error 401 con un mensaje que indica que la contraseña es incorrecta.

---

**8. Nueva contraseña rechazada si es muy corta**
Verifica que la nueva contraseña debe tener al menos 6 caracteres; de lo contrario se devuelve un error 400.

---

**9. Historial vacío para usuario sin carreras**
Verifica que un usuario que nunca ha participado en una carrera recibe una lista vacía al consultar GET `/auth/me/history`. Comprueba que el `total` es 0 y `data` es un array vacío.

---

**10. Historial con datos correctos tras participar en una carrera**
Verifica que después de participar en una carrera, ésta aparece en el historial con todos los campos esperados: nombre de la ruta, estado de completado, distancia en km, waypoints alcanzados y total de waypoints. Crea una ruta y un run de prueba vía API antes de verificar.

---

**11. Paginación del historial**
Verifica que los parámetros `limit` y `offset` funcionan correctamente en el historial. Solicita `limit=1` y comprueba que solo se devuelve 1 resultado, con los metadatos de paginación correctos.

---

**12. Historial rechazado sin autenticación**
Verifica que consultar el historial sin token JWT devuelve un error 401.

---

**13. Generación de nuevo token con refresh token válido**
Verifica que enviando un refresh token válido (obtenido durante el login) al endpoint POST `/auth/refresh`, el servidor devuelve un nuevo par de tokens (access token + refresh token).

---

**14. Refresh token inválido rechazado**
Verifica que enviar una cadena arbitraria como refresh token devuelve un error 401.

---

**15. Refresh sin body rechazado**
Verifica que llamar al endpoint de refresh sin proporcionar el campo `refreshToken` en el body devuelve un error 400.

---

### 1.4 Ciclo de vida de una carrera

**Archivo:** `backend/tests/races.test.js`

---

**1. Inicio de carrera y creación de sesión**
Verifica que cuando un corredor sube su primer run para una ruta, el servidor lo acepta con código 200 y devuelve un `sessionUuid` único que identifica la sesión de carrera.

---

**2. Agrupación de corredores en la misma sesión**
Verifica que dos corredores que inician una carrera en la misma ruta en momentos próximos (dentro de 1 hora) quedan agrupados en la misma sesión. Ambos reciben el mismo `sessionUuid`.

---

**3. Actualización de run existente**
Verifica que si se envía un run con el mismo `runUuid` que uno ya existente, el registro se actualiza en lugar de crear uno nuevo. Esto permite que la app sincronice actualizaciones de estado.

---

**4. Registro de abandono de carrera**
Verifica que un corredor puede marcar su carrera como abandonada enviando `isAbandoned: true`. Comprueba que el campo queda registrado correctamente en la base de datos.

---

**5. Registro de finalización de carrera**
Verifica que un corredor puede marcar su carrera como completada enviando `isCompleted: true`. Comprueba que el campo queda registrado correctamente.

---

**6. Cooldown entre carreras — bloqueo**
Verifica que si un corredor intenta iniciar una segunda carrera en la misma ruta antes de que pase 1 hora desde la primera, el servidor rechaza la solicitud con un error 403. Este es el mecanismo de cooldown anti-spam.

---

**7. Cooldown — tiempo restante informado**
Verifica que cuando se bloquea una carrera por cooldown, la respuesta incluye el campo `remainingMinutes` con los minutos que faltan para poder iniciar otra carrera (valor entre 0 y 60).

---

**8. Upload de run sin autenticación rechazado**
Verifica que intentar subir datos de carrera sin token JWT devuelve un error 401.

---

**9. Registro de un waypoint alcanzado**
Verifica que un corredor puede subir un track indicando que pasó por un waypoint. Comprueba que el registro queda guardado en la base de datos.

---

**10. Upload de múltiples waypoints en un request**
Verifica que se pueden subir varios waypoints en un único request enviando un array de tracks. Comprueba que todos quedan guardados.

---

**11. Track duplicado ignorado sin error**
Verifica que subir el mismo waypoint dos veces para el mismo run no produce un error. El índice único `(runUuid, waypointUuid)` previene duplicados silenciosamente gracias al `INSERT OR IGNORE`.

---

**12. Upload de track sin autenticación rechazado**
Verifica que intentar subir waypoints sin token JWT devuelve un error 401.

---

**13. Ranking con corredor visible**
Verifica que el endpoint GET `/rankings` devuelve al corredor en el ranking con su progreso de waypoints correcto.

---

**14. Ranking ordenado por waypoints**
Verifica que el ranking devuelve a los corredores ordenados de mayor a menor cantidad de waypoints alcanzados.

---

**15. Corredor marcado como completado en el ranking**
Verifica que cuando un run está marcado como `isCompleted`, el ranking refleja ese estado correctamente.

---

**16. Corredor marcado como abandonado en el ranking**
Verifica que cuando un run está marcado como `isAbandoned`, el ranking refleja ese estado correctamente.

---

**17. Filtro de ranking por sesión**
Verifica que si se provee un `sessionUuid`, el ranking devuelve solo los corredores de esa sesión específica.

---

**18. Paginación del ranking**
Verifica que el ranking soporta paginación: al pedir `limit=1` se devuelve 1 resultado con los metadatos `total`, `limit` y `offset`.

---

**19. Ranking sin trailUuid rechazado**
Verifica que solicitar el ranking sin especificar la ruta devuelve un error 400.

---

**20. Listado de sesiones con paginación**
Verifica que el endpoint GET `/races/sessions` devuelve las sesiones de una ruta con el conteo de corredores por sesión, en formato paginado.

---

**21. Paginación de sesiones**
Verifica que los parámetros `limit` y `offset` funcionan correctamente en el listado de sesiones.

---

**22. Listado de sesiones sin trailUuid rechazado**
Verifica que solicitar sesiones sin especificar la ruta devuelve un error 400.

---

**23. Posición en vivo de corredor activo**
Verifica que el endpoint GET `/races/live` devuelve la posición de un corredor que subió su GPS hace menos de 2 minutos, marcado como `isOnline: true`.

---

**24. Lista vacía cuando no hay sesión activa**
Verifica que si no hay ninguna sesión activa para una ruta, el endpoint de posiciones en vivo devuelve un array vacío.

---

**25. Posiciones en vivo sin trailUuid rechazado**
Verifica que solicitar posiciones en vivo sin especificar la ruta devuelve un error 400.

---

**26. Historial de ruta de un corredor en orden cronológico**
Verifica que GET `/races/:trailId/route-history/:userUuid` devuelve todas las posiciones GPS del corredor ordenadas por timestamp ascendente.

---

**27. Historial vacío si el corredor no tiene posiciones**
Verifica que si el corredor nunca subió posiciones GPS para esa ruta, el historial devuelve una lista vacía.

---

**28. Borrado de sesión sin autenticación rechazado**
Verifica que intentar borrar una sesión sin token JWT devuelve un error 401.

---

**29. Borrado de sesión por usuario no autorizado rechazado**
Verifica que un organizador no puede borrar sesiones de rutas que no creó él. La respuesta debe ser un error 403.

---

**30. Borrado de sesión por corredor rechazado**
Verifica que un usuario con rol `runner` no puede borrar sesiones, ya que solo los organizadores y administradores tienen ese permiso (error 403).

---

**31. Borrado de sesión inexistente**
Verifica que intentar borrar una sesión con un UUID que no existe devuelve un error 404.

---

**32. Creador de la ruta puede borrar su sesión**
Verifica que el organizador que creó la ruta puede borrar una sesión de ella. Comprueba que la sesión desaparece del listado tras el borrado.

---

**33. Superusuario puede borrar cualquier sesión**
Verifica que el administrador del sistema puede borrar sesiones de cualquier ruta, independientemente de quién la haya creado.

---

### 1.5 Gestión de equipos

**Archivo:** `backend/tests/teams.test.js`

---

**1. Listado de equipos disponibles**
Verifica que GET `/teams` devuelve todos los equipos de organizadores registrados en el sistema. Comprueba que la respuesta es un array con el equipo de prueba incluido.

---

**2. Estructura correcta de cada equipo**
Verifica que cada objeto de equipo en la respuesta incluye los campos `uuid_team` (identificador único) y el nombre del equipo.

---

**3. Listado de solicitudes pendientes del equipo**
Verifica que un organizador puede ver qué corredores tienen solicitudes pendientes para unirse a su equipo, usando GET `/team/requests`.

---

**4. Solicitudes rechazadas sin autenticación**
Verifica que consultar las solicitudes de equipo sin token JWT devuelve un error 401.

---

**5. Solicitudes rechazadas para usuarios sin rol de organizador**
Verifica que un corredor no puede ver las solicitudes de equipo — solo los organizadores tienen ese acceso (error 403).

---

**6. Aprobación de solicitud de corredor**
Verifica que un organizador puede aprobar la solicitud de un corredor mediante POST `/team/requests/:userUuid/accept`. Comprueba que el estado del corredor cambia a `accepted`.

---

**7. Aprobación rechazada sin autenticación**
Verifica que aprobar solicitudes sin token JWT devuelve un error 401.

---

**8. Rechazo de solicitud de corredor**
Verifica que un organizador puede rechazar la solicitud de un corredor mediante POST `/team/requests/:userUuid/reject`. Comprueba que el estado del corredor cambia a `rejected`.

---

### 1.6 Gestión de rutas (trails)

**Archivo:** `backend/tests/trails.test.js`

---

**1. Creación de ruta con waypoints**
Verifica que un organizador puede crear una nueva ruta con sus waypoints. Comprueba que la ruta se crea con estado `isActive: false` (inactiva por defecto).

---

**2. Creación rechazada sin nombre**
Verifica que intentar crear una ruta sin proporcionar un nombre devuelve un error 400 con un mensaje que menciona "nombre".

---

**3. Creación rechazada sin waypoints**
Verifica que intentar crear una ruta sin waypoints devuelve un error 400 con un mensaje que menciona "waypoints".

---

**4. Creación rechazada sin autenticación**
Verifica que crear una ruta sin token JWT devuelve un error 401.

---

**5. Creación rechazada para corredores**
Verifica que un usuario con rol `runner` no puede crear rutas — solo organizadores y administradores (error 403).

---

**6. Ruta asignada al equipo del organizador**
Verifica que cuando un organizador crea una ruta, ésta queda asignada a su equipo (no es pública para todos los usuarios).

---

**7. Administrador crea rutas públicas**
Verifica que cuando el superusuario (admin) crea una ruta, ésta queda sin asignación de equipo, lo que la hace visible para todos los usuarios.

---

**8. Listado de rutas públicas para usuarios no autenticados**
Verifica que los usuarios no autenticados solo pueden ver las rutas públicas (sin equipo asignado), no las privadas de equipos.

---

**9. Corredores del equipo ven rutas privadas del equipo**
Verifica que un corredor con membresía aceptada en un equipo puede ver tanto las rutas públicas como las privadas de su equipo.

---

**10. Administrador ve todas las rutas**
Verifica que el superusuario puede ver todas las rutas existentes, tanto públicas como privadas de cualquier equipo.

---

**11. Detalles de ruta incluyen waypoints**
Verifica que GET `/trails/:trailId/details` devuelve la información completa de la ruta incluyendo la lista de sus waypoints.

---

**12. Waypoints incluyen coordenadas y radio**
Verifica que cada waypoint en los detalles de la ruta tiene latitud, longitud y radio de detección.

---

**13. Detalles de ruta inexistente devuelven 404**
Verifica que solicitar los detalles de una ruta con UUID que no existe devuelve un error 404.

---

**14. Actualización de nombre y distancia de ruta**
Verifica que el organizador puede actualizar el nombre y la distancia de una ruta existente mediante PUT `/trails/:trailId`. Comprueba que los cambios persisten.

---

**15. Edición rechazada para organizador distinto**
Verifica que un organizador no puede editar rutas que no creó él — solo el creador y el administrador pueden modificarla (error 403).

---

**16. Edición de ruta inexistente devuelve 404**
Verifica que intentar editar una ruta con UUID que no existe devuelve un error 404.

---

**17. Borrado en cascada de ruta y waypoints**
Verifica que al eliminar una ruta, sus waypoints también se eliminan automáticamente (cascada). Comprueba que la ruta ya no es accesible después del borrado.

---

**18. Borrado de ruta inexistente devuelve 404**
Verifica que intentar eliminar una ruta que no existe devuelve un error 404.

---

**19. Activación de ruta para competencia**
Verifica que un organizador puede activar una ruta mediante POST `/trails/:trailId/activate`. Comprueba que el campo `isActive` cambia a `true`.

---

**20. Activación rechazada para organizador distinto**
Verifica que solo el creador de la ruta (o el administrador) puede activarla — otros organizadores reciben un error 403.

---

---

## 2. Tests E2E de Frontend — Playwright

Tests end-to-end que simulan un usuario real interactuando con el navegador. Playwright levanta automáticamente el backend (con DB de test en `/tmp/appradar_e2e.db`) y el servidor de desarrollo Vite antes de correr los tests.

**Cómo correrlos:** `cd frontend && npm run test:e2e`

---

### 2.1 Autenticación

**Archivo:** `frontend/tests/auth.spec.ts`

---

**1. Login exitoso redirige al dashboard**
Abre la app en el navegador, completa el formulario de login con credenciales de administrador (`admin` / `1234`) y verifica que la URL cambia a `/` y que el link al perfil es visible en la barra de navegación.

---

**2. Credenciales incorrectas muestran mensaje de error**
Ingresa el usuario correcto pero una contraseña incorrecta. Verifica que aparece un mensaje que contiene "incorrecto" y que la URL permanece en `/login` (el usuario no es redirigido).

---

**3. Campo usuario vacío bloquea el envío del formulario**
Deja el campo de usuario vacío, completa la contraseña y toca el botón de login. Verifica que la validación HTML5 nativa del navegador bloquea el envío y la URL permanece en `/login`.

---

**4. Ruta protegida redirige a login sin sesión**
Navega directamente a la URL raíz `/` sin haber iniciado sesión. Verifica que la app detecta la falta de autenticación y redirige automáticamente a `/login`.

---

**5. Cerrar sesión limpia la sesión y redirige a login**
Hace login, luego hace clic en el botón "Salir". Verifica que la URL va a `/login`. Luego intenta navegar al dashboard y verifica que vuelve a redirigir a `/login`, confirmando que la sesión fue completamente eliminada.

---

### 2.2 Dashboard

**Archivo:** `frontend/tests/dashboard.spec.ts`

---

**1. Dashboard carga correctamente tras el login**
Hace login y verifica que el encabezado de saludo aparece en el dashboard. También comprueba que no hay ningún mensaje de error visible, lo que indica que la carga de datos fue exitosa.

---

**2. Filtros de carreras funcionan correctamente**
Crea una carrera de prueba vía API y recarga el dashboard. Hace clic en el filtro "En vivo" y verifica que la carrera inactiva desaparece. Vuelve al filtro "Todas" y comprueba que reaparece. Hace clic en "Mis carreras" y verifica que aparece (fue creada por el admin).

---

**3. Búsqueda por nombre filtra las carreras**
Crea una carrera con nombre único, recarga el dashboard y escribe ese nombre en el campo de búsqueda. Verifica que la carrera aparece. Luego escribe un texto que no coincide con nada y verifica que aparece el mensaje de "Sin resultados".

---

**4. Link "Nueva carrera" navega al formulario**
Hace clic en el botón "Nueva carrera" de la barra de navegación. Verifica que la URL cambia a `/races/new` y que el formulario de creación es visible.

---

### 2.3 Perfil de usuario

**Archivo:** `frontend/tests/profile.spec.ts`

---

**1. Tab de editar perfil muestra los datos del usuario**
Navega a `/profile` y verifica que el encabezado "Mi perfil" está visible, que el botón "Editar perfil" existe, y que el primer campo de texto (nombre) está pre-llenado con el nombre del usuario actual.

---

**2. Tab "Mis carreras" carga sin error cuando no hay historial**
Hace clic en la pestaña "Mis carreras". Verifica que no aparece ningún mensaje de error. Comprueba que o bien aparece el estado vacío o bien hay una tabla con datos, confirmando que la carga fue exitosa.

---

**3. Tab "Mis carreras" muestra carreras del usuario**
Crea una ruta y un run completado vía API, luego navega al perfil. Hace clic en "Mis carreras" y verifica que el nombre de la ruta aparece, que el badge "✓ Completó" es visible, y que no hay mensajes de error. Esta es la prueba de regresión para el bug reportado de historial no cargando.

---

**4. Guardar cambios en el perfil**
Modifica el nombre de usuario en el formulario de edición y hace clic en "Guardar cambios". Verifica que aparece el mensaje de confirmación "Perfil actualizado".

---

### 2.4 Gestión de carreras

**Archivo:** `frontend/tests/race.spec.ts`

---

**1. Formulario de crear carrera — validación con campos vacíos**
Navega a `/races/new` y hace clic en "Crear carrera" sin completar ningún campo. Verifica que la validación nativa del navegador bloquea el envío y la URL permanece en `/races/new`.

---

**2. Crear carrera con waypoints manuales**
Completa el formulario con nombre, descripción y coordenadas de dos waypoints (latitud y longitud). Hace clic en "Crear carrera" y verifica que la app redirige al dashboard y la nueva carrera aparece en la lista.

---

**3. Página de resultados muestra nombre y link de vivo**
Navega a la página de resultados de una ruta creada vía API. Verifica que el nombre de la ruta aparece como heading y que el link "Ver en vivo" está visible.

---

**4. Página de resultados muestra estado vacío sin corredores**
Navega a la página de resultados de una ruta sin ningún participante. Verifica que aparece el mensaje "Sin resultados todavía".

---

**5. Resultados muestran el ranking cuando hay un corredor completado**
Crea una ruta y un run completado vía API, navega a los resultados. Verifica que la tabla de ranking es visible, que el nombre del corredor aparece (admin), que no hay mensaje de error, y que el badge "✓ Completó" está presente. Esta es la prueba de regresión del bug de rankings que no cargaban.

---

**6. Botón Replay navega a la página de replay**
En la página de resultados, hace clic en el botón "▶ Replay". Verifica que la URL cambia al path `/races/:id/replay`.

---

**7. Vista en vivo carga el mapa Leaflet**
Navega a la vista en vivo de una ruta. Verifica que el contenedor del mapa Leaflet (`.leaflet-container`) es visible dentro de los primeros 10 segundos.

---

**8. Vista en vivo muestra links de resultados y eventos**
En la vista en vivo, verifica que los links de "Resultados" y "Eventos" son visibles en el header de la página.

---

**9. Navegación al perfil desde la navbar**
Desde la vista en vivo, hace clic en el primer link que contiene "admin" en la barra de navegación (el avatar del usuario). Verifica que la URL cambia a `/profile`.

---

**10. Editar carrera cambia el nombre en el dashboard**
Navega a `/races/:id/edit` para una ruta existente, limpia el campo de nombre y escribe uno nuevo. Hace clic en "Guardar cambios" y verifica que la app redirige al dashboard con el nuevo nombre visible.

---

---

## 3. Tests Unitarios Android — Kotlin

Tests que corren en la JVM sin necesidad de dispositivo ni emulador. Los tests de `LocationHelperTest` usan Robolectric para simular el entorno Android. Los del ViewModel usan MockK puro para evitar cargar el SDK completo (previene OOM).

**Cómo correrlos:** `./gradlew :app:test`

---

### 3.1 Entidad RaceRunEntity

**Archivo:** `app/src/test/java/com/appradar/data/local/entity/RaceRunEntityTest.kt`

---

**1. Run en progreso tiene flags en false**
Crea una entidad `RaceRunEntity` con valores por defecto y verifica que `isCompleted`, `isAbandoned` y `sos` son todos `false`. Comprueba el estado inicial correcto de una carrera recién creada.

---

**2. Run completado tiene isCompleted en true**
Crea una entidad con `isCompleted = true` y verifica que el flag queda en `true` y que `isAbandoned` permanece en `false`.

---

**3. Run abandonado tiene isAbandoned en true**
Crea una entidad con `isAbandoned = true` y verifica que el flag queda en `true` y que `isCompleted` permanece en `false`.

---

**4. Run con SOS tiene sos en true**
Crea una entidad con `sos = true` y verifica que el flag de emergencia queda correctamente en `true`.

---

**5. Run nuevo no está sincronizado**
Verifica que el valor por defecto de `isSynced` en una nueva entidad es `false`. Los runs nuevos siempre deben intentar sincronizarse con el backend.

---

**6. Método copy actualiza estado de sincronización**
Usa el método `copy()` de la data class para crear una copia con `isSynced = true` y un `sessionUuid` asignado. Verifica que los campos actualizados cambian y que el `runUuid` original permanece igual.

---

**7. Dos runs con el mismo UUID son iguales**
Verifica que dos instancias de `RaceRunEntity` con el mismo `runUuid` son consideradas iguales por el operador de igualdad de la data class.

---

**8. Dos runs con distinto UUID son distintos**
Verifica que dos instancias con `runUuid` diferentes no son iguales.

---

### 3.2 ViewModel de carrera activa

**Archivo:** `app/src/test/java/com/appradar/ui/viewmodel/ActiveTrailViewModelTest.kt`

El ViewModel se instancia directamente con mocks de `Context`, `RadarRepository` y `UserPreferences` usando MockK, sin necesidad de Robolectric.

---

**1. isRaceStarted inicia en false**
Verifica que justo después de crear el ViewModel, el flag `isRaceStarted` en el StateFlow es `false`. La carrera no debe estar iniciada hasta que el usuario la arranque.

---

**2. isPaused inicia en false**
Verifica que el flag de pausa `isPaused` es `false` al iniciar el ViewModel.

---

**3. isSos inicia en false**
Verifica que el flag de emergencia `isSos` es `false` al iniciar el ViewModel.

---

**4. elapsedTimeMillis inicia en cero**
Verifica que el tiempo transcurrido comienza en 0 milisegundos.

---

**5. reachedWaypoints inicia vacío**
Verifica que el conjunto de waypoints alcanzados es un Set vacío al inicio.

---

**6. teammatePositions inicia vacío**
Verifica que la lista de posiciones de compañeros de equipo está vacía al inicio.

---

**7. togglePause sin carrera no cambia el estado**
Llama a `togglePause()` antes de iniciar ninguna carrera. Verifica que `isPaused` sigue en `false` — el botón de pausa no debe tener efecto si no hay carrera activa.

---

**8. loadTrail carga los datos de la ruta**
Configura el mock del repositorio para que devuelva una ruta específica con UUID y nombre. Llama a `loadTrail()` y verifica que el StateFlow `trail` se actualiza con los datos correctos.

---

**9. onLocationUpdate ignorado si la carrera no está iniciada**
Envía una actualización de ubicación con un `Location` mockeado antes de iniciar la carrera. Verifica que el conjunto de waypoints alcanzados permanece vacío — las actualizaciones de GPS no deben procesarse hasta que la carrera esté en curso.

---

### 3.3 Helper de detección de ubicación

**Archivo:** `app/src/test/java/com/appradar/util/LocationHelperTest.kt`

Usa Robolectric para poder usar `android.location.Location` con su implementación real de `distanceTo()`.

---

**1. Mismas coordenadas siempre dentro del radio**
Crea una ubicación en las mismas coordenadas exactas que el waypoint. Verifica que `isWithinWaypointRadius()` devuelve `true` — distancia 0 siempre está dentro de cualquier radio.

---

**2. Ubicación a ~30m detectada en radio de 50m**
Desplaza la ubicación aproximadamente 0.0003 grados al norte (≈33m). Verifica que está dentro del radio por defecto de 50 metros.

---

**3. Ubicación a ~120m no detectada en radio de 50m**
Desplaza la ubicación 0.001 grados al norte (≈111m). Verifica que supera el radio de 50 metros y no es detectada.

---

**4. Radio personalizado de 10m detecta ubicación cercana**
Usa un radio pequeño de 10 metros. Verifica que una ubicación a aproximadamente 5 metros es detectada como dentro del radio.

---

**5. Radio personalizado de 10m rechaza ubicación lejana**
Con radio de 10 metros, verifica que una ubicación a aproximadamente 30 metros no es detectada.

---

**6. Radio grande de 200m acepta ubicaciones distantes**
Con radio de 200 metros, verifica que una ubicación a aproximadamente 111 metros (0.001 grados) sí es detectada.

---

**7. Desplazamiento en longitud también es detectado**
Desplaza la ubicación hacia el este (longitud) en lugar del norte. Verifica que el cálculo de distancia funciona correctamente en la dirección este-oeste.

---

**8. Distancia diagonal lejana queda fuera del radio**
Desplaza la ubicación en diagonal (norte-este simultáneamente). Verifica que la distancia resultante supera el radio de 50 metros y no es detectada.

---

### 3.4 Utilidades de notificación de ranking

**Archivo:** `app/src/test/java/com/appradar/util/RankingNotificationUtilsTest.kt`

Tests de la función `formatGapLine()` que genera el texto de diferencia entre corredores para las notificaciones del sistema. Es lógica pura sin dependencias de Android.

---

**1. Usuario adelante muestra "X WP adelante de"**
Llama a `formatGapLine` con el usuario adelante por 2 waypoints. Verifica que el texto resultante dice "↓ 2 WP adelante de Juan (#2)".

---

**2. Usuario atrás muestra "X WP detrás de"**
Llama a `formatGapLine` con el usuario atrás por 2 waypoints. Verifica que el texto dice "↑ 2 WP detrás de María (#1)".

---

**3. Un waypoint de diferencia formateado correctamente**
Verifica que una diferencia de exactamente 1 waypoint se muestra como "1 WP" (no "1 WPs" u otro formato).

---

**4. Mismo número de waypoints — diferencia en segundos**
Cuando ambos corredores tienen el mismo número de waypoints pero diferentes timestamps de llegada, verifica que se muestra la diferencia en tiempo. Para 45 segundos: "45s sobre Ana (#2)".

---

**5. Gap mayor a un minuto muestra minutos y segundos**
Para una diferencia de 2 minutos y 5 segundos, verifica que el formato es "2m 5s detrás de Luis (#1)".

---

**6. Exactamente un minuto formateado como "1m 0s"**
Verifica que una diferencia de exactamente 60 segundos se muestra como "1m 0s" y no como "60s".

---

**7. Timestamps cero fuerzan comparación por waypoints**
Cuando los timestamps de ambos corredores son 0 (dato no disponible), aunque tengan el mismo número de waypoints, verifica que el mensaje muestra "0 WP" en lugar de un tiempo. Edge case importante para datos incompletos.

---

### 3.5 Utilidades de tiempo

**Archivo:** `app/src/test/java/com/appradar/util/TimeUtilsTest.kt`

Tests de la función `formatElapsedTime()` que convierte milisegundos al formato `HH:MM:SS` para mostrar en la pantalla de carrera activa.

---

**1. Cero milisegundos produce "00:00:00"**
Verifica que 0 ms formatea correctamente como todos ceros.

---

**2. Un segundo produce "00:00:01"**
Verifica que 1000 ms formatea como 1 segundo.

---

**3. Un minuto produce "00:01:00"**
Verifica que 60,000 ms formatea como 1 minuto exacto.

---

**4. Una hora produce "01:00:00"**
Verifica que 3,600,000 ms formatea como 1 hora exacta.

---

**5. Hora, minuto y segundo combinados**
Verifica que 3,661,000 ms (1h 1m 1s) formatea como "01:01:01".

---

**6. Cinco horas y media**
Verifica que 19,800,000 ms (5h 30m) formatea como "05:30:00".

---

**7. 59 segundos no muestra "01:00" incorrecto**
Verifica que 59,000 ms formatea como "00:00:59" y no como "00:01:00", confirmando que el cálculo de minutos es correcto.

---

---

## 4. Tests de Integración Android — Maestro

Tests end-to-end que interactúan con la UI real de la app Android instalada en un dispositivo o emulador. Maestro automatiza gestos táctiles y verifica elementos visuales en pantalla. Requieren el backend corriendo y la app instalada.

**Cómo correrlos:** `maestro test tests/android/suites/smoke.yaml -e API_URL=http://10.0.2.2:3000/`

---

### 4.1 Subflow reutilizable: Login

**Archivo:** `tests/android/subflows/login.yaml`

No es un test independiente sino un bloque reutilizable que los demás flujos invocan. Escribe la URL del backend en el campo de API, el usuario `admin`, la contraseña `1234`, toca el botón de login y espera a que aparezca la pantalla de "Tus Carreras" para confirmar que el login fue exitoso. La URL del backend se parametriza con la variable de entorno `API_URL`.

---

### 4.2 Login exitoso

**Archivo:** `tests/android/flows/01_login.yaml`

Lanza la app y verifica que se muestra la pantalla de "AppRadar Trail". Ejecuta el subflow de login como admin. Verifica que el saludo con "¡Hola" y la lista "Tus Carreras" son visibles, confirmando que el usuario llegó correctamente al home.

---

### 4.3 Login con credenciales incorrectas

**Archivo:** `tests/android/flows/02_login_fallido.yaml`

Verifica dos escenarios de error en el login. Primero toca el botón de login sin rellenar ningún campo y comprueba que aparece "Complete todos los campos". Luego rellena correctamente la URL y el usuario pero ingresa una contraseña incorrecta, toca login y verifica que aparece "Credenciales incorrectas" y que la pantalla de "Tus Carreras" no es visible.

---

### 4.4 Navegación básica desde el home

**Archivo:** `tests/android/flows/03_home.yaml`

Hace login y desde la pantalla principal verifica: que el botón de sincronización está disponible, que navegar a "Historial" muestra la pantalla correspondiente, que navegar a "Configuración" muestra esa pantalla, y que el botón flotante de crear carrera es visible. Prueba el flujo básico de navegación sin iniciar ninguna carrera.

---

### 4.5 Pantalla de configuración y logout

**Archivo:** `tests/android/flows/04_settings.yaml`

Hace login y navega a la pantalla de Configuración. Verifica que aparecen las opciones de ícono de actividad (corredor, bicicleta, auto), selecciona el ícono de bicicleta y verifica que el botón de sincronización con el reloj WearOS está presente. Finalmente hace clic en "Cerrar Sesión" y verifica que la app vuelve a la pantalla de login.

---

### 4.6 Ciclo completo de una carrera

**Archivo:** `tests/android/flows/05_race_start_stop.yaml`

Flujo completo del ciclo de vida de una carrera en la app. Hace login, sincroniza para obtener rutas del servidor, verifica que hay al menos una ruta disponible, abre la primera ruta, inicia la carrera, verifica que aparecen los controles de carrera (pausar, SOS, terminar). Prueba el flujo de pausa y reanudación. Navega al ranking durante la carrera y vuelve. Finalmente termina la carrera y verifica el regreso a la pantalla principal.

---

### 4.7 Suite de smoke: todos los flujos

**Archivo:** `tests/android/suites/smoke.yaml`

Ejecuta todos los flujos de integración en secuencia: login exitoso, login fallido, home, configuración y carrera completa. Un único comando para validar el funcionamiento end-to-end de la app.

---

---

## 5. Tests E2E Legacy — Maestro

Flujos Maestro anteriores a la reestructuración de tests. Aún válidos para verificar flujos básicos.

---

### 5.1 Flujo móvil básico

**Archivo:** `tests/e2e/mobile_flow.yaml`

Lanza la app, hace login como admin y verifica que aparece el saludo. Navega a la vista en vivo de una carrera y verifica que el mapa y el ranking son visibles. Regresa al home, abre configuración y hace logout. Verifica el retorno a la pantalla de login.

---

### 5.2 Flujo de la app WearOS

**Archivo:** `tests/e2e/wear_flow.yaml`

Tests para la app de reloj inteligente (`com.appradar.wear`). Lanza la app del reloj y verifica la pantalla de selección de carrera. Selecciona una carrera de prueba, inicia el cronómetro y verifica que comienza a contar. Prueba el gesto de deslizamiento y el flujo de abandonar carrera con su diálogo de confirmación.
