import { useState, useRef, useEffect } from "react";
import Icon from "./Icon";
import { useApp } from "../context/AppContext";

const AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAul6DqlH6L2YRHHHRq82V0cWVbmpeLwF2bHFQMWEyE3hf9ZAnxwpjihIeEFWmgxW4GlXigc_0sf9fFUolXMuOcccv4KqDpDxBIvYlygM9RjzpGeEAOhoG0qKqVNNXvS94DHjM6hAI8LhaHZk8CQZgRSFoWZtJdA9Yi5hmCM_O3YfINr8hvy9Ix-Sq0nB7wOiBjY9uwTHwpGb9Wck6bhcCohmgOUCrAo4vnaBeHNMPPgzsyXPZir2Eq4h81AOkfEPZiuiZquFer6diz";

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
  const { addToast, theme, toggleTheme } = useApp();

  // Notifications
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState(INITIAL_NOTIFS);
  const notifsRef = useRef(null);
  const unread = notifs.filter((n) => !n.read).length;

  // Settings & Theme
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (notifsRef.current && !notifsRef.current.contains(e.target))
        setShowNotifs(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target))
        setShowSettings(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

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
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Notifications */}
          <div className="relative" ref={notifsRef}>
            <button
              onClick={() => setShowNotifs((v) => !v)}
              className="relative text-slate-400 hover:text-indigo-400 transition-colors flex items-center"
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

          {/* Settings / Theme Switcher */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="relative text-slate-400 hover:text-indigo-400 transition-colors flex items-center"
              aria-label="Settings"
            >
              <Icon name="settings" className="text-[20px]" />
            </button>

            {showSettings && (
              <div className="absolute top-full right-0 mt-3 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-white/5">
                  <span className="text-xs font-bold text-white">Settings</span>
                </div>
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => {
                      toggleTheme("light");
                      setShowSettings(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      theme === "light"
                        ? "bg-indigo-500/10 text-indigo-400 font-semibold"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                    }`}
                  >
                    <Icon name="light_mode" className="text-sm" />
                    <span>Light Mode</span>
                  </button>
                  <button
                    onClick={() => {
                      toggleTheme("dark");
                      setShowSettings(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      theme === "dark"
                        ? "bg-indigo-500/10 text-indigo-400 font-semibold"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                    }`}
                  >
                    <Icon name="dark_mode" className="text-sm" />
                    <span>Dark Mode</span>
                  </button>
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
