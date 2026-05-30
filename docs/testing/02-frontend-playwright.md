# Tests E2E de Frontend — Playwright

Tests end-to-end que simulan un usuario real interactuando con el navegador. Playwright levanta automáticamente el backend (con DB de test en `/tmp/appradar_e2e.db`) y el servidor de desarrollo Vite antes de correr los tests.

**Cómo correrlos:** `cd frontend && npm run test:e2e`

**Total:** 57+ tests en 9 archivos

---

## 2.1 Autenticación

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

## 2.2 Dashboard

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

## 2.3 Perfil de usuario

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

## 2.4 Gestión de carreras

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

## 2.5 Simulación de carrera completa

**Archivo:** `frontend/tests/race-simulation.spec.ts`

Setup: registra un organizador con equipo, dos corredores (Ana y Bruno), los acepta, crea una carrera con 10 waypoints. Todo vía API en `beforeAll`.

---

**1. Dos corredores completan la carrera y el primero aparece como ganador**
Crea los runs de ambos corredores, abre la vista en vivo como organizador y verifica que el mapa Leaflet carga. Luego simula GPS: en un loop de 10 waypoints, sube la posición GPS y el track de Ana (llegando primero), espera 1 segundo, luego sube los de Bruno. Al terminar el loop, verifica que ambos nombres aparecen en el panel de la vista en vivo. Marca a Ana como completada y navega a Resultados: verifica que la fila de Ana contiene "✓ Completó".

---

## 2.6 Estadísticas post-carrera

**Archivo:** `frontend/tests/results-stats.spec.ts`

Setup: crea trail con 2 waypoints, run completado, tracks con 30 minutos de diferencia entre waypoints (para que haya velocidad calculable) y posiciones GPS. Todo vía API en `beforeAll`.

---

**1. La fila expandida muestra distancia y velocidad media del corredor**
Navega a la página de resultados, expande la fila del corredor haciendo clic en la primera celda, y verifica que la fila expandida contiene "km", "media" y "km/h".

---

**2. La fila expandida muestra la velocidad máxima del corredor**
Misma navegación que el test anterior. Verifica que la fila expandida contiene "máx".

---

**3. La fila expandida muestra el botón de descarga GPX**
Expande la fila del corredor y verifica que aparece un link con el texto "Descargar GPX".

---

**4. El endpoint GPX devuelve un archivo GPX válido**
Llama directamente a `GET /races/:id/gpx/:userUuid?sessionUuid=` vía `request` de Playwright. Verifica que la respuesta tiene status 200, `content-type: application/gpx+xml`, y que el body contiene las etiquetas `<gpx>`, `<trkpt>` y `</gpx>`.

---

**5. El endpoint GPX devuelve 404 si la sesión no existe**
Llama al endpoint GPX con un `sessionUuid` inventado (UUID de ceros). Verifica que la respuesta es 404.

---

**6. El botón Compartir copia la URL al portapapeles y muestra confirmación**
Otorga permisos de clipboard al contexto del navegador, navega a resultados y hace clic en el botón "Compartir". Verifica que aparece el texto "Link copiado" en la página y que el contenido del portapapeles contiene el path `/races/:id/results`.

---

**7. La página de resultados es accesible sin iniciar sesión**
Abre un contexto de navegador completamente nuevo (sin cookies ni localStorage). Navega directamente a `/races/:id/results`. Verifica que la tabla de resultados es visible y que la URL no redirige a `/login`.

---

## 2.7 Heatmap de posiciones

**Archivo:** `frontend/tests/heatmap.spec.ts`

Setup: registra 50 corredores en el equipo del admin, crea una ruta con 40 waypoints (1 km entre cada uno, ~40 km total). Simula que los 50 corredores completan la carrera en paralelo, subiendo 40 posiciones GPS y 40 tracks por corredor (2000 puntos GPS en total). Todo vía API en `beforeAll` con timeout de 5 minutos.

---

**1. El botón Heatmap activa la capa de calor en el mapa**
Navega a la vista en vivo como organizador. Verifica que el botón "🔥 Heatmap" está visible y en estado inactivo (fondo blanco). Intercepta la respuesta al endpoint `/heatmap`. Hace clic en el botón y verifica: el endpoint devuelve exactamente 2000 puntos GPS, el botón cambia a estado activo (naranja), y aparece el elemento `canvas.leaflet-heatmap-layer` dentro del mapa.

---

**2. El heatmap se desactiva al hacer clic nuevamente**
Activa el heatmap y verifica que el canvas aparece. Hace clic nuevamente en el botón y verifica que el botón vuelve al estado inactivo y el canvas desaparece del DOM.

---

**3. El endpoint de heatmap devuelve los 2000 puntos GPS sin autenticación**
Llama directamente a `GET /races/:id/heatmap` sin header de autorización. Verifica que la respuesta es 200, contiene exactamente 2000 elementos, y que cada punto es un array `[lat, lon]` de dos números.

---

**4. El endpoint de heatmap filtrado por sesión devuelve solo los puntos de esa sesión**
Llama a `/heatmap` sin filtro y verifica 2000 puntos. Luego llama con un `sessionUuid` inexistente (UUID de ceros) y verifica que devuelve 200 con array vacío.

