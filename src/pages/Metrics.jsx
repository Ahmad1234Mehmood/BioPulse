import { useState, Fragment } from "react";
import Icon from "../components/Icon";
import { useApp } from "../context/AppContext";

const DIST_BARS = ["20%", "35%", "60%", "85%", "100%", "80%", "50%", "25%", "10%"];

const INITIAL_EXPERIMENTS = [
  { id: "EXP-2024-081", dataset: "WildFace_v2_Test",   samples: "42,500", eer: "0.0072%", eerColor: "text-indigo-400", status: "COMPLETED", statusClass: "bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-400", date: "2h ago" },
  { id: "EXP-2024-079", dataset: "Indoor_Control_Set", samples: "12,000", eer: "0.0004%", eerColor: "text-indigo-400", status: "COMPLETED", statusClass: "bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-400", date: "Yesterday" },
  { id: "EXP-2024-075", dataset: "LowRes_Challenge",   samples: "8,200",  eer: "0.1420%", eerColor: "text-amber-400",  status: "REVIEW",     statusClass: "bg-amber-500/10 text-amber-400",   dot: "bg-amber-400",  date: "3d ago" },
];

function farFromThreshold(t) {
  return ((1 - t) * (1 - t) * 0.8).toFixed(4);
}
function frrFromThreshold(t) {
  return (t * t * 1.2).toFixed(3);
}

