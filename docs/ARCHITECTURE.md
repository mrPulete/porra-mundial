# Arquitectura — Porra Mundial 2026

## Stack

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.6 |
| Runtime | React | 19.2.4 |
| Lenguaje | TypeScript | ^5 |
| Base de datos | PostgreSQL | — |
| ORM | Prisma | ^6.16.2 |
| Auth | NextAuth (v4) + Prisma Adapter | 4.24.14 |
| Estilos | TailwindCSS v4 | ^4 |
| Componentes | shadcn/ui (manual) | — |
| Formularios | React Hook Form + Zod | 7.x / 4.x |
| Email | Resend | ^6.12.3 |
| Iconos | Lucide React | ^1.14.0 |
| Excel | xlsx (SheetJS) | ^0.18.5 |
| Fechas | date-fns | ^4.1.0 |
| Test unitario | Vitest | ^4.1.6 |
| Test E2E | Playwright | ^1.60.0 |
| Deploy | Vercel + Supabase (PostgreSQL) | — |

## Estructura de carpetas

```
app/                          → Rutas (App Router)
  layout.tsx                  → Layout global (fonts, nav, session)
  page.tsx                    → Home
  login/page.tsx              → Login
  register/page.tsx           → Registro
  reset-password/page.tsx     → Reset password
  predictions/page.tsx        → Board de predicciones
  bracket/page.tsx            → Bracket interactivo
  matches/page.tsx            → Partidos (read-only results)
  rankings/page.tsx           → Tabla de rankings
  leagues/page.tsx            → Gestión de ligas
  admin/page.tsx              → Panel de admin
  api/                        → Scaffold de endpoints (directorios sin route handlers en esta rama)
    auth/[...nextauth]/       → NextAuth (pendiente de handler)
    register/                 → Registro (pendiente de handler)
    reset-password/           → Reset (pendiente de handler)
    predictions/              → Predicciones (pendiente de handler)
      template-download/      → Descarga template (pendiente)
      template-upload/        → Upload template (pendiente)
    bonus-answers/            → Bonus (pendiente de handler)
    leagues/                  → Crear liga (pendiente de handler)
      join/                   → Unirse (pendiente de handler)
    admin/
      results/                → Resultados (pendiente de handler)
      import-excel/           → Importar Excel (pendiente de handler)
      recalculate/            → Recalcular (pendiente de handler)
      scoring/                → Config scoring (pendiente de handler)
      demo/                   → Demo tools (pendiente de handler)
    seed/                     → Seed datos (pendiente de handler)
    templates/                → Templates admin (pendiente de handlers)

components/                   → Componentes React
  nav-bar-v2.tsx              → Navegación principal
  bracket-board.tsx           → Bracket visual
  predictions-board.tsx       → Board de predicciones (legacy)
  unified-predictions-board.tsx → Board unificado
  rankings-table.tsx          → Tabla rankings
  leagues-manager.tsx         → UI ligas
  league-selector.tsx         → Selector de liga activa
  auth-card.tsx               → Card de auth (login/register)
  session-provider.tsx        → SessionProvider wrapper
  admin/
    admin-console.tsx         → Consola admin (tabs)
    results-input-panel.tsx   → Panel entrada resultados

lib/                          → Lógica de negocio
  auth.ts                     → Config NextAuth
  prisma.ts                   → Singleton Prisma Client
  scoring-engine.ts           → Motor de puntuación principal
  scoring.ts                  → Helpers de scoring
  scoring-config.ts           → Config de scoring por defecto
  scoring-settings.ts         → Lectura de scoring-settings.json
  stage-scoring.ts            → Multiplicadores por ronda
  bracket.ts                  → Lógica de bracket
  tournament-tree.ts          → Árbol del torneo (emparejamientos)
  prediction-edit-policy.ts   → Políticas de edición
  world-cup-data.ts           → Lectura world-cup-2026.json
  match-board-data.ts         → Datos para boards de partidos
  match-venues.ts             → Sedes y estadios
  league-admin.ts             → CRUD ligas
  active-league.ts            → Liga activa (cookie)
  excel-import.ts             → Importar Excel
  generate-template.ts        → Generar templates CSV/TSV
  default-bonus-questions.ts  → Preguntas bonus por defecto
  email.ts                    → Envío de emails (Resend)

prisma/
  schema.prisma               → Esquema DB (15 modelos, 7 enums)
  seed.ts                     → Seed inicial
  migrations/                 → Migraciones

data/
  world-cup-2026.json         → Fixture completo del torneo
  scoring-settings.json       → Valores de scoring extra

types/
  index.ts                    → Tipos compartidos
  next-auth.d.ts              → Extensión tipos NextAuth

emails/                       → Templates de email
tests/                        → Tests (unit, integration, e2e, simulation)
scripts/                      → Scripts CLI
```

