import { useState, useRef, useEffect } from "react";
import Icon from "../components/Icon";
import { useApp } from "../context/AppContext";

const TEMPLATE_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCOkT5ZGqHlWzZWa2kA4zbW4sWuELDFSlih8r4xI8azGjcV1SnZa139zjI3vdOE9xMSpVH98ms24tk2o35uQAy4gtF11G-tE7xx6GNkW_JYHtpcm4rebHKqLlizA-ZlH5Ri8SkGtND_pwUfkGZJ-5UmG7WYFo-2_VtfFEIae4OjBqqOcLr4FozIxVr9B101LrJfHYlzOtp5_tg9EsKyXuDLAkUuUAbchZs7wf50MZgoRGNPzcD3Gwzo2XHBJ2l-8f7IyDI-hl17ubyN";
const CAPTURE_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBLgj7zrIZ45XMSp2C38O75CquZtStmQIALcP_dT-Xig3TSe3a6lCg7-jBEoD_AoZ-0mnNWBRmf3DZpzkovczNO_fpmqfsw-XnLGy22lchXVTPzDCcD9Z5vKTTGp9jlrp3LSwKUV4Xe6w2MLIf67vSUFQin6rqYjatXsDJyA9UhMLJLQoPOrAtD9cG19BA9Gyl2_sDTBef76VF-xzWrWAN3JCjBxCVjHjYBiD8u6azh78gk_xAkNBm-3FqlSApi7AVdFg3-a4U2QpUr";
const EXTRACT_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBPJs7SpJI7LMtDKVKa9pw-gQpxV7ERbvSSwTRB-X6qU_o6ZO8hMM2U30TGQVHvrKzCZ1lcgg9fNvALMv5p3wnuHwsK5OnNbG7FstIBvnhRJ7XVkcHn2lIbf-EgksV6B5JGP15foneFMMZend5dwbwg7Dxq0Q7UBIWiv1c5lz4GC6iuz8au8iIRQyjLnT45lwVA2VxathJRjizY9quAs-dyo5ql-DcFmopJEqAnti09RxlyglF--5FB8zXFQCG5l2Zz65HD1StqbJdC";

const INITIAL_LOG = [
  { ts: "14:02:44", text: "Requesting template USR-92831…", cls: "text-slate-500" },
  { ts: "14:02:44", text: "Template retrieved. 1.2MB JSON.", cls: "text-slate-500" },
  { ts: "14:02:45", text: "Neural engine comparison started.", cls: "text-slate-500" },
  { ts: "14:02:45", text: "Comparison complete. Result: 0.9142. ACCEPTED.", cls: "text-emerald-400" },
  { ts: "14:02:46", text: "Log persisted to immutable ledger.", cls: "text-slate-500" },
];

function nowTime() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

