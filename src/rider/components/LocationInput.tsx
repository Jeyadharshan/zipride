import { fetchSuggestions as apiFetchSuggestions } from "@/map/services/autocomplete";
import { useState, useEffect, useRef } from "react";
import { MapPin, X } from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface LocationInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  onSelect: (address: string, lat: number, lon: number) => void;
  icon?: React.ReactNode;
  className?: string;
}

export function LocationInput({
  value,
  onChange,
  placeholder,
  onSelect,
  icon,
  className,
}: LocationInputProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const sug = await apiFetchSuggestions(query);
      setSuggestions(sug);
    } catch (err) {
      console.error("Nominatim suggestion fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setShowDropdown(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 400);
  };

  const handleSelect = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const inTamilNadu = lat >= 8.0 && lat <= 14.0 && lon >= 76.0 && lon <= 80.5;

    if (!inTamilNadu) {
      alert("ZipRide only operates within Tamil Nadu, India. Please select a location in Tamil Nadu.");
      return;
    }

    const parts = item.name.split(",");
    const shortAddress = parts.slice(0, 3).join(",").trim();
    
    onSelect(shortAddress, lat, lon);
    setShowDropdown(false);
    setSuggestions([]);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="flex items-center gap-3 rounded-2xl border border-input bg-card px-4 py-3.5 shadow-sm focus-within:border-primary transition-colors">
        {icon}
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full bg-transparent font-semibold outline-none placeholder:text-muted-foreground/60 text-sm"
        />
        {value && (
          <button
            onClick={() => {
              onChange("");
              setSuggestions([]);
              setShowDropdown(false);
            }}
            className="text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showDropdown && (suggestions.length > 0 || loading) && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-elevated">
          {loading ? (
            <div className="flex items-center justify-center py-4 text-xs font-semibold text-muted-foreground">
              Searching locations...
            </div>
          ) : (
            suggestions.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(item)}
                className="flex w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-secondary transition-colors cursor-pointer"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.name.split(",")[0]}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.name.split(",").slice(1).join(",").trim()}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
