import { useState, useRef, useEffect } from "react";
import Icon from "./Icon";
import { useApp } from "../context/AppContext";

const AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAul6DqlH6L2YRHHHRq82V0cWVbmpeLwF2bHFQMWEyE3hf9ZAnxwpjihIeEFWmgxW4GlXigc_0sf9fFUolXMuOcccv4KqDpDxBIvYlygM9RjzpGeEAOhoG0qKqVNNXvS94DHjM6hAI8LhaHZk8CQZgRSFoWZtJdA9Yi5hmCM_O3YfINr8hvy9Ix-Sq0nB7wOiBjY9uwTHwpGb9Wck6bhcCohmgOUCrAo4vnaBeHNMPPgzsyXPZir2Eq4h81AOkfEPZiuiZquFer6diz";

const SEARCH_RESULTS = [
  { label: "Sarah Chen", sub: "BP-99210 · Enrolled · Standard", icon: "person" },
  { label: "Alexander Volkov", sub: "USR-92831 · Active · Privileged Admin", icon: "person" },
  { label: "Verification Mode (1:1)", sub: "Go to Verify page", icon: "verified_user" },
  { label: "ROC Curve — v4.2.0 analysis", sub: "Metrics Dashboard", icon: "analytics" },
  { label: "LowRes_Challenge Dataset", sub: "EXP-2024-075 · Under Review", icon: "dataset" },
];

const INITIAL_NOTIFS = [
  {
    id: 1,
    icon: "warning",
    bg: "bg-amber-500/10 text-amber-400",
    title: "High FRR Detected",
    sub: "Node-Group-7 thermal sensors at 1.84% FRR.",
    time: "2m ago",
    read: false,
  },
  {
    id: 2,
    icon: "check_circle",
    bg: "bg-emerald-500/10 text-emerald-400",
    title: "Enrollment Complete",
    sub: "Sarah Chen successfully added to the registry.",
    time: "12m ago",
    read: false,
  },
  {
    id: 3,
    icon: "info",
    bg: "bg-indigo-500/10 text-indigo-400",
    title: "Model v4.2.0 Deployed",
    sub: "Production update applied. Rank-1 accuracy improved.",
    time: "1h ago",
    read: true,
  },
];

export default function TopBar({ onMenu }) {
  const { addToast } = useApp();

  // Search
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);

  // Notifications
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState(INITIAL_NOTIFS);
  const notifsRef = useRef(null);
  const unread = notifs.filter((n) => !n.read).length;

  useEffect(() => {
    const close = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target))
        setShowSearch(false);
      if (notifsRef.current && !notifsRef.current.contains(e.target))
        setShowNotifs(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = SEARCH_RESULTS.filter(
    (r) =>
      r.label.toLowerCase().includes(query.toLowerCase()) ||
      r.sub.toLowerCase().includes(query.toLowerCase())
  );

  const markAllRead = () =>
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-8 h-16 w-full bg-slate-950/80 backdrop-blur-md border-b border-white/10 shadow-sm font-inter text-sm antialiased">
        <div className="flex items-center gap-4 md:gap-8">
          <button
            onClick={onMenu}
            className="lg:hidden text-slate-300 hover:text-indigo-400 transition-colors -ml-1"
            aria-label="Open menu"
          >
            <Icon name="menu" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Icon name="face" className="text-indigo-400 text-lg" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">FaceMetrics</span>
          </div>

          {/* Desktop search */}
          <div className="relative w-64 hidden sm:block" ref={searchRef}>
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search system..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowSearch(true)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-full py-1.5 pl-10 pr-4 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-300"
            />
            {showSearch && query.length >= 1 && (
              <div className="absolute top-full mt-2 left-0 w-72 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                {filtered.length > 0 ? (
                  filtered.map((r, i) => (
                    <button
                      key={i}
                      onMouseDown={() => {
                        setQuery("");
                        setShowSearch(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                    >
                      <Icon name={r.icon} className="text-slate-500 text-sm shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm text-white truncate">{r.label}</div>
                        <div className="text-[10px] text-slate-500 truncate">{r.sub}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-slate-500">
                    No results for &ldquo;{query}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            className="sm:hidden text-slate-400 hover:text-indigo-400 transition-colors"
            aria-label="Search"
          >
            <Icon name="search" className="text-[20px]" />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifsRef}>
            <button
              onClick={() => setShowNotifs((v) => !v)}
              className="relative text-slate-400 hover:text-indigo-400 transition-colors"
              aria-label="Notifications"
            >
              <Icon name="notifications" className="text-[20px]" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center leading-none">
                  {unread}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute top-full right-0 mt-3 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                  <span className="text-xs font-bold text-white">Notifications</span>
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="divide-y divide-white/5">
                  {notifs.map((n) => (
                    <div
                      key={n.id}
                      className={`flex gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${n.read ? "opacity-50" : ""}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.bg}`}
                      >
                        <Icon name={n.icon} fill className="text-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white">{n.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{n.sub}</p>
                        <p className="text-[10px] text-slate-600 mt-1">{n.time}</p>
                      </div>
                      {!n.read && (
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-8 h-8 rounded-full overflow-hidden border border-indigo-500/30 shrink-0">
            <img src={AVATAR} alt="User profile" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>
    </>
  );
}
