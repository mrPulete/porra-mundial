# Styles

Carpeta reservada para estilos compartidos y extensiones de tema.

Estado actual:

- La mayor parte de estilos vive en `app/globals.css` y clases Tailwind en componentes.
- Esta carpeta se mantiene para introducir módulos CSS reutilizables si se requiere.

Convención recomendada:

- Tokens globales y variables: en `app/globals.css`.
- Estilos específicos de módulo/pantalla: junto al componente.
- Evitar duplicar utilidades ya cubiertas por Tailwind.
