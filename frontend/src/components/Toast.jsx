import { useApp } from "../context/AppContext";
import Icon from "./Icon";

const CONFIG = {
  success: { icon: "check_circle", cls: "border-emerald-500/30 text-emerald-400" },
  error:   { icon: "error",        cls: "border-red-500/30 text-red-400" },
  info:    { icon: "info",         cls: "border-indigo-500/30 text-indigo-400" },
  warning: { icon: "warning",      cls: "border-amber-500/30 text-amber-400" },
};

export default function Toast() {
  const { toasts } = useApp();
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 w-72 pointer-events-none">
      {toasts.map((t) => {
        const c = CONFIG[t.type] ?? CONFIG.info;
        return (
          <div
            key={t.id}
            className={`toast-slide-in flex items-center gap-3 px-4 py-3 rounded-xl border bg-slate-900/95 backdrop-blur-md shadow-2xl ${c.cls}`}
          >
            <Icon name={c.icon} fill className="text-sm shrink-0" />
            <p className="text-xs font-medium text-slate-200">{t.message}</p>
          </div>
        );
      })}
    </div>
  );
}
