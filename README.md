# Porra Mundial

Aplicacion web de porra para el Mundial 2026 con ligas privadas, predicciones de partidos, preguntas bonus, ranking por liga/global y panel de administracion.

## Stack

- Next.js App Router + TypeScript
- React 19 + TailwindCSS v4
- NextAuth (credentials) + Prisma Adapter
- Prisma + PostgreSQL
- Resend (emails)
- Vitest + Playwright

## Funcionalidades principales

- Autenticacion por credenciales y gestion de sesion.
- Predicciones de fase de grupos y eliminatorias (incluye clasificado en empate).
- Ranking dinamico por liga y ranking global.
- Bracket con cruces dinamicos segun clasificacion de grupos y orden de terceros.
- Panel admin para resultados oficiales, scoring, recalc, bloqueo por ronda y auditoria.
- Herramientas admin de mantenimiento:
	- Reset por usuario (sin borrar usuario de liga).
	- Reset de resultados de jugadores de una liga (sin borrar miembros).
	- Borrado de usuario de liga.
	- Reset completo de porra (solo admin global).
- Modal de detalle de pais al pulsar equipo en pantallas de board.

## API implementada

Rutas activas en `app/api`:

- `api/auth/[...nextauth]`
- `api/predictions`
- `api/bonus-answers`
- `api/admin/results`
- `api/admin/recalculate`
- `api/admin/lock-round`
- `api/admin/demo`
- `api/admin/reset-porra`
- `api/admin/users/delete`
- `api/admin/users/reset`
- `api/admin/users/reset-results`
- `api/teams/[teamCode]/football-data`

Nota: hay pantallas de auth adicionales (registro/reset password) cuyo backend puede estar incompleto segun entorno.

## Setup local

1. Instalar dependencias

```bash
npm install
```

2. Configurar variables de entorno

```bash
cp .env.example .env
```

3. Migrar y generar Prisma

```bash
npm run prisma:migrate
npm run prisma:generate
```

4. Seed inicial (opcional)

```bash
npm run prisma:seed
```

5. Levantar entorno de desarrollo

```bash
npm run dev
```

## Testing

```bash
npm run test
npm run test:coverage
npm run e2e
npm run test:all
```

Instalacion inicial de navegadores E2E:

```bash
npm run e2e:install
```

## Simulacion

```bash
npm run simulate:tournament
```

Con parametros:

```bash
npm run simulate:tournament -- --users=30 --leagues=5 --memberships=2
```

## Deploy y contenedor

- Workflow remoto de build/push Docker en push a `main`: `.github/workflows/docker.yml`.
- Publicacion en GHCR (`ghcr.io/<owner>/<repo>`).
- Despliegue objetivo recomendado: Debian + Docker Compose.
