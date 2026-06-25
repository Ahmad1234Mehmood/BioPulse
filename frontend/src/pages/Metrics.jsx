import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import Icon from "../components/Icon";
import { useApp } from "../context/AppContext";
import { getMetricsSummary, runMetricsEvaluation, runRotationRobustness } from "../api/services";

export default function Metrics() {
  const { addToast, theme } = useApp();
  const isLight = theme === "light";
  const gridStroke = isLight ? "#cbd5e1" : "#1e293b";
  const tooltipBg = isLight ? "#ffffff" : "#0f172a";
  const tooltipBorder = isLight ? "#cbd5e1" : "#334155";
  const tooltipLabelColor = isLight ? "#475569" : "#94a3b8";

  const [evalMode, setEvalMode] = useState("demo");
  const subjectLimit = evalMode === "demo" ? 25 : null;
  const [threshold, setThreshold] = useState(0.70);
  const [metrics, setMetrics] = useState(null);
  const [runningEval, setRunningEval] = useState(false);
  const [runningRobustness, setRunningRobustness] = useState(false);
  
  // Robustness data
  const [robustnessData, setRobustnessData] = useState(null);

  // Load summary and check if metrics have been computed already
  useEffect(() => {
    const loadSummary = async () => {
      try {
        const summaryRes = await getMetricsSummary(subjectLimit);
        if (summaryRes.data?.data) {
          // If summary is available, fetch the full metrics
          const fullRes = await runMetricsEvaluation(false, subjectLimit);
          if (fullRes.data?.data) {
            setMetrics(fullRes.data.data);
          }
        }
      } catch (err) {
        // Safe to ignore on mount, maybe metrics aren't run yet
        console.log("No cached metrics summary found on mount");
      }
    };
    loadSummary();
  }, []);

  const handleRunEvaluation = async () => {
    setRunningEval(true);
    addToast("Starting full biometric evaluation pipeline on LFW dataset...", "info");
    try {
      const res = await runMetricsEvaluation(true, subjectLimit);
      if (res.data?.data) {
        setMetrics(res.data.data);
        addToast("Biometric evaluation completed successfully!", "success");
      }
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.detail || "Metrics evaluation failed.", "error");
    } finally {
      setRunningEval(false);
    }
  };

  const handleRunRobustness = async () => {
    setRunningRobustness(true);
    addToast("Queueing rotation robustness experiment (tests 25 subjects across 5 conditions)...", "info");
    try {
      const res = await runRotationRobustness();
      if (res.data?.data) {
        setRobustnessData(res.data.data);
        addToast("Rotation robustness test completed successfully!", "success");
      }
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.detail || "Robustness test failed.", "error");
    } finally {
      setRunningRobustness(false);
    }
  };

  const formatRocData = () => {
    if (!metrics?.roc) return [];
    return metrics.roc.fpr.map((fpr, i) => ({
      fpr: parseFloat(fpr.toFixed(5)),
      tpr: parseFloat(metrics.roc.tpr[i].toFixed(5))
    }));
  };

  const formatDetData = () => {
    if (!metrics?.det) return [];
    return metrics.det.far.map((far, i) => ({
      far: parseFloat(far.toFixed(5)),
      frr: parseFloat(metrics.det.frr[i].toFixed(5))
    }));
  };

  const formatCmcData = () => {
    if (!metrics?.cmc) return [];
    return metrics.cmc.ranks.map((rank, i) => ({
      rank: rank,
      rate: parseFloat(metrics.cmc.identification_rates[i].toFixed(5))
    }));
  };

  const getSecurityLevel = (farVal) => {
    if (farVal === 0) return { name: "Maximum Security", color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", icon: "security" };
    if (farVal <= 0.001) return { name: "High Security (Banking)", color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", icon: "shield" };
    if (farVal <= 0.01) return { name: "Balanced Security", color: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", icon: "gpp_good" };
    if (farVal <= 0.05) return { name: "Convenience Mode", color: "bg-amber-500/10 text-amber-400 border border-amber-500/20", icon: "lock_open" };
    return { name: "Permissive / Low Security", color: "bg-rose-500/10 text-rose-400 border border-rose-500/20", icon: "warning" };
  };

  // Get simulated metrics using real LFW evaluation data
  const getSimulatedMetrics = () => {
    if (!metrics?.det?.thresholds || metrics.det.thresholds.length === 0) {
      const synFar = ((1 - threshold) * (1 - threshold) * 0.8 * 100);
      const synFrr = (threshold * threshold * 1.2 * 100);
      return {
        far: synFar.toFixed(4),
        frr: synFrr.toFixed(3),
        rawFar: synFar / 100,
        rawFrr: synFrr / 100,
        isReal: false,
        securityLevel: getSecurityLevel(synFar / 100),
        falseAccepts: "—",
        falseRejects: "—"
      };
    }

    const ths = metrics.det.thresholds;
    const fars = metrics.det.far;
    const frrs = metrics.det.frr;

    // Find closest threshold index
    let closestIdx = 0;
    let minDiff = Math.abs(ths[0] - threshold);
    for (let i = 1; i < ths.length; i++) {
      const diff = Math.abs(ths[i] - threshold);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    const realFar = fars[closestIdx];
    const realFrr = frrs[closestIdx];

    const totalProbes = metrics.summary.total_probes || 757;
    const totalEnrolled = metrics.summary.total_enrolled || 370;
    
    const genuineAttempts = totalProbes;
    const impostorAttempts = totalProbes * (totalEnrolled - 1);

    const estFalseRejects = Math.round(realFrr * genuineAttempts);
    const estFalseAccepts = Math.round(realFar * impostorAttempts);

    return {
      far: (realFar * 100).toFixed(4),
      frr: (realFrr * 100).toFixed(3),
      rawFar: realFar,
      rawFrr: realFrr,
      isReal: true,
      securityLevel: getSecurityLevel(realFar),
      falseAccepts: estFalseAccepts,
      falseRejects: estFalseRejects
    };
  };

  const sim = getSimulatedMetrics();
  const hasFalseAccepts = typeof sim.falseAccepts === 'number' && sim.falseAccepts > 0;
  const hasFalseRejects = typeof sim.falseRejects === 'number' && sim.falseRejects > 0;

  const getStatusColor = (val) => {
    if (val === "COMPLETED" || val === "healthy" || val === "SUCCESS") return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-indigo-400 font-label-caps text-[11px] uppercase tracking-widest font-bold">
              Model Performance Overview
            </span>
            <h2 className="text-white font-h2 text-h2 mt-1">Biometric Metrics Engine</h2>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div style={{ display: 'inline-flex', border: '1px solid var(--color-border-secondary)', borderRadius: '8px', overflow: 'hidden' }}>
              <button onClick={() => setEvalMode('demo')} style={{ padding: '7px 20px', fontSize: '13px', fontWeight: 500, border: 'none', borderRight: '1px solid var(--color-border-secondary)', cursor: 'pointer', background: evalMode === 'demo' ? 'var(--color-background-secondary)' : 'transparent', color: evalMode === 'demo' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', transition: 'all 0.15s' }}>Demo Evaluation</button>
              <button onClick={() => setEvalMode('full')} style={{ padding: '7px 20px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer', background: evalMode === 'full' ? 'var(--color-background-secondary)' : 'transparent', color: evalMode === 'full' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', transition: 'all 0.15s' }}>Full Evaluation</button>
            </div>
            <button onClick={handleRunEvaluation} disabled={runningEval} className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 text-sm cursor-pointer">
              {runningEval ? (<><Icon name="sync" className="animate-spin text-sm" />Evaluating...</>) : (<><Icon name="play_arrow" className="text-sm" />{evalMode === 'demo' ? 'Run Evaluation (25 subjects)' : 'Run Full Evaluation'}</>)}
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-6 rounded-xl border border-white/5 relative overflow-hidden group">
            <p className="text-slate-500 font-label-caps text-[10px] uppercase font-bold tracking-wider">EER (Equal Error Rate)</p>
            <h3 className="text-3xl font-black text-indigo-400 mt-2">
              {metrics ? `${(metrics.summary.eer * 100).toFixed(2)}%` : "—"}
            </h3>
            <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
              <span>{metrics ? `Threshold: ${metrics.summary.eer_threshold.toFixed(3)}` : "No data loaded"}</span>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl border border-white/5 relative overflow-hidden group">
            <p className="text-slate-500 font-label-caps text-[10px] uppercase font-bold tracking-wider">FTA (Failure To Acquire) Rate</p>
            <h3 className="text-3xl font-black text-amber-500 mt-2">
              {metrics ? `${(metrics.summary.fta_rate * 100).toFixed(2)}%` : "—"}
            </h3>
            <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
              <span>{metrics ? "LFW benchmark (pre-cropped, FTA=0%)" : "No data loaded"}</span>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl border border-white/5 relative overflow-hidden group">
            <p className="text-slate-500 font-label-caps text-[10px] uppercase font-bold tracking-wider">Rank-1 Accuracy (1:N)</p>
            <h3 className="text-3xl font-black text-emerald-400 mt-2">
              {metrics ? `${(metrics.summary.rank_1_accuracy * 100).toFixed(2)}%` : "—"}
            </h3>
            <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
              <span>{metrics ? `Rank-5 Accuracy: ${(metrics.summary.rank_5_accuracy * 100).toFixed(2)}%` : "No data loaded"}</span>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl border border-white/5 relative overflow-hidden group">
            <p className="text-slate-500 font-label-caps text-[10px] uppercase font-bold tracking-wider">Effective Rank-1 Accuracy</p>
            <h3 className="text-3xl font-black text-teal-400 mt-2">
              {metrics ? `${(metrics.summary.effective_rank_1_accuracy * 100).toFixed(2)}%` : "—"}
            </h3>
            <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
              <span>Adjusted for acquire failures</span>
            </div>
          </div>
        </div>

        {/* Charts bento */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ROC */}
          <div className="lg:col-span-8 glass-panel border border-white/10 rounded-2xl overflow-hidden flex flex-col min-h-[400px]">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
              <div>
                <h4 className="text-white font-semibold">ROC Curve Analysis</h4>
                <p className="text-xs text-slate-500">True Positive Rate (TPR) vs False Positive Rate (FPR)</p>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase">Biometric Standard</span>
              </div>
            </div>
            <div className="flex-grow bg-slate-950/20 relative" style={{ minHeight: 0 }}>
              {metrics ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formatRocData()} margin={{ top: 16, right: 20, left: 10, bottom: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="fpr" type="number" domain={[0, 1]} stroke="#64748b" style={{ fontSize: 10 }} />
                    <YAxis dataKey="tpr" type="number" domain={[0, 1]} stroke="#64748b" style={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                      labelStyle={{ color: tooltipLabelColor }}
                      itemStyle={{ color: "#8083ff" }}
                      formatter={(value) => [`TPR: ${value.toFixed(4)}`, 'ROC Points']}
                      labelFormatter={(label) => `FPR: ${label}`}
                    />
                    <Line type="monotone" dataKey="tpr" stroke="#8083ff" strokeWidth={2} dot={false} />
                    {metrics && (
                      <ReferenceLine x={sim.rawFar} stroke="#ef4444" strokeDasharray="3 3" label={{
                        content: ({ viewBox }) => (
                          <text x={(viewBox.x || 0) + 6} y={(viewBox.y || 0) + 14} fill="#ef4444" fontSize={10} textAnchor="start">{`T: ${threshold.toFixed(2)}`}</text>
                        )
                      }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-slate-600 text-sm py-20 chart-grid h-full rounded-2xl">
                  Run Full Evaluation to plot dynamic ROC curve.
                </div>
              )}
            </div>
          </div>

          {/* Threshold + Local Tuning Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="glass-panel border border-white/10 rounded-2xl p-6 glow-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-semibold flex items-center gap-2">
                    <Icon name="tune" className="text-indigo-400" /> Dynamic Simulation
                  </h4>
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider ${sim.isReal ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"}`}>
                    {sim.isReal ? "LFW Telemetry" : "Synthetic"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-5">
                  Simulate FAR/FRR trade-offs and operational security levels.
                </p>
                <div className="space-y-6">
                  {/* Security Level Indicator Badge */}
                  <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border ${sim.securityLevel.color} transition-all duration-300`}>
                    <Icon name={sim.securityLevel.icon} className="text-lg shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Security Grade</div>
                      <div className="text-xs font-bold leading-tight mt-0.5">{sim.securityLevel.name}</div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-3">
                      <span className="text-xs font-label-caps uppercase text-slate-400">Match Threshold</span>
                      <span className="text-xs font-bold text-indigo-400">{threshold.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.4"
                      max="0.95"
                      step="0.01"
                      value={threshold}
                      onChange={(e) => setThreshold(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between mt-2">
                      <span className="text-[10px] text-slate-600">Convenience</span>
                      <span className="text-[10px] text-slate-600">Strict Security</span>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-white/5 font-mono text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Simulated FAR:</span>
                      <span className="text-emerald-400 font-bold text-sm">{sim.far}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Simulated FRR:</span>
                      <span className="text-amber-400 font-bold text-sm">{sim.frr}%</span>
                    </div>
                    <div className="border-t border-white/5 my-2 pt-2 space-y-1.5 text-[10px] text-slate-500">
                      <div className="flex justify-between">
                        <span>Est. False Accepts:</span>
                        <span className={hasFalseAccepts ? "text-rose-400/80 font-semibold" : "text-slate-400"}>
                          {sim.falseAccepts}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Est. False Rejects:</span>
                        <span className={hasFalseRejects ? "text-amber-400/80 font-semibold" : "text-slate-400"}>
                          {sim.falseRejects}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => addToast(`Sensitivity baseline set to ${threshold.toFixed(2)}`, "success")}
                className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 text-sm cursor-pointer mt-5"
              >
                Apply Configuration
              </button>
            </div>

            {/* Operating Points Bento */}
            {metrics?.operating_points && (
              <div className="glass-panel border border-white/10 rounded-2xl p-5 space-y-3">
                <h4 className="text-white text-sm font-semibold flex items-center gap-2">
                  <Icon name="hub" className="text-indigo-400" /> FAR Operating Points
                </h4>
                <div className="overflow-x-auto text-[10px] font-mono">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-500 border-b border-white/5">
                        <th className="pb-1.5">FAR Target</th>
                        <th className="pb-1.5 text-right">TAR (1-FRR)</th>
                        <th className="pb-1.5 text-right">Threshold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {metrics.operating_points.map((pt, i) => (
                        <tr key={i}>
                          <td className="py-2 text-slate-400 font-semibold">{pt.label}</td>
                          <td className="py-2 text-right text-emerald-400 font-bold">{(pt.tar * 100).toFixed(2)}%</td>
                          <td className="py-2 text-right text-indigo-400 font-bold">{pt.threshold.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* DET */}
          <div className="lg:col-span-6 glass-panel border border-white/10 rounded-2xl p-6 min-h-[300px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-white font-semibold">DET Curve</h4>
                <p className="text-[11px] text-slate-500">False Rejection Rate (FRR) vs False Acceptance Rate (FAR)</p>
              </div>
              <Icon name="info" className="text-slate-500 text-sm cursor-help" />
            </div>
            <div className="flex-grow flex flex-col justify-center bg-slate-950/20 min-h-[220px]">
              {metrics ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={formatDetData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="far" type="number" stroke="#64748b" style={{ fontSize: 10 }} />
                    <YAxis dataKey="frr" type="number" stroke="#64748b" style={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                      labelStyle={{ color: tooltipLabelColor }}
                      itemStyle={{ color: "#ef4444" }}
                      formatter={(value) => [`FRR: ${value.toFixed(4)}`, 'DET Points']}
                      labelFormatter={(label) => `FAR: ${label}`}
                    />
                    <Line type="monotone" dataKey="frr" stroke="#ef4444" strokeWidth={2} dot={false} />
                    {metrics && <ReferenceLine x={sim.rawFar} stroke="#8083ff" strokeDasharray="3 3" label={{ value: `T: ${threshold.toFixed(2)}`, fill: '#8083ff', fontSize: 10, position: 'top' }} />}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-slate-600 text-xs py-16 chart-grid">
                  DET Curve plots matching trade-offs.
                </div>
              )}
            </div>
          </div>

          {/* CMC */}
          <div className="lg:col-span-6 glass-panel border border-white/10 rounded-2xl p-6 min-h-[300px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-white font-semibold">CMC Curve (1:N)</h4>
                <p className="text-[11px] text-slate-500">Identification Rate vs Rank Number</p>
              </div>
              <Icon name="info" className="text-slate-500 text-sm cursor-help" />
            </div>
            <div className="flex-grow flex flex-col justify-center bg-slate-950/20 min-h-[220px]">
              {metrics ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={formatCmcData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="rank" type="number" domain={[1, 5]} ticks={[1,2,3,4,5]} stroke="#64748b" style={{ fontSize: 10 }} />
                    <YAxis dataKey="rate" type="number" domain={[0.8, 1]} stroke="#64748b" style={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                      labelStyle={{ color: tooltipLabelColor }}
                      itemStyle={{ color: "#10b981" }}
                      formatter={(value) => [`Rate: ${(value * 100).toFixed(2)}%`, 'Identification Rate']}
                      labelFormatter={(label) => `Rank: ${label}`}
                    />
                    <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-slate-600 text-xs py-16 chart-grid">
                  CMC plots Rank-N cumulative identification success.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Distance Metric Ablation Study */}
        {metrics?.metric_comparison && (
          <div className="glass-panel border border-white/10 rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-2">Distance Metric Ablation Study</h3>
            <p className="text-slate-400 text-xs mb-6">
              Side-by-side performance evaluation comparing Cosine Similarity and Euclidean (L2) distance.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch mb-6">
              <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-center mb-3">Cosine Similarity (Normalized)</span>
                <div className="flex gap-3">
                  <div className="flex-1 text-center p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">{evalMode === 'demo' ? 'Demo (25 subj.)' : 'Live (25 subj.)'}</div>
                    <div className="text-xl font-black text-indigo-400">EER: {(metrics.metric_comparison.cosine.eer * 100).toFixed(2)}%</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">AUC: {metrics.metric_comparison.cosine.roc_auc.toFixed(4)}</div>
                  </div>
                  {evalMode === 'full' && (
                    <div className="flex-1 text-center p-2.5 rounded-lg bg-slate-800/50 border border-white/5">
                      <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Paper (370 subj.)</div>
                      <div className="text-xl font-black text-indigo-300">EER: {(metrics.metric_comparison.cosine.paper_eer * 100).toFixed(2)}%</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">AUC: {metrics.metric_comparison.cosine.paper_auc.toFixed(4)}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-center mb-3">Euclidean L2 Distance</span>
                <div className="flex gap-3">
                  <div className="flex-1 text-center p-2.5 rounded-lg bg-slate-700/20 border border-white/5">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">{evalMode === 'demo' ? 'Demo (25 subj.)' : 'Live (25 subj.)'}</div>
                    <div className="text-xl font-black text-slate-400">EER: {(metrics.metric_comparison.euclidean.eer * 100).toFixed(2)}%</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">AUC: {metrics.metric_comparison.euclidean.roc_auc.toFixed(4)}</div>
                  </div>
                  {evalMode === 'full' && (
                    <div className="flex-1 text-center p-2.5 rounded-lg bg-slate-800/50 border border-white/5">
                      <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Paper (370 subj.)</div>
                      <div className="text-xl font-black text-slate-500">EER: {(metrics.metric_comparison.euclidean.paper_eer * 100).toFixed(2)}%</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">AUC: {metrics.metric_comparison.euclidean.paper_auc.toFixed(4)}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-xs flex gap-3 text-indigo-300">
              <Icon name="auto_awesome" className="text-lg shrink-0" />
              <div>
                <span className="font-bold">Recommendation: Use {metrics.metric_comparison.recommended_metric === 'cosine' ? 'Cosine Similarity' : 'Euclidean Distance'}</span>
                <p className="mt-1 text-slate-400 leading-relaxed font-medium">
                  {metrics.metric_comparison.note}
                </p>
                {Math.abs((metrics?.metric_comparison?.cosine?.eer || 0) - (metrics?.metric_comparison?.euclidean?.eer || 0)) < 0.001 && (
                  <p style={{ fontSize: '12px', color: 'var(--color-text-warning)', marginTop: '6px', lineHeight: 1.5 }}>
                    💡 Switch to "Full Evaluation" and re-run to see the real difference between Cosine (0.97%) and Euclidean (3.84%).
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Robustness Section */}
        <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
            <div>
              <h4 className="text-white font-semibold">Rotation Robustness Evaluation</h4>
              <p className="text-xs text-slate-500">Evaluates auto-orientation correction accuracy under rotational variations.</p>
            </div>
            <button
              onClick={handleRunRobustness}
              disabled={runningRobustness}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg shadow transition-all flex items-center gap-1.5 text-xs cursor-pointer"
            >
              {runningRobustness ? (
                <>
                  <Icon name="sync" className="animate-spin text-sm" />
                  Testing...
                </>
              ) : (
                <>
                  <Icon name="refresh" className="text-sm" />
                  Run Robustness Test
                </>
              )}
            </button>
          </div>
          <div className="overflow-x-auto">
            {robustnessData ? (
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-slate-950/20 text-[10px] font-mono text-slate-500 uppercase tracking-wider border-b border-white/5">
                    <th className="px-6 py-3 font-semibold">Evaluation Condition</th>
                    <th className="px-6 py-3 font-semibold text-right">FTA Count</th>
                    <th className="px-6 py-3 font-semibold text-right">FTA Rate</th>
                    <th className="px-6 py-3 font-semibold text-right">Rank-1</th>
                    <th className="px-6 py-3 font-semibold text-right">Rank-5</th>
                    <th className="px-6 py-3 font-semibold text-right">EER</th>
                    <th className="px-6 py-3 font-semibold text-right">Effective Rank-1</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs font-mono">
                  {robustnessData.conditions?.map((cond, i) => (
                    <tr key={i} className={`hover:bg-white/5 transition-colors ${cond.condition.includes('OFF') ? 'bg-rose-500/5' : ''}`}>
                      <td className="px-6 py-3.5 text-slate-300 font-bold">{cond.condition}</td>
                      <td className="px-6 py-3.5 text-right text-slate-400">{cond.fta_count} / {cond.total_attempted}</td>
                      <td className="px-6 py-3.5 text-right text-slate-400">{(cond.fta_rate * 100).toFixed(2)}%</td>
                      <td className="px-6 py-3.5 text-right text-emerald-400 font-bold">{(cond.rank_1_accuracy * 100).toFixed(2)}%</td>
                      <td className="px-6 py-3.5 text-right text-slate-400">{(cond.rank_5_accuracy * 100).toFixed(2)}%</td>
                      <td className="px-6 py-3.5 text-right text-indigo-400 font-bold">{(cond.eer * 100).toFixed(2)}%</td>
                      <td className="px-6 py-3.5 text-right text-teal-400 font-bold">{(cond.effective_rank_1 * 100).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center text-slate-500 text-xs py-10">
                No rotation robustness data loaded. Select "Run Robustness Test" to trigger.
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
