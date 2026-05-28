# Formato de Backlog

El archivo `backlog.md` vive en la raíz del proyecto y se actualiza en cada sesión.

## Estructura

```markdown
# Backlog — [Nombre del Proyecto]

## En progreso
- [ ] Descripción de la tarea — asignado a: X

## Pendiente
- [ ] Tarea pendiente

## Completado
- [x] 2024-01-15 — Descripción de lo que se hizo
- [x] 2024-01-14 — Otro cambio realizado

## Bugs conocidos
- [ ] Descripción del bug — prioridad: alta/media/baja

## Decisiones tomadas
- 2024-01-15 — Se decidió usar PostgreSQL en lugar de MySQL porque...
```

## Reglas

1. **Todo cambio de código** se registra en "Completado" con fecha.
2. Las tareas nuevas van en "Pendiente" hasta que se arranquen.
3. Cuando se arranca una tarea, pasa a "En progreso".
4. Las decisiones arquitectónicas siempre se documentan con el razonamiento.
5. El backlog nunca se borra — es el historial del proyecto.
