"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { X, Search } from "lucide-react";

type Option = {
  value: string;
  label: string;
};

export function PlayerAutocomplete({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = "Buscar...",
}: {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(query)
    );
  }, [search, options]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setSearch("");
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
          <Search size={16} />
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder={selectedOption ? "" : placeholder}
          value={selectedOption ? selectedOption.label : search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            if (!value) onChange("");
          }}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 pl-8 text-sm dark:border-white/10 dark:bg-neutral-900 disabled:opacity-50"
        />
        {value && !search && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            type="button"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-neutral-900">
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                value === option.value
                  ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
                  : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {isOpen && filteredOptions.length === 0 && search && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-500 shadow-lg dark:border-white/10 dark:bg-neutral-900">
          No se encontraron resultados
        </div>
      )}
    </div>
  );
}
