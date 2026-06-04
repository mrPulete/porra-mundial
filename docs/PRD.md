# PRD — Porra Mundial 2026

## 1. Visión del producto

App web para organizar **porras** (quinielas / pools) del Mundial 2026.
Los usuarios predicen resultados de partidos y preguntas bonus, compiten en ligas privadas y consultan rankings en tiempo real.

**Audiencia**: grupos de amigos, compañeros de trabajo, comunidades online.

---

## 2. Glosario

| Término | Definición |
|---------|-----------|
| Porra | Quiniela / pool de predicciones |
| Liga | Grupo privado de jugadores con código de invitación y reglas de puntuación propias |
| Predicción | Pronóstico de resultado (goles local/visitante) de un partido |
| Bonus | Preguntas extra (campeón, goleador, mejor jugador…) |
| Bracket | Cuadro de eliminatorias (de R32 a Final) |
| Lock time | Momento límite para enviar/editar una predicción (30 min antes del kickoff) |

---

## 3. Estructura del torneo

- **48 equipos** en **12 grupos** (A–L) de 4 equipos
- Fase de grupos: 3 jornadas por grupo → **72 partidos**
- **Clasificación**: 1º y 2º de cada grupo + 8 mejores terceros → 32 equipos
- Eliminatorias: R32 (16 partidos) → R16 (8) → QF (4) → SF (2) → 3er puesto (1) → Final (1)
- **Total**: ~104 partidos (codes 1–104)

### Reglas de clasificación grupal

Se aplica el orden de desempate **oficial FIFA 2026** (implementado en `sortTiedTeams` de `tournament-tree.ts`):

1. Puntos (Victoria = 3, Empate = 1, Derrota = 0)
2. **Entre los equipos empatados a puntos** (mini-liga head-to-head): puntos, diferencia de goles y goles a favor en los enfrentamientos directos
3. Diferencia de goles en todos los partidos del grupo
4. Goles a favor en todos los partidos del grupo
5. Fair play y ranking FIFA (criterios de reserva)

> Nota: el head-to-head entre empatados se evalúa **antes** que la diferencia de goles global, conforme al reglamento FIFA. Fair play y ranking FIFA están reservados como desempate final.

### Bracket — Emparejamientos R32

Definidos en `tournament-tree.ts`: 1A vs 2B, 1C vs 3rd, etc.

- Los cruces de eliminatoria siguen el bracket oficial FIFA 2026 (verificado en `tests/unit/bracket-wiring.test.ts`).
- **Mejores terceros**: clasifican los **8 mejores** (no 9º-12º). La asignación de cada tercero a su cruce de R32 usa la tabla oficial FIFA (`data/third-place-combinations.json`, Anexo C del reglamento) cuando está disponible; en su defecto se calcula un emparejamiento válido que respeta las whitelists FIFA por slot (sin huecos ni terceros no clasificados).

---

## 4. Sistema de predicciones

### 4.1 Predicciones de partidos

Cada usuario predice por liga:
- **Fase de grupos**: goles local, goles visitante → se calcula outcome (1/X/2)
- **Eliminatorias**: goles local, goles visitante + equipo clasificado (ganador)
- **Final**: igual que eliminatorias (el campeón predicho)

### 4.2 Preguntas bonus (7)

| # | Pregunta | Opciones |
|---|----------|----------|
| 1 | Campeón | 48 selecciones |
| 2 | Subcampeón | 48 selecciones |
| 3 | Máximo goleador | Lista de ~20 jugadores |
| 4 | Mejor jugador | Lista de ~20 jugadores |
| 5 | Mejor portero | Lista de ~20 jugadores |
| 6 | Mejor jugador joven | Lista de ~20 jugadores |
| 7 | Fair Play | 48 selecciones |

**Deadline**: inicio del torneo (configurable por pregunta).

---

## 5. Sistema de puntuación

### 5.1 Reglas por partido (fase de grupos)

| Regla | Puntos | Descripción |
|-------|--------|-------------|
| EXACT_SCORE | 5 | Acierta resultado exacto (ej: 2-1) |
| OUTCOME_1X2 | 3 | Acierta ganador o empate (sin exacto) |
| SINGLE_TEAM_GOALS | 1 | Acierta goles de un equipo (home O away) |

### 5.2 Reglas por partido (eliminatorias)

| Regla | Puntos | Descripción |
|-------|--------|-------------|
| EXACT_SCORE | 6–10 | Escala por ronda. Valor por defecto: R32=6, R16=6, QF=7, SF=8, F=10 |
| QUALIFIED_TEAM | 2–8 | Acierta equipo clasificado. Valor por defecto: R32=2, R16=3, QF=4, SF=5, F=8 |

### 5.3 Multiplicador 1X2 por ronda (StageScoring, default)
| Ronda | Multiplicador |
|-------|--------------|
| GROUP | 1 |
| ROUND_OF_32 | 2 |
| ROUND_OF_16 | 3 |
| QUARTER_FINAL | 4 |
| SEMI_FINAL | 5 |
| THIRD_PLACE | 4 |
| FINAL | 6 |

