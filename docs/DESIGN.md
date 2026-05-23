# Diseño — Porra Mundial 2026

## Principios

- **Mobile first**: todas las vistas se diseñan primero para móvil, luego desktop
- **Identidad deportiva**: estética de competición, colores vibrantes, tipografía bold
- **Dark mode**: soporte completo con toggle en nav
- **Accesibilidad**: contraste suficiente, labels en formularios, navegación por teclado

---

## Tipografía

| Uso | Fuente | Pesos |
|-----|--------|-------|
| Headings (h1, h2, h3) | **Barlow Condensed** | 600, 700, 800 |
| Body / UI | **Sora** | 400–700 |

CSS variables: `--font-barlow`, `--font-sora`

Headings llevan `letter-spacing: 0.02em`.

---

## Paleta de colores

### Light mode
| Token | Valor | Uso |
|-------|-------|-----|
| `--background` | `#ffffff` | Fondo principal |
| `--foreground` | `#0f172a` | Texto principal (slate-900) |
| `--card` | `#ffffffd1` | Fondo de cards (semitransparente) |
| Body gradient | `radial-gradient(circle at top, #d1fae5 0%, #f0fdf4 42%, #ffffff 100%)` | Fondo verde esmeralda suave |

### Dark mode
| Token | Valor | Uso |
|-------|-------|-----|
| `--background` | `#020617` | Fondo principal (slate-950) |
| `--foreground` | `#e2e8f0` | Texto principal (slate-200) |
| `--card` | `#0f172acc` | Fondo de cards (semitransparente) |
| Body gradient | `radial-gradient(circle at top, #0f172a 0%, #0a0a0a 35%, #020617 100%)` | Fondo oscuro con brillo sutil |

### Colores funcionales (Tailwind)

Paleta de acentos usada actualmente:

- Éxito / CTA primaria: `emerald-600` (hover `emerald-700`, dark `emerald-400/300`).
- Warning / atención: `amber-600` (fondos `amber-50` y `amber-500/10` en dark).
- Error / acción destructiva: `red-600` (fondos `red-50` y `red-500/10` en dark).
- Texto secundario y bordes suaves: escala `neutral-400` a `neutral-700`.

Estados de predicción (UI actual):

- Acertado/guardado: acentos `emerald` + icono de check.
- Pendiente de completar: mensajes de atención con acento `amber`.
- Acciones destructivas o de limpieza: acento `red`.

---

## Layout

### Estructura general
```
┌─────────────────────────────┐
│         NavBar              │  ← Fixed top, blur backdrop
├─────────────────────────────┤
│                             │
│        Contenido            │  ← min-h-screen, padding top para nav
│                             │
└─────────────────────────────┘
```

- NavBar visible solo para usuarios autenticados
- NavBar incluye: logo, navegación, selector de liga, toggle dark mode, avatar/logout
- Sin sidebar en móvil — navegación por tabs/links en NavBar

### Páginas

| Ruta | Descripción | Layout |
|------|-------------|--------|
| `/` | Home — links a ligas, resumen | Hero + cards |
| `/login` | Login form | AuthCard centrado |
| `/register` | Registro form | AuthCard centrado |
| `/reset-password` | Reset password | AuthCard centrado |
| `/predictions` | Board de predicciones por jornada | Tabla/grid de partidos |
| `/bracket` | Bracket interactivo | Árbol horizontal scrollable |
| `/matches` | Partidos con resultados (read-only) | Tabla agrupada por fase |
| `/rankings` | Tabla de rankings | Tabla con posición, usuario, puntos |
| `/leagues` | Gestión de ligas (crear, unirse, ver) | Cards + formularios |
| `/admin` | Panel de admin (tabs) | Tabs: resultados, scoring, historial, demo |

---

## Componentes clave

### NavBar (`nav-bar-v2.tsx`)

- Desktop (`md+`): navegación horizontal con links de secciones y acceso condicional a Admin.
- Mobile (`<md`): botón hamburguesa (`Menu`/`X`) que despliega panel vertical con navegación completa.
- Liga activa: selector visible para usuarios autenticados en desktop y mobile.
- Acciones de sesión: perfil/logout en desktop (`details`) y botón de salir dentro del menú mobile.
- Tema: toggle dark/light siempre visible en la barra superior.

### AuthCard
- Card centrada vertical/horizontal
- Formulario con campos validados (Zod + react-hook-form)
- Toggle login ↔ register

### Predictions Board
- Agrupado por jornada/ronda
- Cada fila: banderas + nombre equipos + inputs goles + selector clasificado (en knockout)
- Estado: editable / bloqueado / con resultado
- Colores según acierto: exacto (verde), outcome (amarillo), fallo (rojo/gris)

### Bracket Board
- Visualización de árbol de eliminatorias
- Scrollable horizontal en móvil
- Banderas + nombres de equipos
- Conexiones visuales entre rondas
- Predicción inline en cada nodo

### Rankings Table
- Columnas: posición, nombre, puntos, exactos, accuracy
- Filtrable por liga (selector de liga en nav)
- Indicador de subida/bajada de posición: pendiente de implementación

### Admin Console
- Tabs: Resultados | Scoring | Historial | Demo
- Results Input Panel: lista de partidos, inputs de goles, botón guardar
- Scoring config: editar puntos por regla

---

## Iconografía

- **Lucide React** como librería de iconos
- Banderas de países como emoji (flagEmoji en DB)

---

## Animaciones / UX

Estado actual:

- No hay sistema global de toasts implementado.
- No hay skeleton loaders transversales; se usan estados locales de carga (ej. botones deshabilitados con "Procesando...").
- No hay page transitions globales definidas.

Dirección recomendada (pendiente):

- Añadir toasts para éxito/error en acciones de API.
- Definir patrón único de carga (skeleton para listas/tablas, spinner para acciones puntuales).
- Incorporar transiciones suaves entre tabs/páginas sin bloquear interacción.

---

## Responsive breakpoints

Tailwind v4 defaults:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

**Mobile**: stack vertical, cards full-width, nav hamburguesa
**Tablet**: grid 2 columnas para partidos
**Desktop**: grid 3+ columnas, bracket completo visible

---

## Estados de UI

Estado actual:

- Existen empty states puntuales en componentes (ej. listas sin datos en admin y secciones de predicciones/bonus).
- Existen estados de carga locales en formularios y botones.
- No existe un patrón global de error boundary para toda la app.

Pendiente de producto/UI:

- Estandarizar empty states reutilizables por módulo.
- Definir componente de loading consistente por tipo de vista.
- Implementar error boundaries por ruta y fallback global.
