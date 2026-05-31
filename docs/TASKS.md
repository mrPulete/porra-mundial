# Tasks — Porra Mundial 2026

## Leyenda

- ✅ Implementado y funcional
- 🔧 Implementado parcialmente / requiere cierre
- ❌ No implementado

Snapshot actualizado: mayo 2026.

---

## Core

| Feature | Estado | Notas |
|---------|--------|-------|
| Schema Prisma completo | ✅ | Modelos de usuarios, ligas, predicciones, ranking, reglas |
| Seed torneo | ✅ | `prisma/seed.ts` |
| Fixture mundial 2026 | ✅ | `data/world-cup-2026.json` |

## Auth

| Feature | Estado | Notas |
|---------|--------|-------|
| Login (credentials) | ✅ | NextAuth + Prisma Adapter |
| Protección de rutas | ✅ | `auth()` server-side |
| Roles USER/ADMIN | ✅ | Persistidos y propagados a sesión |
| Registro | 🔧 | Flujo UI disponible; revisar endpoint dedicado por entorno |
| Reset password | ❌ | UI existe, backend pendiente |

## Predicciones y bonus

| Feature | Estado | Notas |
|---------|--------|-------|
| Guardado de predicciones | ✅ | `api/predictions` |
| Guardado de bonus | ✅ | `api/bonus-answers` |
| Clasificado KO en empate | ✅ | Persistencia + uso en árbol KO |
| Penalización por cambios | ✅ | Historial + penalización aplicable |
| Board unificado | ✅ | Grupos, terceros, KO, preguntas |
| Plantillas import/export | 🔧 | UX lista; revisar endpoints finales de templates |

## Bracket

| Feature | Estado | Notas |
|---------|--------|-------|
| Árbol KO dinámico | ✅ | `lib/tournament-tree.ts` |
| Reordenación de terceros impacta cruces | ✅ | Sincronizado en board |
| Labels explicativos de cruce | ✅ | `1° Grupo X vs N° mejor tercero` |
| Selector de clasificado en empate | ✅ | Dinámico según equipos resueltos |

## Ranking y scoring

| Feature | Estado | Notas |
|---------|--------|-------|
| Motor de scoring | ✅ | `lib/scoring-engine.ts` |
| Reglas por ronda | ✅ | `ScoringRule` + `StageScoring` |
| Recálculo admin | ✅ | `api/admin/recalculate` |
| Configuración por liga | 🔧 | UI completa; validar endpoint final de scoring |

## Admin

| Feature | Estado | Notas |
|---------|--------|-------|
| Carga de resultados oficiales | ✅ | `api/admin/results` |
| Bloqueo/desbloqueo por ronda | ✅ | `api/admin/lock-round` |
| Historial de cambios | ✅ | Auditoría por liga |
| Demo tools | ✅ | `api/admin/demo` |
| Borrar usuario de liga | ✅ | `api/admin/users/delete` |
| Reset por usuario (sin borrar usuario) | ✅ | `api/admin/users/reset` |
| Reset global de resultados de jugadores | ✅ | `api/admin/users/reset-results` |
| Reset completo de porra | ✅ | `api/admin/reset-porra` |

## UI/UX

| Feature | Estado | Notas |
|---------|--------|-------|
| Dark mode | ✅ | Soporte completo |
| Modal detalle de país | ✅ | Apertura inline desde links de equipo |
| Error boundaries global/ruta | ✅ | `app/global-error.tsx`, `app/error.tsx` |
| Responsive | 🔧 | Revisar algunos detalles finos en móvil |
| Toasts globales | ❌ | Pendiente |

## Testing

| Feature | Estado | Notas |
|---------|--------|-------|
| Unit/integration (Vitest) | ✅ | Suites activas |
| E2E (Playwright) | ✅ | Flujo predictions/admin |
| Cobertura mínima obligatoria | ❌ | Pendiente definir umbral CI |

## Deploy

| Feature | Estado | Notas |
|---------|--------|-------|
| Build Docker remoto | ✅ | Workflow en push a `main` (`docker.yml`) |
| Publicación GHCR | ✅ | Build & push automatizado |
| Despliegue objetivo Debian | ✅ | Compatible con flujo de imagen remota |

---

## Próximos focos recomendados

1. Completar backend de registro/reset password.
2. Cerrar endpoints pendientes de templates/scoring final.
3. Añadir toasts globales y pulido de UX móvil.
4. Definir gates de calidad en CI (coverage thresholds).