---

## 2.8 Panel del Organizador

**Archivo:** `frontend/tests/organizer-panel.spec.ts`

Setup: crea organizador con equipo, 4 corredores con distintos estados (completó, SOS, abandonó, en carrera) y 1 corredor sin rol de organizer. Crea trail y runs para cada corredor. Todo vía API en `beforeAll`.

---

**1. El organizador ve el panel con la lista de corredores**
Hace login como organizador, navega a `/races/:id/organizer`. Verifica que el heading "Panel del Organizador" es visible y que la tabla tiene exactamente 4 filas.

---

**2. Muestra el badge "Completó" para el corredor que terminó**
Verifica que el texto "Completó" aparece en la tabla del panel.

---

**3. Muestra el badge "SOS activo" para el corredor en emergencia**
Verifica que el texto "SOS activo" aparece en la tabla.

---

**4. Muestra el badge "Abandonó" para el corredor que abandonó**
Verifica que el texto "Abandonó" aparece en la tabla.

---

**5. Muestra el badge "En carrera" para el corredor activo**
Verifica que el texto "En carrera" aparece en la tabla.

---

**6. Un corredor ve el mensaje de acceso denegado**
Hace login como corredor y navega al panel. Verifica que aparece "solo los organizadores" y que no redirige a `/login`.

---

**7. El organizador puede enviar un mensaje individual a un corredor**
Hace clic en el primer botón "💬 Mensaje", completa el diálogo y envía. Verifica que aparece el toast "Mensaje enviado ✓".

---

**8. El organizador puede enviar un mensaje a todos los corredores**
Hace clic en "📢 Mensaje a todos", completa y envía. Verifica que aparece el toast "Mensaje enviado a todos ✓".

---

**9. El botón Enviar está desactivado con el campo vacío**
Abre el diálogo de broadcast y verifica que el botón "Enviar" tiene el atributo `disabled` cuando el campo está vacío.

---

**10. Cancelar el diálogo cierra sin enviar**
Abre el diálogo, hace clic en "Cancelar" y verifica que el diálogo desaparece y no aparece ningún toast.

---

**11. POST /messages acepta mensajes del organizador (backend directo)**
Llama directamente al endpoint con el token del organizador y verifica status 200 y `ok: true`.

---

**12. GET /messages devuelve los mensajes broadcast enviados (backend directo)**
El corredor llama a `/messages?trailUuid=&since=0` y verifica que el mensaje broadcast enviado en el test 8 aparece en la respuesta.

---

**13. El link "Panel" es visible en la barra de LiveRace para el organizador**
Navega a la vista en vivo como organizador y verifica que el link "📋 Panel" es visible en el header.

---

**14. El link "Panel" lleva al organizador al panel correcto**
Hace clic en el link "Panel" y verifica que la URL cambia a `/races/:id/organizer` y el heading es visible.

---

**15. El link "Panel" NO es visible en LiveRace para un corredor normal**
Navega a la vista en vivo como corredor y verifica que el link "📋 Panel" está oculto.

---

## 2.9 Recepción de mensajes en LiveRace

**Archivo:** `frontend/tests/live-race-messages.spec.ts`

Setup: crea organizador con equipo, 2 corredores y un trail. Todo vía API en `beforeAll`.

---

**1. Aparece notificación de mensaje broadcast al cargar LiveRace**
Envía un mensaje broadcast vía API. El corredor navega a LiveRace. El poll inmediato al montar recupera el mensaje y muestra una notificación azul flotante en la esquina inferior izquierda.

---

**2. Aparece notificación de mensaje individual al cargar LiveRace**
Envía un mensaje con `recipientUuid` del corredor. Verifica que la notificación aparece al cargar la página.

---

**3. La notificación muestra el nombre del organizador como remitente**
Verifica que el banner de notificación incluye el `nombre` del organizador (no solo el mensaje).

---

**4. NO aparece notificación de mensaje dirigido a otro corredor**
Envía un mensaje a runner2. Runner1 navega a LiveRace, espera que el poll termine y verifica que el mensaje no es visible.

---

**5. Detecta un mensaje nuevo enviado durante la sesión (polling 20s)**
Intercepta el primer poll con `page.route` para devolver vacío (simulando que el mensaje llega después). Instala el reloj falso con `page.clock.install()`. Envía el mensaje vía API. Avanza 21 segundos con `page.clock.fastForward()`. Verifica que la notificación aparece.

---

**6. La notificación se auto-descarta tras 10 segundos**
Instala el reloj falso. El corredor navega a LiveRace y la notificación aparece desde el mount. Avanza 11 segundos. Verifica que la notificación ya no es visible.

---

**7. El mensaje enviado desde el OrganizerPanel llega al corredor en LiveRace (integración)**
El organizador abre el OrganizerPanel, hace clic en "📢 Mensaje a todos", escribe y envía. Luego llama a `GET /messages` como runner1 y verifica que el mensaje aparece con el `senderName` correcto.

---

**8. El endpoint GET /messages filtra correctamente (backend directo)**
Envía tres mensajes: uno broadcast, uno para runner1, uno para runner2. Llama a `GET /messages` como runner1 y verifica que ve el broadcast y el suyo, pero no el de runner2.