## Flujo de datos

```
Usuario → Page (Server Component) → lee session + DB
  → Client Component
     ↳ flujo objetivo: llama API Route (POST)
     ↳ estado actual: handlers pendientes en app/api
  → Prisma → PostgreSQL
```

### Predicciones
1. Usuario abre `/predictions` → server lee partidos + predicciones del usuario por liga activa.
2. La UI cliente dispara `fetch` a `/api/predictions` y `/api/bonus-answers`.
3. En esta rama, esos route handlers no están implementados en `app/api`, por lo que el flujo de persistencia vía API queda pendiente.
4. La lógica de scoring/ranking sí existe en `lib/` y DB schema, lista para conectarse al backend de rutas.

### Liga activa
- Cookie `activeLeagueId` determina qué liga ve el usuario
- Se resuelve en `layout.tsx` (server-side) y se pasa a NavBar
- El selector de liga cambia la cookie → recarga la página

## Base de datos

### Modelos principales (15)
User, Team, Match, MatchPrediction, BonusQuestion, BonusAnswer, Ranking, League, LeagueMember, ScoringRule, BonusRule, PenaltyRule, StageScoring, PredictionHistory, Account/Session/VerificationToken

### Enums (7)
UserRole, LeagueRole, MatchStage, RankingScope, ScoringRuleType, PredictionChangeType, PenaltyTarget

### Índices clave
- `Match(stage, roundOrder)` — consultas por ronda
- `PredictionHistory(leagueId, createdAt)` — historial por liga
- `PredictionHistory(userId, createdAt)` — historial por usuario
- Unique constraints en predicciones, rankings, miembros de liga

## Convenciones del proyecto

- **Server Components** por defecto, `"use client"` solo cuando necesario
- **API Routes**: convención objetivo con Route Handlers (`export async function POST()`), pendientes de implementación en esta rama
- **Validación** con Zod en boundaries (API routes, forms)
- **Auth check** con `auth()` en server o `getServerSession()` en API
- **Prisma**: singleton en `lib/prisma.ts`, imports siempre desde ahí
- **xlsx**: usar `import * as XLSX from "xlsx"` (namespace import, no default)
- **Fechas**: date-fns para formateo, UTC en DB
- **Ranking upsert**: usar findFirst + update/create (no upsert con nullable composite key)

## Variables de entorno requeridas

```env
DATABASE_URL=               # PostgreSQL connection string (Supabase)
NEXTAUTH_SECRET=            # Secret para JWT
NEXTAUTH_URL=               # URL base de la app
RESEND_API_KEY=             # API key de Resend para emails
EMAIL_FROM=                 # Remitente para emails transaccionales
```

## Scripts disponibles

```bash
npm run dev                  # Dev server (Turbopack)
npm run build                # Production build
npm run test                 # Vitest unit/integration
npm run e2e                  # Playwright E2E
npm run simulate:tournament  # Simular torneo completo
npm run prisma:seed          # Seed DB con datos del Mundial
npm run prisma:studio        # Prisma Studio (UI de DB)
npm run prisma:migrate       # Correr migraciones
```
