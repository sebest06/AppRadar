# Estándares de Código

## Principios generales

### Legibilidad primero
- El código lo leen personas. Optimizar para eso.
- Nombres de variables, funciones y clases que describan **qué hacen**, no cómo.
- Evitar abreviaturas crípticas: `userRepository` > `usrRepo` > `ur`.

### Funciones cortas
- Máximo ~20-30 líneas por función.
- Una función = una responsabilidad (Single Responsibility Principle).
- Si necesitás un comentario para explicar qué hace un bloque, ese bloque debería ser una función.

### Sin duplicación
- DRY: Don't Repeat Yourself.
- Si algo se repite 2 veces, evaluar extraerlo. A la tercera, extraer siempre.

### Sin magic numbers/strings
```python
# ✗
if status == 3:
    ...

# ✓
MAX_RETRIES = 3
if retry_count == MAX_RETRIES:
    ...
```

---

## Paradigmas a aplicar según contexto

### Orientación a Objetos (OOP)
Aplicar cuando hay entidades con estado y comportamiento relacionado.
- Encapsular estado interno.
- Preferir composición sobre herencia.
- Respetar SOLID (especialmente S y O).

### MVC / Separación de capas
Aplicar en aplicaciones web o con UI:
- **Model**: lógica de negocio y datos.
- **View**: presentación solamente, sin lógica.
- **Controller**: coordinación, sin lógica de negocio.

### Functional patterns
Aplicar para transformaciones de datos:
- Preferir funciones puras cuando sea posible.
- Evitar mutación de estado innecesaria.
- Usar `map`, `filter`, `reduce` en vez de loops imperativos cuando sea más claro.

---

## Estructura de proyecto recomendada

```
proyecto/
├── src/
│   ├── models/        # entidades y lógica de negocio
│   ├── controllers/   # coordinación
│   ├── services/      # lógica de aplicación / integraciones
│   ├── utils/         # helpers reutilizables
│   └── config/        # configuración centralizada
├── tests/
│   ├── unit/
│   └── integration/
├── docs/
├── CLAUDE.md
├── memory.md
├── backlog.md
└── .gitignore
```

---

## Code review mental antes de entregar código

- [ ] ¿Se entiende sin leer comentarios?
- [ ] ¿Cada función hace una sola cosa?
- [ ] ¿Hay lógica duplicada?
- [ ] ¿Hay magic numbers o strings?
- [ ] ¿Hay alguna clave o secret expuesto?
- [ ] ¿El manejo de errores es explícito?
- [ ] ¿Los nombres son descriptivos?
