# Tasks — Porra Mundial 2026

## Leyenda

- ✅ Implementado y funcional
- 🔧 Implementado parcialmente / necesita revisión
- ❌ No implementado

Nota de contexto (mayo 2026): en esta rama, `app/api/` contiene la estructura de carpetas pero no hay handlers (`route.ts`).

---

## Core

| Feature | Estado | Notas |
|---------|--------|-------|
| Schema Prisma completo | ✅ | 15 modelos, 7 enums, migraciones al día |
| Seed datos torneo (equipos + partidos) | ✅ | `prisma/seed.ts` + script `npm run prisma:seed` |
| Datos fixture (world-cup-2026.json) | ✅ | 48 equipos, ~104 partidos, sedes |

## Auth

| Feature | Estado | Notas |
|---------|--------|-------|
| Login (email + password) | ✅ | NextAuth Credentials |
| Registro | 🔧 | UI lista; endpoint `/api/register` pendiente en esta rama |
| Protección de rutas (server-side) | ✅ | `auth()` en pages |
| Roles (USER / ADMIN) | ✅ | En JWT + session |
| Reset password | ❌ | Pantalla existe, pero endpoint `/api/reset-password` no implementado |
| Email de verificación | ❌ | Modelo `VerificationToken` existe pero sin flujo de emisión/validación |

## Predicciones

| Feature | Estado | Notas |
|---------|--------|-------|
| Enviar predicción de partido | 🔧 | UI y payload listos; endpoint `/api/predictions` pendiente |
| Editar predicción (con penalización) | 🔧 | Lógica/modelos listos; persistencia API pendiente |
| Lock automático (30 min antes) | 🔧 | Política implementada en `lib/`, enforcement API pendiente |
| Predicción de clasificado (knockout) | 🔧 | UI lista; persistencia API pendiente |
| Preguntas bonus (7) | 🔧 | Datos y UI listos; endpoint `/api/bonus-answers` pendiente |
| Upload template CSV/TSV | 🔧 | Componente implementado; endpoint pendiente |
| Download template | 🔧 | Componente implementado; endpoint pendiente |
| Board unificado (grupos + knockout) | ✅ | `unified-predictions-board.tsx` |

## Bracket

| Feature | Estado | Notas |
|---------|--------|-------|
| Árbol del torneo (emparejamientos) | ✅ | `tournament-tree.ts` |
| Visualización bracket | ✅ | `bracket-board.tsx` |
| Predicción inline en bracket | 🔧 | Verificar UX móvil |
| Clasificación dinámica terceros | ✅ | Lógica en tournament-tree |

## Scoring

| Feature | Estado | Notas |
|---------|--------|-------|
| Motor de puntuación | ✅ | `scoring-engine.ts` |
| Reglas por ronda (escalado) | ✅ | ScoringRule + StageScoring |
| Bonus scoring | ✅ | BonusRule |
| Penalizaciones | ✅ | PenaltyRule + PredictionHistory |
| Configuración por liga | 🔧 | Admin UI lista; persistencia API pendiente |
| Recálculo automático | 🔧 | Lógica disponible; ejecución vía endpoint pendiente |

## Rankings

| Feature | Estado | Notas |
|---------|--------|-------|
| Ranking por liga | ✅ | |
| Ranking global | ✅ | Scope GLOBAL |
| Tabla de rankings (UI) | ✅ | `rankings-table.tsx` |
| Accuracy tracking | ✅ | |
| Indicador subida/bajada posición | ❌ | Sin implementar |

## Ligas

| Feature | Estado | Notas |
|---------|--------|-------|
| Crear liga | 🔧 | UI lista; endpoint `/api/leagues` pendiente |
| Unirse con código | 🔧 | UI lista; endpoint `/api/leagues/join` pendiente |
| Selector de liga activa | ✅ | Cookie-based |
| UI gestión de ligas | ✅ | `leagues-manager.tsx` |
| Configurar scoring por liga | 🔧 | Admin UI lista; endpoint pendiente |
| Abandonar liga | ❌ | Sin implementar |
| Eliminar liga | ❌ | Sin implementar |

## Admin

| Feature | Estado | Notas |
|---------|--------|-------|
| Introducir resultados | 🔧 | Panel UI listo; endpoint pendiente |
| Importar Excel | 🔧 | Flujo UI listo; endpoint pendiente |
| Recalcular puntuaciones | 🔧 | Acción UI lista; endpoint pendiente |
| Config scoring UI | 🔧 | UI lista; endpoint pendiente |
| Historial de cambios | ✅ | Últimos 120 por liga |
| Demo tools | 🔧 | UI de acciones lista; endpoint pendiente |
| Gestión de usuarios (CRUD) | ❌ | Sin panel de gestión |

## Emails

| Feature | Estado | Notas |
|---------|--------|-------|
| Resend configurado | ✅ | `lib/email.ts` |
| Template welcome | ✅ | Archivo presente en `emails/welcome.ts` |
| Template reminder | ✅ | Archivo presente en `emails/reminder.ts` |
| Template ranking summary | ✅ | Archivo presente en `emails/ranking-summary.ts` |
| Triggers automáticos de envío | ❌ | Sin orquestación activa en esta rama |
| Cron / scheduler para envíos | ❌ | Sin implementar |

## UI/UX

| Feature | Estado | Notas |
|---------|--------|-------|
| Dark mode | ✅ | CSS variables + toggle |
| Responsive mobile | 🔧 | Revisar bracket en móvil |
| Fuentes (Barlow + Sora) | ✅ | |
| NavBar con liga selector | ✅ | `nav-bar-v2.tsx` |
| Loading states / skeletons | ❌ | Sin implementar |
| Toasts / notificaciones | ❌ | Sin implementar |
| Empty states | ❌ | Sin implementar |
| Error boundaries | ❌ | Sin implementar |
| PWA / offline | ❌ | Sin implementar |

## Testing

| Feature | Estado | Notas |
|---------|--------|-------|
| Unit tests (scoring) | ✅ | `scoring-engine.test.ts` |
| Integration tests (scoring + ranking) | ✅ | `scoring-ranking.integration.test.ts` |
| Integration tests (demo system) | ✅ | `demo-system.integration.test.ts` |
| Simulation test (multi-league) | ✅ | `tournament-simulation.test.ts` |
| E2E (predictions + admin) | ✅ | `predictions-admin.spec.ts` |
| Coverage mínimo definido | ❌ | Sin umbral |

## Deploy

| Feature | Estado | Notas |
|---------|--------|-------|
| Build sin errores | ✅ | `npm run build` exit 0 |
| Vercel config | 🔧 | Verificar |
| Supabase PostgreSQL | 🔧 | Verificar conexión prod |
| CI/CD pipeline | ❌ | Sin configurar |
| Dominio custom | ❌ | Sin configurar |

---

## Prioridades sugeridas (próximos pasos)

1. **Reset password** — completar flujo (envío email + verificación token)
2. **Loading states + error boundaries** — UX básica
3. **Toasts/notificaciones** — feedback al usuario tras acciones
4. **Empty states** — cuando no hay predicciones, ligas, etc.
5. **Responsive audit** — bracket en móvil, tables overflow
6. **Cron emails** — reminder antes de jornadas, ranking weekly
7. **Indicador ranking** — subida/bajada de posición
8. **CI pipeline** — tests en PR
