"use client";

import { useRef, useState } from "react";

export function PredictionTemplateUploader({
  leagueId,
  onSuccess,
  onError,
}: {
  leagueId: string;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [format, setFormat] = useState<"csv" | "tsv">("csv");

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(
        `/api/predictions/template-download?leagueId=${leagueId}&format=${format}`
      );

      if (!response.ok) {
        const data = await response.json();
        onError?.(data.error || "Error descargando plantilla");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        format === "csv"
          ? `mis-pronosticos-${new Date().toISOString().split("T")[0]}.csv`
          : `mis-pronosticos-${new Date().toISOString().split("T")[0]}.tsv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onSuccess?.("Plantilla descargada con tus predicciones actuales");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error descargando";
      onError?.(message);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("leagueId", leagueId);
      formData.append("format", format);

      const response = await fetch("/api/predictions/template-upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        onError?.(data.error || "Error subiendo plantilla");
        return;
      }

      onSuccess?.(data.message || `✓ ${data.processedCount} predicciones cargadas`);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Reload page after success
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error procesando archivo";
      onError?.(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-4 dark:border-emerald-400/20 dark:bg-emerald-500/10">
      <h3 className="text-sm font-bold">📋 Gestor de Plantillas de Predicciones</h3>

      <div className="space-y-2 text-xs text-neutral-700 dark:text-neutral-300">
        <p>
          Descarga una plantilla con tus predicciones actuales, edítala en Excel o cualquier editor de
          texto, y cárgala aquí para actualizar todas de una vez.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold">Formato:</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as "csv" | "tsv")}
            className="rounded-lg border border-black/20 bg-white px-2 py-1 text-xs dark:border-white/20 dark:bg-neutral-900"
          >
            <option value="csv">CSV</option>
            <option value="tsv">TSV (Excel)</option>
          </select>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          📥 Descargar plantilla
        </button>

        <button
          onClick={openFilePicker}
          disabled={uploading}
          className="rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-400 dark:text-emerald-300 dark:hover:bg-emerald-950"
        >
          📤 Cargar plantilla
        </button>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold">Cargar archivo completado:</label>
        <input
          ref={fileInputRef}
          type="file"
          accept={format === "csv" ? ".csv" : ".tsv,.txt"}
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
        {uploading && (
          <p className="mt-1 text-xs text-neutral-500">Procesando archivo...</p>
        )}
      </div>
    </div>
  );
}
