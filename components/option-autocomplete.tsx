"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";

export default function OptionAutocomplete({
  options,
  value,
  onChange,
  placeholder = "Buscar...",
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      opt.value.toLowerCase().includes(search.toLowerCase())
  );

  const selected = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={search || (selected?.label ?? "")}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full rounded-md border border-black/10 bg-white py-1 pl-8 pr-8 text-sm dark:border-white/10 dark:bg-neutral-800 dark:text-white"
        />
        {value && (
          <button
            onClick={() => {
              onChange("");
              setSearch("");
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"
          >
            <X className="h-4 w-4 text-neutral-400" />
          </button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-neutral-800">
          {filtered.map((option) => (
            <button
              key={`${option.value}`}
              onClick={() => {
                onChange(option.value);
                setSearch("");
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                value === option.value
                  ? "bg-emerald-100 font-semibold dark:bg-emerald-500/20"
                  : ""
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
