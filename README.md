# Porra Mundial

Aplicacion de porra para Mundial con Next.js, Auth.js, Prisma y PostgreSQL.

## Stack

- Next.js App Router + TypeScript
- TailwindCSS (mobile first + dark mode)
- Auth.js (credentials) + bcrypt + Zod
- Prisma + PostgreSQL (Supabase compatible)
- Resend para correos transaccionales

## Modulos incluidos

- Registro y login por credenciales
- Pantalla de recuperacion de password (flujo backend pendiente)
- Bracket interactivo para rondas KO
- Ranking global y por ligas
- Panel admin base (resultados, scoring, historial, templates, demo)
- Plantillas de email (welcome, reminder, ranking summary)

## Setup local

1. Instala dependencias:

```bash
npm install
```

2. Configura variables de entorno:

```bash
cp .env.example .env
```

3. Crea la base de datos y cliente Prisma:

```bash
npm run prisma:migrate
npm run prisma:generate
```

4. Levanta el proyecto:

```bash
npm run dev
```

## Estado de API (mayo 2026)

- La estructura de carpetas existe en `app/api/`, pero en esta rama no hay handlers (`route.ts`) implementados.
- Los componentes cliente ya hacen `fetch` a rutas previstas (`/api/register`, `/api/predictions`, `/api/admin/*`, etc.), por lo que esas integraciones quedan pendientes hasta implementar los handlers.

## Testing automatizado

1. Instala navegadores de Playwright (una sola vez):

```bash
npm run e2e:install
```

2. Ejecuta tests unitarios + integracion (Vitest):

```bash
npm run test
```

3. Ejecuta cobertura:

```bash
npm run test:coverage
```

4. Ejecuta E2E (Playwright):

```bash
npm run e2e
```

5. Ejecuta todo junto:

```bash
npm run test:all
```

## Simulacion de torneo y carga masiva

- Seed Prisma estandar:

```bash
npm run prisma:seed
```

- Simulacion realista multi-liga/multi-usuario:

```bash
npm run simulate:tournament
```

- Parametros opcionales:

```bash
npm run simulate:tournament -- --users=30 --leagues=5 --memberships=2
```

## Deploy recomendado

- Frontend/API: Vercel
- DB: Supabase PostgreSQL
- ORM: Prisma
- Email: Resend
