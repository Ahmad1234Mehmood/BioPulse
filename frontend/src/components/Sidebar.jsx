import { NavLink, Link } from "react-router-dom";
import { NAV_ITEMS } from "./navItems";
import Icon from "./Icon";

function NavItem({ item, onNavigate }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 px-3 py-2.5 transition-all duration-200 cursor-pointer",
          isActive
            ? "text-indigo-400 bg-indigo-500/10 border-l-2 border-indigo-500 rounded-r-lg font-semibold"
            : "text-slate-400 hover:bg-white/5 hover:text-slate-100 rounded-lg",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          <Icon name={item.icon} fill={isActive} className="text-lg" />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

/**
 * The shared sidebar. Renders the same markup for both the fixed desktop rail
 * and the sliding mobile drawer — `variant` only changes the wrapper.
 */
export default function Sidebar({ variant = "desktop", open = false, onClose }) {
  const isMobile = variant === "mobile";

  const wrapperClass = isMobile
    ? `lg:hidden fixed left-0 top-0 bottom-0 z-50 w-72 max-w-[85%] bg-slate-900 border-r border-white/5 flex flex-col gap-2 py-6 font-inter text-sm drawer overflow-y-auto ${
        open ? "translate-x-0" : "-translate-x-full"
      }`
    : "hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-slate-900 border-r border-white/5 flex-col gap-2 py-6 font-inter text-sm z-40";

  return (
    <aside className={wrapperClass}>
      {/* Brand */}
      <div className="px-6 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Icon name="biotech" fill className="text-white" />
          </div>
          <div>
            <div className="text-indigo-500 font-bold leading-tight">FaceMetrics Core</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest"></div>
          </div>
        </div>
        {isMobile && (
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" aria-label="Close menu">
            <Icon name="close" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} item={item} onNavigate={isMobile ? onClose : undefined} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 mt-auto space-y-4">
        {/* <div className="px-3">
          <button className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-xs font-semibold transition-colors border border-white/5">
            Upgrade Plan
          </button>
        </div> */}
        <div className="px-3 space-y-1 pb-4">
          <Link
            to="/privacy"
            onClick={isMobile ? onClose : undefined}
            className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:bg-white/5 hover:text-slate-100 rounded-lg transition-all text-xs"
          >
            <Icon name="gavel" className="text-sm" />
            <span>Privacy Policy</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
