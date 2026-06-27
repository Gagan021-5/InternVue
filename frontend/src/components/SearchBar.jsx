import { useEffect, useRef, useState } from "react";
import axios from "axios";

const toCityLabel = (item = {}) => {
  const address = item.address || {};
  const city = address.city || address.town || address.village || address.county || "";
  const state = address.state || "";
  const country = address.country || "";

  const compact = [city, state, country].filter(Boolean).join(", ");
  return compact || item.display_name || "";
};

const PREDEFINED_ROLES = [
  "Software Engineer Intern",
  "Software Developer Intern",
  "Frontend Developer Intern",
  "Backend Developer Intern",
  "Full Stack Developer Intern",
  "Data Science Intern",
  "AI / ML Engineer Intern",
  "QA / Software Tester Intern",
  "Mobile App Developer Intern",
  "DevOps Engineer Intern"
];

export default function SearchBar({ onSearch }) {
  const [location, setLocation] = useState("");
  const [role, setRole] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  
  const [roleSuggestions, setRoleSuggestions] = useState([]);
  const [roleSuggestOpen, setRoleSuggestOpen] = useState(false);

  const skipLookupRef = useRef(false);
  const skipRoleLookupRef = useRef(false);
  const containerRef = useRef(null);

  const submit = (event) => {
    if (event) event.preventDefault();
    onSearch(location.trim(), role.trim(), "");
  };

  const handleRemoteClick = () => {
    setLocation("Remote");
    onSearch("Remote", role.trim(), "");
  };

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setSuggestOpen(false);
        setRoleSuggestOpen(false);
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

    if (query.length < 2 || query.toLowerCase() === "remote") {
      setSuggestions([]);
      setSuggestOpen(false);
      setSuggestLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const params = {
          q: query,
          format: "jsonv2",
          addressdetails: 1,
          limit: 5,
          countrycodes: "in", // Focus on India city suggestions only
        };

        const response = await axios.get("https://nominatim.openstreetmap.org/search", { params });

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
  }, [location]);

  useEffect(() => {
    const query = role.trim().toLowerCase();

    if (skipRoleLookupRef.current) {
      skipRoleLookupRef.current = false;
      return;
    }

    if (query.length < 2) {
      setRoleSuggestions([]);
      setRoleSuggestOpen(false);
      return;
    }

    const matched = PREDEFINED_ROLES.filter((item) =>
      item.toLowerCase().includes(query)
    );
    setRoleSuggestions(matched);
    setRoleSuggestOpen(matched.length > 0);
  }, [role]);

  const onSelectSuggestion = (suggestion) => {
    skipLookupRef.current = true;
    setLocation(suggestion.label);
    setSuggestOpen(false);
    setSuggestions([]);
  };

  const onSelectRoleSuggestion = (item) => {
    skipRoleLookupRef.current = true;
    setRole(item);
    setRoleSuggestOpen(false);
    setRoleSuggestions([]);
  };

  return (
    <form onSubmit={submit} ref={containerRef} className="section-shell glass w-full p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.5fr_1.5fr_auto_auto] md:items-end">
        
        {/* WHAT SEARCH */}
        <div className="relative space-y-1.5">
          <label className="flex flex-col space-y-1.5">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-blue-600">What</span>
            <input
              type="text"
              placeholder="Role, skills, or keyword"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              onFocus={() => {
                if (roleSuggestions.length > 0) setRoleSuggestOpen(true);
              }}
              className="input-premium w-full px-4 py-2.5 text-sm placeholder:text-slate-400 md:text-base"
            />
          </label>

          {roleSuggestOpen ? (
            <div className="section-shell absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-64 overflow-auto p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl">
              {roleSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => onSelectRoleSuggestion(suggestion)}
                  className="block w-full rounded-xl px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* CITY / STATE SEARCH */}
        <div className="relative space-y-1.5">
          <label className="flex flex-col space-y-1.5">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-blue-600">City / State (India)</span>
            <input
              type="text"
              placeholder="Search city in India..."
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setSuggestOpen(true);
              }}
              className="input-premium w-full px-4 py-2.5 text-sm placeholder:text-slate-400 md:text-base"
            />
          </label>

          {suggestOpen ? (
            <div className="section-shell absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-64 overflow-auto p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => onSelectSuggestion(suggestion)}
                  className="block w-full rounded-xl px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          ) : null}

          {suggestLoading ? <p className="mt-1 px-2 text-xs text-slate-400">Looking up cities...</p> : null}
        </div>

        {/* REMOTE ONLY BUTTON */}
        <button
          type="button"
          onClick={handleRemoteClick}
          className="btn-secondary flex h-[46px] items-center justify-center gap-2 px-5 text-sm font-bold tracking-wide md:text-base border border-slate-200 dark:border-white/10 shadow-sm"
        >
          <span>Remote</span>
        </button>

        {/* SEARCH BUTTON */}
        <button type="submit" className="btn-primary h-[46px] px-8 text-sm font-bold tracking-wide md:text-base shadow-lg shadow-blue-500/20">
          Search
        </button>
      </div>
    </form>
  );
}