export default function Metrics() {
  const { addToast } = useApp();

  const [threshold, setThreshold] = useState(0.842);
  const [experiments, setExperiments] = useState(INITIAL_EXPERIMENTS);
  const [expandedRow, setExpandedRow] = useState(null);
  const [runningNew, setRunningNew] = useState(false);

  const projFar = farFromThreshold(threshold);
  const projFrr = frrFromThreshold(threshold);

  const summary = [
    { label: "FAR (False Acceptance)", value: "0.0012%", trend: { color: "text-emerald-400", icon: "arrow_downward", text: "0.0004% vs last week" } },
    { label: "FRR (False Rejection)",  value: "0.045%",  trend: { color: "text-rose-400",    icon: "arrow_upward",   text: "0.002% vs last week" } },
    { label: "EER (Equal Error Rate)", value: "0.008%",  trend: { color: "text-indigo-400",  text: "Target: < 0.010%" } },
    { label: "Rank-1 Accuracy",        value: "99.982%", valueClass: "text-primary", trend: { color: "text-emerald-400", icon: "check_circle", text: "Enterprise Standard Met" } },
  ];

  const handleApply = () => {
    addToast(`Threshold ${threshold.toFixed(3)} applied. FAR: ${projFar}%, FRR: ${projFrr}%.`, "success");
  };

  const handleDownload = () => {
    addToast("Report exported as metrics_report.pdf.", "info");
  };

  const handleRunExperiment = () => {
    setRunningNew(true);
    addToast("New experiment queued. Estimated run time: 4 minutes.", "info");
    setTimeout(() => {
      const newId = `EXP-2024-0${82 + experiments.length}`;
      setExperiments((prev) => [
        {
          id: newId,
          dataset: "Custom_Dataset_v1",
          samples: "5,000",
          eer: "—",
          eerColor: "text-slate-500",
          status: "RUNNING",
          statusClass: "bg-indigo-500/10 text-indigo-400",
          dot: "bg-indigo-400",
          date: "just now",
        },
        ...prev,
      ]);
      setRunningNew(false);
    }, 1800);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-indigo-400 font-label-caps text-label-caps uppercase tracking-widest">
              Model Performance Overview
            </span>
            <h2 className="text-white font-h2 text-h2 mt-1">Biometric Metrics Engine</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-surface-container-high px-4 py-2 rounded-lg border border-white/10 flex items-center gap-2">
              <Icon name="event" className="text-indigo-400 text-sm" />
              <span className="text-on-surface-variant text-sm">Last 30 Days</span>
            </div>
            <button
              onClick={handleDownload}
              className="bg-surface-container-high p-2 rounded-lg border border-white/10 text-on-surface-variant hover:text-white transition-colors"
            >
              <Icon name="download" />
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary.map((c, i) => (
            <div
              key={c.label}
              className="bg-surface-container p-6 rounded-xl border border-white/5 relative overflow-hidden group"
            >
              {i === 0 && (
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Icon name="verified_user" className="text-6xl" />
                </div>
              )}
              <p className="text-on-surface-variant font-label-caps text-label-caps uppercase">{c.label}</p>
              <h3 className={`text-3xl font-bold mt-2 ${c.valueClass || "text-white"}`}>{c.value}</h3>
              <div className={`flex items-center gap-1 mt-2 text-xs ${c.trend.color}`}>
                {c.trend.icon && <Icon name={c.trend.icon} className="text-xs" />}
                <span>{c.trend.text}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts bento */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ROC */}
          <div className="lg:col-span-8 bg-surface-container border border-white/10 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
              <div>
                <h4 className="text-white font-semibold">ROC Curve Analysis</h4>
                <p className="text-xs text-on-surface-variant">True Positive Rate vs False Positive Rate</p>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase">v4.2.0</span>
                <span className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-[10px] font-bold uppercase">v4.1.8</span>
              </div>
            </div>
            <div className="flex-1 p-6 sm:p-8 min-h-[300px] sm:min-h-[350px] relative chart-grid flex flex-col justify-end">
              <svg className="w-full h-56 sm:h-64 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path d="M 0 100 Q 5 10, 100 0" fill="none" stroke="#8083ff" strokeWidth="2" />
                <path d="M 0 100 Q 20 40, 100 0" fill="none" stroke="#464554" strokeDasharray="4" strokeWidth="1.5" />
                <circle cx="20" cy="40" fill="#8083ff" r="1.5" />
              </svg>
              <div className="flex justify-between mt-4 text-[10px] font-label-caps uppercase text-slate-500">
                <span>0.0 FPR</span><span>0.2</span><span>0.4</span><span>0.6</span><span>0.8</span><span>1.0 FPR</span>
              </div>
            </div>
          </div>

          {/* Threshold + Distribution */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface-container border border-white/10 rounded-2xl p-6 glow-border">
              <h4 className="text-white font-semibold flex items-center gap-2">
                <Icon name="tune" className="text-indigo-400" /> Threshold Tuning
              </h4>
              <p className="text-sm text-on-surface-variant mt-2 mb-8">
                Optimize match sensitivity for specific use cases.
              </p>
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between mb-4">
                    <span className="text-xs font-label-caps uppercase text-slate-400">Match Sensitivity</span>
                    <span className="text-xs font-bold text-indigo-400">{threshold.toFixed(3)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.001"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] text-slate-600">Conservative</span>
                    <span className="text-[10px] text-slate-600">Aggressive</span>
                  </div>
                </div>
                <div className="space-y-3 p-4 bg-slate-950/50 rounded-lg border border-white/5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Projected FAR:</span>
                    <span className="text-emerald-400 font-code">{projFar}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Projected FRR:</span>
                    <span className="text-amber-400 font-code">{projFrr}%</span>
                  </div>
                </div>
                <button
                  onClick={handleApply}
                  className="w-full py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20"
                >
                  Apply Configuration
                </button>
              </div>
            </div>

            <div className="bg-surface-container border border-white/10 rounded-2xl p-6">
              <h4 className="text-white font-semibold flex items-center gap-2">
                <Icon name="hub" className="text-indigo-400" /> Distribution Map
              </h4>
              <div className="mt-6 h-32 flex items-end gap-1 px-2">
                {DIST_BARS.map((h, i) => {
                  const tone =
                    i === 4
                      ? "bg-indigo-500"
                      : i === 3 || i === 5
                      ? "bg-indigo-500/50"
                      : i === 2 || i === 6
                      ? "bg-indigo-500/30"
                      : i === 8
                      ? "bg-indigo-500/10"
                      : "bg-indigo-500/20";
                  return <div key={i} className={`flex-1 ${tone} rounded-t-sm`} style={{ height: h }} />;
                })}
              </div>
              <p className="text-[10px] text-center text-slate-500 mt-4 uppercase tracking-tighter">
                Similarity Score Frequency Distribution
              </p>
            </div>
          </div>

          {/* DET */}
          <div className="lg:col-span-6 bg-surface-container border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-white font-semibold">DET Curve</h4>
              <Icon name="info" className="text-slate-500 text-sm cursor-help" />
            </div>
            <div className="h-48 chart-grid relative rounded border border-white/5 flex items-center justify-center">
              <svg className="w-full h-full p-4" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path d="M 10 90 L 90 10" fill="none" stroke="#2d3449" strokeWidth="1" />
                <path d="M 10 70 C 20 70, 70 20, 70 10" fill="none" stroke="#89ceff" strokeWidth="2" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                <span className="text-[8px] font-code uppercase">Logarithmic Error Scale</span>
              </div>
            </div>
            <div className="mt-4 flex gap-4 text-[10px] font-label-caps text-slate-400">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-secondary" /> v4.2.0
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-surface-variant" /> Ideal
              </div>
            </div>
          </div>

          {/* CMC */}
          <div className="lg:col-span-6 bg-surface-container border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-white font-semibold">CMC Curve (1:N)</h4>
              <Icon name="info" className="text-slate-500 text-sm cursor-help" />
            </div>
            <div className="h-48 chart-grid relative rounded border border-white/5">
              <svg className="w-full h-full p-4" preserveAspectRatio="none" viewBox="0 0 100 100">
                <polyline fill="none" points="0,100 5,5 10,2 20,1 50,0.5 100,0.1" stroke="#c0c1ff" strokeWidth="2" />
              </svg>
              <div className="absolute bottom-4 right-4 bg-slate-900/80 px-2 py-1 rounded text-[10px] border border-white/10 font-code text-primary">
                Rank-1: 99.98%
              </div>
            </div>
            <div className="mt-4 flex justify-between text-[10px] font-label-caps text-slate-500">
              <span>Rank 1</span><span>Rank 5</span><span>Rank 10</span><span>Rank 20</span><span>Rank 50</span>
            </div>
          </div>
        </div>

        {/* Validation table */}
        <div className="bg-surface-container border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
            <h4 className="text-white font-semibold">Validation Experiments</h4>
            <button
              onClick={handleRunExperiment}
              disabled={runningNew}
              className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold hover:text-indigo-300 transition-colors disabled:opacity-50"
            >
              {runningNew ? (
                <>
                  <Icon name="sync" className="text-xs animate-spin" /> Queuing…
                </>
              ) : (
                <>
                  <Icon name="add" className="text-xs" /> Run New Experiment
                </>
              )}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[680px]">
              <thead>
                <tr className="bg-surface-container-high/50 text-[10px] font-label-caps uppercase text-slate-500 tracking-wider">
                  <th className="px-6 py-4 font-semibold">Experiment ID</th>
                  <th className="px-6 py-4 font-semibold">Dataset</th>
                  <th className="px-6 py-4 font-semibold">Samples</th>
                  <th className="px-6 py-4 font-semibold">EER</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {experiments.map((e) => (
                  <Fragment key={e.id}>
                    <tr
                      onClick={() => setExpandedRow(expandedRow === e.id ? null : e.id)}
                      className="hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 text-white font-medium">{e.id}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{e.dataset}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{e.samples}</td>
                      <td className={`px-6 py-4 font-code ${e.eerColor}`}>{e.eer}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${e.statusClass}`}
                        >
                          <span className={`w-1 h-1 rounded-full ${e.dot} ${e.status === "RUNNING" ? "animate-pulse" : ""}`} />
                          {e.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant text-right">{e.date}</td>
                    </tr>
                    {expandedRow === e.id && (
                      <tr className="bg-slate-950/50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div>
                              <p className="text-slate-500 uppercase font-bold">Accuracy</p>
                              <p className="text-white mt-1">99.{Math.floor(Math.random() * 99).toString().padStart(2,"0")}%</p>
                            </div>
                            <div>
                              <p className="text-slate-500 uppercase font-bold">FAR</p>
                              <p className="text-white mt-1">0.000{Math.floor(Math.random() * 9) + 1}%</p>
                            </div>
                            <div>
                              <p className="text-slate-500 uppercase font-bold">FRR</p>
                              <p className="text-white mt-1">0.0{Math.floor(Math.random() * 9) + 1}%</p>
                            </div>
                            <div>
                              <p className="text-slate-500 uppercase font-bold">Model</p>
                              <p className="text-white mt-1">v4.2.0</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
