import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

interface VagoneteiroOption {
  id: number;
  name: string;
}

interface Props {
  options: VagoneteiroOption[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
}

export function ComboboxVagoneteiro({ options, value, onChange, placeholder = "Selecione um vagoneteiro" }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);

  const filtered = search.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(id: number) {
    onChange(id);
    setOpen(false);
    setSearch("");
  }

  function handleClear() {
    onChange(null);
    setSearch("");
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-10.5 px-3.5 border border-border rounded-lg text-sm text-left flex items-center justify-between gap-2 bg-white hover:border-blue-accent focus:outline-none focus:ring-2 focus:ring-blue-accent/10 transition-colors cursor-pointer"
      >
        <span className={selected ? "text-text-dark" : "text-text-secondary/60"}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-text-secondary shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded-lg shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 border-b border-border">
            <Search size={15} className="text-text-secondary shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar vagoneteiro..."
              className="w-full h-9 text-sm text-text-dark bg-transparent outline-none placeholder:text-text-secondary/60"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-text-secondary hover:text-text-dark cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-text-secondary text-center">Nenhum vagoneteiro encontrado</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left hover:bg-blue-50 transition-colors cursor-pointer ${
                    value === opt.id ? "bg-blue-50 text-blue-accent font-medium" : "text-text-dark"
                  }`}
                >
                  <span>{opt.name}</span>
                  {value === opt.id && <Check size={15} className="shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
