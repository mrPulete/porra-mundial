"use client";

import { useState } from "react";
import { Download, Upload } from "lucide-react";

export function BackupRestore({ leagueId, onSuccess }: { leagueId: string; onSuccess: (msg: string) => void }) {
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const downloadBackup = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/admin/backup?leagueId=${encodeURIComponent(leagueId)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onSuccess(data.error || "Error descargando backup");
        return;
      }

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `porra-backup-${leagueId}-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onSuccess("Backup descargado exitosamente");
    } catch (error) {
      onSuccess("Error descargando backup");
    } finally {
      setDownloading(false);
    }
  };

  const uploadBackup = async (file: File) => {
    setUploading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const res = await fetch("/api/admin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId, backup: data }),
      });

      const result = await res.json().catch(() => ({}));
      onSuccess(res.ok ? result.message || "Backup restaurado exitosamente" : result.error || "Error restaurando backup");

      if (res.ok) {
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      onSuccess("Error procesando archivo de backup");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={downloadBackup}
          disabled={downloading || uploading}
          className="flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {downloading ? "Descargando..." : "Descargar backup"}
        </button>

        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          <Upload className="h-4 w-4" />
          <span>{uploading ? "Cargando..." : "Cargar backup"}</span>
          <input
            type="file"
            accept=".json"
            disabled={uploading || downloading}
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) uploadBackup(file);
              e.currentTarget.value = "";
            }}
            className="hidden"
          />
        </label>
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        El backup incluye todos los resultados oficiales y predicciones de los jugadores de esta liga.
      </p>
    </div>
  );
}
