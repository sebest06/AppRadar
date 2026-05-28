# Tests E2E de Frontend — Playwright

Tests end-to-end que simulan un usuario real interactuando con el navegador. Playwright levanta automáticamente el backend (con DB de test en `/tmp/appradar_e2e.db`) y el servidor de desarrollo Vite antes de correr los tests.

**Cómo correrlos:** `cd frontend && npm run test:e2e`

**Total:** 24 tests en 4 archivos

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
