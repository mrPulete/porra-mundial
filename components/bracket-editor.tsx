"use client";

import { useMemo, useState } from "react";
import type { TournamentMatchLike } from "@/lib/tournament-tree";
import { BracketBoard } from "@/components/bracket-board";

type ScoreMap = Record<string, { home: string; away: string }>;
type QualifierMap = Record<string, string>;

function isKnockoutStage(stage: string) {
  return stage !== "GROUP";
}

export function BracketEditor({
  matches,
  initialScores,
  initialQualifiers,
  readOnly = false,
}: {
  matches: TournamentMatchLike[];
  initialScores: ScoreMap;
  initialQualifiers: QualifierMap;
  readOnly?: boolean;
}) {
  const [scores, setScores] = useState<ScoreMap>(initialScores);
  const [qualifiers, setQualifiers] = useState<QualifierMap>(initialQualifiers);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const matchesById = useMemo(() => new Map(matches.map((match) => [match.id, match])), [matches]);

  const handleSave = async () => {
    if (readOnly) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const payload = {
        mode: "official" as const,
        predictions: Object.entries(scores)
          .filter(([matchId, score]) => {
            if (score.home === "" || score.away === "") {
              return false;
            }

            const match = matchesById.get(matchId);
            return Boolean(match && isKnockoutStage(match.stage));
          })
          .map(([matchId, score]) => {
            const match = matchesById.get(matchId);
            const isDraw = score.home === score.away;
            const predictedQualifiedTeamId =
              match && isKnockoutStage(match.stage) && isDraw ? qualifiers[matchId] || null : null;

            return {
              matchId,
              homeScore: Number(score.home),
              awayScore: Number(score.away),
              predictedQualifiedTeamId,
            };
          }),
      };

      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error || "No se pudieron guardar los cruces");
      }

      setMessage("✅ Cruces guardados correctamente");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error de red al guardar cruces");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <BracketBoard
        matches={matches}
        liveScores={scores}
        liveQualifiers={qualifiers}
        onLiveScoresChange={setScores}
        onLiveQualifiersChange={setQualifiers}
      />

      {!readOnly && (
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar cruces"}
        </button>
      )}

      {message && (
        <p className={`text-xs font-semibold ${message.includes("✅") ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
