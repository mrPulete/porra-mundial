"use client";

import { useRef, useState } from "react";

export function TemplateUploader({
  onUploadSuccess,
  onError,
}: {
  onUploadSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [format, setFormat] = useState<"csv" | "tsv">("csv");

  const handleDownloadTemplate = async (includeResults: boolean = false) => {
    try {
      const response = await fetch(
        `/api/templates/download?format=${format}&includeResults=${includeResults}`
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
          ? `plantilla-resultados-${new Date().toISOString().split("T")[0]}.csv`
          : `plantilla-resultados-${new Date().toISOString().split("T")[0]}.tsv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onUploadSuccess?.(
        includeResults
          ? "Plantilla con resultados descargada"
          : "Plantilla vacía descargada"
      );
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
      formData.append("format", format);

      const response = await fetch("/api/templates/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        onError?.(data.error || "Error subiendo plantilla");
        return;
      }

      const message = `✓ ${data.processedCount} resultados cargados${
        data.errors?.length > 0 ? ` (${data.errors.length} errores)` : ""
      }`;
      onUploadSuccess?.(message);

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
    <div className="space-y-4">
      <div className="rounded-xl border border-black/10 bg-white/50 p-4 dark:border-white/10 dark:bg-neutral-800/30">
        <h3 className="text-sm font-black uppercase tracking-wider">Descargar Plantilla</h3>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
          Descarga la plantilla para rellenarla con los resultados oficiales
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold">Formato:</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as "csv" | "tsv")}
              className="rounded-lg border border-black/20 px-2 py-1 text-xs dark:border-white/20 dark:bg-neutral-900"
            >
              <option value="csv">CSV</option>
              <option value="tsv">TSV</option>
            </select>
          </div>

          <button
            onClick={() => handleDownloadTemplate(false)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
          >
            📥 Plantilla vacía
          </button>

          <button
            onClick={() => handleDownloadTemplate(true)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
          >
            📥 Plantilla con resultados
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-white/50 p-4 dark:border-white/10 dark:bg-neutral-800/30">
        <h3 className="text-sm font-black uppercase tracking-wider">Cargar Plantilla Completada</h3>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
          Sube el archivo {format.toUpperCase()} completado con los resultados
        </p>

        <div className="mt-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={format === "csv" ? ".csv" : ".tsv,.txt"}
            onChange={handleFileChange}
            disabled={uploading}
            className="text-xs"
          />
        </div>

        {uploading && (
          <p className="mt-2 text-xs text-neutral-500">Procesando archivo...</p>
        )}
      </div>
    </div>
  );
}