export default function Verify() {
  const { addToast } = useApp();

  const [threshold, setThreshold] = useState(0.85);
  const [authenticating, setAuthenticating] = useState(false);
  const [result, setResult] = useState({ score: 91.4, accepted: true });
  const [log, setLog] = useState(INITIAL_LOG);
  const [claimedId, setClaimedId] = useState("USR-92831 (Alexander Volkov)");

  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const handleAuthenticate = () => {
    if (authenticating) return;
    setAuthenticating(true);

    const t0 = nowTime();
    setLog((prev) => [
      ...prev,
      { ts: t0, text: `Requesting template for ${claimedId.split(" ")[0]}…`, cls: "text-slate-500" },
      { ts: t0, text: "Live face captured. Running liveness check…", cls: "text-slate-500" },
    ]);

    setTimeout(() => {
      // Generate random score near base influenced by threshold
      const base = 0.82 + Math.random() * 0.18;
      const score = parseFloat((base * 100).toFixed(1));
      const accepted = base >= threshold;
      const t1 = nowTime();

      setLog((prev) => [
        ...prev,
        { ts: t1, text: "Neural engine comparison started.", cls: "text-slate-500" },
      ]);

      setTimeout(() => {
        const t2 = nowTime();
        setResult({ score, accepted });
        setLog((prev) => [
          ...prev,
          {
            ts: t2,
            text: `Comparison complete. Result: ${(score / 100).toFixed(4)}. ${accepted ? "ACCEPTED." : "REJECTED."}`,
            cls: accepted ? "text-emerald-400" : "text-red-400",
          },
          { ts: t2, text: "Log persisted to immutable ledger.", cls: "text-slate-500" },
        ]);
        setAuthenticating(false);
        addToast(
          accepted
            ? `Identity authenticated — ${score}% confidence.`
            : `Authentication failed — score ${score}% below threshold.`,
          accepted ? "success" : "error"
        );
      }, 800);
    }, 1400);
  };

  const dash = 251.2;
  const offset = dash - (result.score / 100) * dash;
  const accepted = result.accepted;

  return (
    <div className="bg-surface-container-lowest min-h-full p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-end">
          <div>
            <h1 className="font-h2 text-h2 text-on-surface">Verification Mode (1:1)</h1>
            <p className="text-slate-400">
              Validate a person&apos;s identity against their registered biometric template.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <div className="flex items-center gap-2 bg-slate-900 border border-white/10 px-4 py-2 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <span className="text-xs font-medium text-slate-300">SYSTEM: ACTIVE</span>
            </div>
            <button
              onClick={() => addToast("Session history panel coming soon.", "info")}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg transition-all"
            >
              <Icon name="history" className="text-sm" />
              <span className="text-xs font-semibold">SESSION HISTORY</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 lg:gap-8">
          {/* Left */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <div className="glass-card rounded-xl p-6 shadow-xl">
              <label className="font-label-caps text-label-caps text-indigo-400 block mb-3 uppercase tracking-wider">
                Claimed Identity
              </label>
              <div className="relative">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={claimedId}
                  onChange={(e) => setClaimedId(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-lg pl-10 pr-24 py-3 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    MATCHED
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 p-3 bg-white/5 rounded-lg border border-white/5">
                <img
                  src={TEMPLATE_IMG}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover grayscale opacity-60 shrink-0"
                />
                <div>
                  <p className="text-xs text-slate-400">Registered Template</p>
                  <p className="text-sm font-semibold text-on-surface">Alexander Volkov</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-transparent" />
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <label className="font-label-caps text-label-caps text-indigo-400 uppercase tracking-wider">
                    Live Face Capture
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addToast("Camera switched.", "info")}
                      className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                    >
                      <Icon name="switch_camera" className="text-base" />
                    </button>
                    <button
                      onClick={() => addToast("File upload ready.", "info")}
                      className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                    >
                      <Icon name="upload_file" className="text-base" />
                    </button>
                  </div>
                </div>
                <div className="relative aspect-[4/3] bg-slate-950 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center">
                  <img src={CAPTURE_IMG} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-56 h-72 sm:w-64 sm:h-80 border-2 border-indigo-500/50 rounded-[40px] flex items-center justify-center">
                      <div className="w-full h-[2px] bg-indigo-500 shadow-[0_0_15px_#6366f1] absolute top-1/4" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                    <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-indigo-300 font-code border border-indigo-500/30">
                      FOCUS: 0.98 | LIVENESS: PASS
                    </div>
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                      <div className="w-2 h-2 rounded-full bg-indigo-500/40" />
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleAuthenticate}
                  disabled={authenticating}
                  className="w-full mt-6 bg-gradient-to-b from-indigo-400 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-[0_4px_20px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95 transition-all inner-glow-primary disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {authenticating ? (
                    <>
                      <Icon name="sync" className="text-sm animate-spin" />
                      AUTHENTICATING…
                    </>
                  ) : (
                    "AUTHENTICATE IDENTITY"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            {/* Result banner */}
            <div
              className={`glass-card rounded-xl p-6 sm:p-8 border-l-4 ${
                accepted
                  ? "border-l-emerald-500 bg-emerald-500/5"
                  : "border-l-red-500 bg-red-500/5"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                  <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full -rotate-90">
                      <circle className="text-white/5" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="8" />
                      <circle
                        className={accepted ? "text-emerald-500" : "text-red-500"}
                        cx="48" cy="48" fill="transparent" r="40"
                        stroke="currentColor"
                        strokeDasharray={dash}
                        strokeDashoffset={offset}
                        strokeWidth="8"
                        style={{ transition: "stroke-dashoffset 0.6s ease" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-on-surface">{result.score}%</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-widest border ${
                          accepted
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }`}
                      >
                        Decision: {accepted ? "Accept" : "Reject"}
                      </span>
                      <span className="text-slate-500 text-xs font-medium">
                        Verified at {nowTime()} UTC
                      </span>
                    </div>
                    <h3 className="font-h2 text-xl text-on-surface">
                      {accepted ? "Identity Authenticated" : "Authentication Failed"}
                    </h3>
                    <p className="text-slate-400 text-sm">
                      {accepted
                        ? "Subject matches stored profile with high confidence."
                        : "Similarity score is below the configured threshold."}
                    </p>
                  </div>
                </div>
                <Icon
                  name={accepted ? "verified_user" : "gpp_bad"}
                  className={`hidden sm:block text-5xl opacity-40 ${accepted ? "text-emerald-500" : "text-red-500"}`}
                />
              </div>
            </div>

            {/* Metrics bento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="glass-card rounded-xl p-6">
                <label className="font-label-caps text-label-caps text-slate-500 block mb-4 uppercase">
                  Similarity Metrics
                </label>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-slate-400">Confidence Score</span>
                    <span className="text-sm font-bold text-on-surface">{result.score}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${accepted ? "bg-indigo-500" : "bg-red-500"}`}
                      style={{ width: `${result.score}%`, transition: "width 0.6s ease" }}
                    />
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-slate-400">Euclidean Distance</span>
                    <span className="text-sm font-bold text-on-surface">
                      {(1 - result.score / 100).toFixed(3)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500"
                      style={{ width: `${(1 - result.score / 100) * 100 * 2}%`, transition: "width 0.6s ease" }}
                    />
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-xl p-6">
                <label className="font-label-caps text-label-caps text-slate-500 block mb-4 uppercase">
                  Extracted Face
                </label>
                <div className="flex gap-4">
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-white/10 group cursor-zoom-in shrink-0">
                    <img src={EXTRACT_IMG} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Icon name="zoom_in" className="text-white" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">EYES: DETECTED</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">HEAD: FRONT</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">LIGHT: OPTIMAL</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Face landmarks (68 points) captured with 0.4ms latency.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Threshold */}
            <div className="glass-card rounded-xl p-6 bg-indigo-500/5">
              <div className="flex justify-between items-center gap-4 mb-6">
                <div>
                  <label className="font-label-caps text-label-caps text-indigo-400 uppercase tracking-wider">
                    Dynamic Threshold
                  </label>
                  <p className="text-xs text-slate-400 mt-1">
                    Adjust sensitivity to manage False Acceptance Rate (FAR).
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-bold text-on-surface">{threshold.toFixed(2)}</span>
                  <span className="text-[10px] block text-slate-500">
                    {threshold > 0.9 ? "STRICT" : threshold < 0.7 ? "RELAXED" : "OPTIMIZED"}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between mt-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500">Security Priority</span>
                  <span className="text-[10px] font-bold text-rose-400">STRICT</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-slate-500">Speed Priority</span>
                  <span className="text-[10px] font-bold text-indigo-400">RELAXED</span>
                </div>
              </div>
            </div>

            {/* Log */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                <Icon name="terminal" className="text-sm text-slate-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Live Execution Log
                </span>
              </div>
              <div ref={logRef} className="font-code text-[11px] space-y-1.5 h-28 overflow-y-auto">
                {log.map((entry, i) => (
                  <p key={i} className={entry.cls}>
                    <span className="text-indigo-400">[{entry.ts}]</span> {entry.text}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