### 5.4 Bonus

| Pregunta | Puntos |
|----------|--------|
| Campeón | 15 |
| Subcampeón | 8 |
| Máximo goleador | 10 |
| Mejor jugador | 8 |
| Mejor portero | 6 |
| Mejor joven | 6 |
| Fair Play | 5 |

### 5.5 Penalizaciones

| Acción | Puntos |
|--------|--------|
| Editar predicción de partido | -1 |
| Editar predicción de eliminatorias (tras inicio torneo) | -1 |
| Editar campeón / bracket (tras inicio torneo) | -5 |

### 5.6 Configuración por liga

Cada liga puede personalizar:
- Puntos por regla y ronda (`ScoringRule`)
- Puntos bonus (`BonusRule`)
- Penalizaciones (`PenaltyRule`)
- Multiplicadores 1X2 (`StageScoring`)

### 5.7 Reglas de scoring existentes en schema

Además de las reglas base, el schema contempla:

- `CHAMPION_PREDICTION`: regla explícita para acierto de campeón (default 15 en final).
- `ROUND_NO_CHANGES_BONUS`: tipo reservado en enum para bonus por ronda sin cambios (no activado en la configuración default de esta rama).

---

## 6. Política de edición de predicciones

| Momento | Grupos | Eliminatorias | Bonus |
|---------|--------|---------------|-------|
| Antes del torneo | ✅ libre | ✅ libre | ✅ libre |
| Torneo iniciado, antes de lock | ✅ (penalización si es edit) | ✅ con penalización | ✅ con penalización |
| Después de lock del partido | ❌ bloqueado | ❌ bloqueado | ❌ bloqueado |

**Lock time** = 30 minutos antes del kickoff de cada partido.

---

## 7. Ligas

- Cualquier usuario puede **crear** una liga (se convierte en OWNER)
- Código de invitación de 8 caracteres (alfanumérico, uppercase)
- Otros usuarios se unen con el código
- Roles: OWNER (gestiona reglas) y MEMBER
- Las predicciones son **por liga** (un usuario puede tener predicciones distintas en ligas distintas)
- Rankings son por liga + global

---

## 8. Rankings

- **Por liga**: suma de puntos de predicciones + bonus - penalizaciones dentro de esa liga
- **Global**: agregado de todas las ligas del usuario
- Métricas: totalPoints, rankPosition, accuracy, exactHits
- Recálculo automático al introducir resultados (admin)

---

## 9. Roles y permisos

| Acción | USER | ADMIN |
|--------|------|-------|
| Registrarse | ✅ | — |
| Crear/unirse a liga | ✅ | ✅ |
| Enviar predicciones | ✅ | ✅ |
| Ver rankings | ✅ | ✅ |
| Introducir resultados | ❌ | ✅ |
| Gestionar scoring | ❌ | ✅ (o OWNER de liga) |
| Importar Excel | ❌ | ✅ |
| Demo tools | ❌ | ✅ |
| Gestionar usuarios | ❌ | ✅ |

---

## 10. Autenticación

- **Proveedor**: Credentials (email + contraseña)
- **Hashing**: bcrypt
- **Sesiones**: JWT
- **Validación**: Zod (email válido, contraseña min 6 chars)
- **Registro**: abierto (cualquiera puede registrarse)
- **Reset password**: UI presente (`/reset-password`), pero el endpoint backend no está implementado en esta rama.

---

## 11. Emails

**Proveedor**: Resend

| Email | Trigger | Contenido |
|-------|---------|-----------|
| Welcome | Tras registro | Bienvenida + instrucciones |
| Reminder | Antes de jornada | Recordatorio de predicciones pendientes |
| Ranking summary | Periódico | Resumen de posición y puntos |

Estado actual:

- Existen templates en `emails/` y helper `sendEmail` en `lib/email.ts`.
- No hay triggers automáticos ni scheduler/cron implementado en esta rama.

---

## 12. Admin

### Estado actual (mayo 2026)

- Panel admin operativo con endpoints activos para resultados, recálculo, bloqueo por ronda y demo.
- Gestión de usuarios de liga:
	- borrar usuario de liga (con limpieza de datos de porra de esa liga)
	- reset por usuario (sin borrar usuario de liga)
	- reset global de resultados/predicciones de jugadores en liga (sin borrar miembros)
- Restricción de seguridad en resets: solo se permiten con porra desbloqueada.
- Auditoría de cambios y penalizaciones disponible por liga.

### Bracket y KO (estado actual)

- Cruces de 32/16/cuartos/semis/final calculados dinámicamente a partir de grupos y terceros.
- Reordenar terceros impacta cruces en tiempo real.
- Etiquetas de cruce legibles para explicar procedencia de equipos.
- En empates de KO, el clasificado seleccionado se usa para propagar ganadores a rondas siguientes.

### Demo tools (solo dev):
- Generar usuarios fake
- Generar ligas demo
- Generar predicciones para todos los usuarios
- Simular jornadas / rondas / torneo completo
- Resetear torneo
