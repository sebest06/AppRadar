---
name: project-standards
description: >
  Estándares y comportamiento base para todos los proyectos del equipo.
  Activar SIEMPRE al inicio de cualquier sesión de trabajo en un proyecto:
  cuando el usuario abre un proyecto nuevo, reanuda una sesión, pide escribir
  código, hace una pregunta técnica, o menciona tareas de desarrollo.
  Cubre: comunicación directa, seguridad, documentación, metodología de trabajo,
  backlog, memoria de sesión y estándares de código.
---

# Project Standards

## 1. Comunicación

- Respuestas directas y concisas. Sin adulaciones ni relleno.
- Si algo no está claro **preguntar antes de proceder**. Una pregunta por vez.
- No asumir contexto que no fue dado explícitamente.

## 2. Inicio de sesión

Al iniciar una sesión en un proyecto:

1. Leer `CLAUDE.md` si existe. Si no existe, crearlo.
2. Leer `memory.md` si existe para recuperar contexto anterior.
3. Leer `backlog.md` si existe para ver el estado actual.
4. **Preguntar la metodología de trabajo** (ver sección 7) si no está ya definida en `CLAUDE.md`.

## 3. Seguridad

- **Nunca compartir** claves, tokens, passwords, secrets, ni credenciales de ningún tipo.
- Si se detecta alguna clave o secret expuesto en el código o en mensajes: avisar inmediatamente y sugerir solución (variables de entorno, `.env`, secret managers).
- Verificar que `.gitignore` incluya archivos sensibles (`.env`, `*.key`, `*.pem`, etc.).
- Ver detalles extendidos: `docs/security.md`

## 4. Gestión de documentación (CLAUDE.md)

- Mantener `CLAUDE.md` actualizado con el contexto del proyecto.
- Si alguna sección supera 150 caracteres de contenido relevante, extraerla a `docs/`.
- Estructura de `docs/`: archivos con nombres descriptivos (`arquitectura.md`, `decisiones.md`, `dependencias.md`, etc.).
- Ver template en: `docs/claude-template.md`

## 5. Backlog

- Existe un archivo `backlog.md` en la raíz del proyecto.
- **Registrar todos los cambios realizados** con fecha y descripción breve.
- Registrar también tareas pendientes, bugs conocidos y decisiones importantes.
- Ver formato en: `docs/backlog-format.md`

## 6. Memoria de sesión

- Existe un archivo `memory.md` en la raíz del proyecto.
- Al finalizar cada sesión (o cuando el usuario lo indique), actualizar `memory.md` con:
  - Estado actual del trabajo
  - Decisiones tomadas en la sesión
  - Próximos pasos
  - Contexto necesario para retomar sin fricción

## 7. Metodología de trabajo

Preguntar al inicio de cada proyecto (si no está en `CLAUDE.md`):

```
¿Cómo trabajamos en este proyecto?
  A) TDD - escribimos tests primero, luego implementación
  B) Sin tests - iteración rápida sin cobertura de tests
  C) Tests post-implementación - código primero, tests después
  D) Mixto - TDD para lógica crítica, sin tests para el resto
```

Registrar la decisión en `CLAUDE.md`.

## 8. Estándares de código

Ver detalles completos en: `docs/coding-standards.md`

Resumen ejecutivo:
- **Reusabilidad**: extraer lógica repetida, preferir composición.
- **Legibilidad**: código que se entiende sin comentarios. Nombres descriptivos.
- **Funciones cortas**: máximo ~20-30 líneas. Si es más larga, dividir.
- **Paradigmas**: aplicar OOP, MVC, separación de responsabilidades según el contexto.
- **Estándares altos**: sin code smells, sin magic numbers, sin lógica duplicada.
