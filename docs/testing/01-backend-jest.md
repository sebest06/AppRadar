# Tests de Backend — Jest

Tests unitarios/integración del servidor Node.js. Corren con una base de datos SQLite en memoria, sin servidores externos. Cada archivo de test crea su propia app y DB aislada.

**Cómo correrlos:** `cd backend && npm test`

**Total:** 94 tests en 6 archivos

---

## 1.1 Autenticación de usuarios

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

## 1.2 Posiciones GPS

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

## 1.3 Perfil de usuario

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

## 1.4 Ciclo de vida de una carrera

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

## 1.5 Gestión de equipos

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

## 1.6 Gestión de rutas (trails)

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
