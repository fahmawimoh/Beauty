"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  id: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  noResultsMessage?: string;
  selectAllLabel?: string;
  clearAllLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No options available",
  noResultsMessage = "No results found",
  selectAllLabel = "Select all",
  clearAllLabel = "Clear all",
  disabled = false,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOptions = useMemo(
    () => options.filter((o) => value.includes(o.id)),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setSearch("");
      setHighlightIndex(0);
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (highlightIndex >= filteredOptions.length) {
      setHighlightIndex(Math.max(0, filteredOptions.length - 1));
    }
  }, [filteredOptions.length, highlightIndex]);

  const toggleOption = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const removeOption = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== id));
  };

  const selectAll = () => {
    const ids = new Set(value);
    filteredOptions.forEach((o) => ids.add(o.id));
    onChange([...ids]);
  };

  const clearAll = () => {
    if (search.trim()) {
      const filteredIds = new Set(filteredOptions.map((o) => o.id));
      onChange(value.filter((id) => !filteredIds.has(id)));
    } else {
      onChange([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredOptions[highlightIndex]) {
          toggleOption(filteredOptions[highlightIndex].id);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  useEffect(() => {
    if (!open || !listRef.current) return;
    const item = listRef.current.querySelector(`[data-index="${highlightIndex}"]`);
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, open]);

  const allFilteredSelected = filteredOptions.length > 0 && filteredOptions.every((o) => value.includes(o.id));

  return (
    <div ref={containerRef} className={cn("relative", className)} onKeyDown={handleKeyDown}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex min-h-[38px] w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors text-start",
          "focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {selectedOptions.length === 0 ? (
            <span className="text-slate-400">{placeholder}</span>
          ) : (
            selectedOptions.map((opt) => (
              <span
                key={opt.id}
                className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700"
              >
                {opt.label}
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => removeOption(opt.id, e)}
                    className="rounded-full p-0.5 hover:bg-violet-100"
                    aria-label={`Remove ${opt.label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightIndex(0);
                }}
                placeholder={searchPlaceholder}
                className="w-full rounded-md border border-slate-200 py-1.5 ps-8 pe-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
              />
            </div>
            {filteredOptions.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={allFilteredSelected}
                  className="text-xs font-medium text-violet-600 hover:text-violet-800 disabled:text-slate-300 disabled:cursor-not-allowed"
                >
                  {selectAllLabel}
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={value.length === 0}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 disabled:text-slate-300 disabled:cursor-not-allowed"
                >
                  {clearAllLabel}
                </button>
              </div>
            )}
          </div>

          <div ref={listRef} role="listbox" className="max-h-52 overflow-auto py-1">
            {options.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400">{emptyMessage}</p>
            ) : filteredOptions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400">{noResultsMessage}</p>
            ) : (
              filteredOptions.map((opt, index) => {
                const selected = value.includes(opt.id);
                const highlighted = index === highlightIndex;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-index={index}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => toggleOption(opt.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-start text-sm transition-colors",
                      highlighted ? "bg-violet-50" : "hover:bg-violet-50/60",
                      selected && !highlighted && "bg-violet-50/30"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        selected ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 bg-white"
                      )}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    <span className={cn(selected ? "font-medium text-violet-900" : "text-slate-700")}>{opt.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
