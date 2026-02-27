import { useEffect, useRef, useState } from "react";
import axios from "axios";

const radiusOptions = [
  { value: "10", label: "10km" },
  { value: "25", label: "25km" },
  { value: "50", label: "50km" },
  { value: "remote", label: "Remote" },
];

const toCityLabel = (item = {}) => {
  const address = item.address || {};
  const city = address.city || address.town || address.village || address.county || "";
  const state = address.state || "";
  const country = address.country || "";

  const compact = [city, state, country].filter(Boolean).join(", ");
  return compact || item.display_name || "";
};

export default function SearchBar({ onSearch }) {
  const [location, setLocation] = useState("");
  const [role, setRole] = useState("");
  const [radius, setRadius] = useState("25");
  const [geoLoading, setGeoLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const skipLookupRef = useRef(false);
  const containerRef = useRef(null);

  const submit = (event) => {
    event.preventDefault();
    onSearch(radius === "remote" ? "" : location.trim(), role.trim(), radius);
  };

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setSuggestOpen(false);
      }
    };

    window.addEventListener("click", onClickOutside);
    return () => window.removeEventListener("click", onClickOutside);
  }, []);

  useEffect(() => {
    const query = location.trim();

    if (skipLookupRef.current) {
      skipLookupRef.current = false;
      return;
    }

    if (query.length < 2 || radius === "remote") {
      setSuggestions([]);
      setSuggestOpen(false);
      setSuggestLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const response = await axios.get("https://nominatim.openstreetmap.org/search", {
          params: {
            q: query,
            format: "jsonv2",
            addressdetails: 1,
            limit: 5,
          },
        });

        const nextSuggestions = (response.data || [])
          .map((item) => ({
            id: `${item.place_id}`,
            label: toCityLabel(item),
          }))
          .filter((item) => item.label);

        setSuggestions(nextSuggestions);
        setSuggestOpen(nextSuggestions.length > 0);
      } catch (error) {
        console.error("Location auto-suggest failed:", error.message);
        setSuggestions([]);
        setSuggestOpen(false);
      } finally {
        setSuggestLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [location, radius]);

  const onSelectSuggestion = (suggestion) => {
    skipLookupRef.current = true;
    setLocation(suggestion.label);
    setSuggestOpen(false);
    setSuggestions([]);
  };

  const fillCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await axios.get("https://nominatim.openstreetmap.org/reverse", {
            params: {
              lat: position.coords.latitude,
              lon: position.coords.longitude,
              format: "json",
            },
          });

          const address = response.data?.address || {};
          const place =
            address.city ||
            address.town ||
            address.village ||
            address.state ||
            response.data?.display_name ||
            "";
          skipLookupRef.current = true;
          setLocation(place);
          setSuggestOpen(false);
          setSuggestions([]);
        } catch (error) {
          console.error("Reverse geocoding failed:", error.message);
        } finally {
          setGeoLoading(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error.message);
        setGeoLoading(false);
      }
    );
  };

  return (
    <form onSubmit={submit} ref={containerRef} className="rounded-3xl bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 shadow-xl backdrop-blur-xl w-full">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(220px,1.3fr)_minmax(260px,1.4fr)_130px_minmax(160px,auto)_auto] md:items-end">
        <label className="space-y-1.5">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">What</span>
          <input
            type="text"
            placeholder="Role, skills, or keyword"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:text-white md:text-base"
          />
        </label>

        <div className="relative space-y-1.5">
          <label className="flex flex-col space-y-1.5">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Where</span>
            <input
              type="text"
              placeholder={radius === "remote" ? "Remote selected" : "City or region"}
              value={radius === "remote" ? "Remote" : location}
              onChange={(event) => {
                if (radius === "remote") return;
                setLocation(event.target.value);
              }}
              onFocus={() => {
                if (suggestions.length > 0 && radius !== "remote") setSuggestOpen(true);
              }}
              disabled={radius === "remote"}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:text-white disabled:opacity-60 md:text-base"
            />
          </label>

          {suggestOpen ? (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-64 overflow-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-zinc-900/95 p-1.5 shadow-xl backdrop-blur-xl">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => onSelectSuggestion(suggestion)}
                  className="block w-full rounded-xl px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          ) : null}

          {suggestLoading ? <p className="mt-1 px-2 text-xs text-slate-500 dark:text-slate-400">Looking up cities...</p> : null}
        </div>

        <label className="space-y-1.5">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Radius</span>
          <select
            value={radius}
            onChange={(event) => setRadius(event.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 px-3 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:text-white md:text-base h-[46px]"
          >
            {radiusOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={fillCurrentLocation}
          className="flex h-[46px] items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 text-sm font-semibold text-slate-700 dark:text-white shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-50 md:text-base"
          disabled={geoLoading || radius === "remote"}
          title={radius === "remote" ? "Location is not needed for remote search" : "Detect my location"}
        >
          <span>📍</span> {geoLoading ? "Detecting..." : "Detect Location"}
        </button>

        <button
          type="submit"
          className="h-[46px] rounded-xl bg-blue-600 px-8 text-sm font-bold tracking-wide text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-500 hover:shadow-blue-500/40 md:text-base"
        >
          Search
        </button>
      </div>
    </form>
  );
}
