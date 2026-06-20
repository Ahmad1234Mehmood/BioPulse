import { useState, useRef, useEffect } from "react";
import Icon from "../components/Icon";
import { useApp } from "../context/AppContext";
import { getEnrolledSubjects, verifyUser } from "../api/services";

const TEMPLATE_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCOkT5ZGqHlWzZWa2kA4zbW4sWuELDFSlih8r4xI8azGjcV1SnZa139zjI3vdOE9xMSpVH98ms24tk2o35uQAy4gtF11G-tE7xx6GNkW_JYHtpcm4rebHKqLlizA-ZlH5Ri8SkGtND_pwUfkGZJ-5UmG7WYFo-2_VtfFEIae4OjBqqOcLr4FozIxVr9B101LrJfHYlzOtp5_tg9EsKyXuDLAkUuUAbchZs7wf50MZgoRGNPzcD3Gwzo2XHBJ2l-8f7IyDI-hl17ubyN";
const CAPTURE_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBLgj7zrIZ45XMSp2C38O75CquZtStmQIALcP_dT-Xig3TSe3a6lCg7-jBEoD_AoZ-0mnNWBRmf3DZpzkovczNO_fpmqfsw-XnLGy22lchXVTPzDCcD9Z5vKTTGp9jlrp3LSwKUV4Xe6w2MLIf67vSUFQin6rqYjatXsDJyA9UhMLJLQoPOrAtD9cG19BA9Gyl2_sDTBef76VF-xzWrWAN3JCjBxCVjHjYBiD8u6azh78gk_xAkNBm-3FqlSApi7AVdFg3-a4U2QpUr";
const EXTRACT_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBPJs7SpJI7LMtDKVKa9pw-gQpxV7ERbvSSwTRB-X6qU_o6ZO8hMM2U30TGQVHvrKzCZ1lcgg9fNvALMv5p3wnuHwsK5OnNbG7FstIBvnhRJ7XVkcHn2lIbf-EgksV6B5JGP15foneFMMZend5dwbwg7Dxq0Q7UBIWiv1c5lz4GC6iuz8au8iIRQyjLnT45lwVA2VxathJRjizY9quAs-dyo5ql-DcFmopJEqAnti09RxlyglF--5FB8zXFQCG5l2Zz65HD1StqbJdC";

const INITIAL_LOG = [
  { ts: "00:00:00", text: "Verification engine ready. Select probe and claimed identity...", cls: "text-slate-500" },
];

function nowTime() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

export default function Verify() {
  const { addToast } = useApp();

  const [threshold, setThreshold] = useState(0.70);
  const [authenticating, setAuthenticating] = useState(false);
  const [result, setResult] = useState(null);
  const [log, setLog] = useState(INITIAL_LOG);
  const [prevAccepted, setPrevAccepted] = useState(null);
  
  // Enrolled subjects & claims state
  const [enrolledSubjects, setEnrolledSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  
  // Files states
  const [probeFile, setProbeFile] = useState(null);
  const [probePreviewUrl, setProbePreviewUrl] = useState(null);
  const [claimFile, setClaimFile] = useState(null);
  const [claimPreviewUrl, setClaimPreviewUrl] = useState(null);

  const logRef = useRef(null);
  const probeInputRef = useRef(null);
  const claimInputRef = useRef(null);

  // Fetch subjects on mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await getEnrolledSubjects();
        if (res.data?.enrolled_users) {
          setEnrolledSubjects(res.data.enrolled_users);
        }
      } catch (err) {
        console.error("Failed to load enrolled subjects for verification", err);
      }
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  useEffect(() => {
    if (result) {
      const isMatch = result.score >= threshold;
      if (prevAccepted !== null && prevAccepted !== isMatch) {
        const t = nowTime();
        setLog((prev) => [
          ...prev,
          {
            ts: t,
            text: `Threshold adjusted to ${threshold.toFixed(2)}. Decision recalculated: ${isMatch ? "ACCEPTED" : "REJECTED"} (Score: ${(result.score * 100).toFixed(1)}%)`,
            cls: isMatch ? "text-emerald-400/90 font-medium animate-pulse" : "text-rose-400/90 font-medium animate-pulse"
          }
        ]);
        addToast(
          isMatch
            ? `Decision updated: ACCEPTED — similarity ${(result.score * 100).toFixed(1)}% is above threshold.`
            : `Decision updated: REJECTED — similarity ${(result.score * 100).toFixed(1)}% is below threshold.`,
          isMatch ? "success" : "error"
        );
      }
      setPrevAccepted(isMatch);
    } else {
      setPrevAccepted(null);
    }
  }, [threshold, result]);

  const handleProbeFileChange = (file) => {
    if (file) {
      setProbeFile(file);
      setProbePreviewUrl(URL.createObjectURL(file));
      addToast(`Probe image "${file.name}" loaded.`, "info");
    }
  };

  const handleClaimFileChange = (file) => {
    if (file) {
      setClaimFile(file);
      setClaimPreviewUrl(URL.createObjectURL(file));
      setSelectedSubject(""); // Clear dropdown if custom claim is uploaded
      addToast(`Custom claim image "${file.name}" loaded.`, "info");
    }
  };

  const handleAuthenticate = async () => {
    if (authenticating) return;
    if (!probeFile) {
      addToast("Please select or upload a probe image.", "warning");
      return;
    }
    if (!selectedSubject && !claimFile) {
      addToast("Please select an enrolled subject OR upload a custom claim image.", "warning");
      return;
    }

    setAuthenticating(true);
    setResult(null);

    const t0 = nowTime();
    const claimName = selectedSubject || `custom file (${claimFile.name})`;
    setLog((prev) => [
      ...prev,
      { ts: t0, text: `Comparing probe against claim: "${claimName}"...`, cls: "text-indigo-400 font-semibold" },
      { ts: t0, text: "Running face pre-processing and embedding extraction...", cls: "text-slate-500" },
    ]);

    try {
      const res = await verifyUser(selectedSubject || "custom_claim", probeFile, claimFile, threshold);
      const data = res.data;
      const t1 = nowTime();
      
      setResult(data);
      
      const isMatch = data.score >= threshold;
      
      setLog((prev) => [
        ...prev,
        { ts: t1, text: `Embedding matching complete. Similarity score: ${data.score.toFixed(4)}`, cls: "text-slate-400" },
        { ts: t1, text: `Dynamic threshold check: ${isMatch ? "PASS" : "FAIL"} (Sensitivity: ${threshold.toFixed(2)})`, cls: isMatch ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold" },
        { ts: t1, text: `Ledger Log: Match status ${isMatch ? "ACCEPTED" : "REJECTED"}.`, cls: "text-slate-500" }
      ]);

      addToast(
        isMatch
          ? `Authenticated successfully — ${(data.score * 100).toFixed(1)}% similarity.`
          : `Authentication failed — score ${(data.score * 100).toFixed(1)}% is below threshold.`,
        isMatch ? "success" : "error"
      );
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.detail || "Verification failed.";
      addToast(errMsg, "error");
      setLog((prev) => [
        ...prev,
        { ts: nowTime(), text: `Verification Error: ${errMsg}`, cls: "text-rose-400 font-bold" }
      ]);
    } finally {
      setAuthenticating(false);
    }
  };

  const scorePercent = result ? result.score * 100 : 0;
  const accepted = result ? (result.score >= threshold) : false;
  const dash = 251.2;
  const offset = dash - (scorePercent / 100) * dash;

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
              onClick={() => {
                setLog([{ ts: nowTime(), text: "Execution logs reset.", cls: "text-slate-500" }]);
                addToast("Logs cleared", "info");
              }}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg transition-all"
            >
              <Icon name="history" className="text-sm" />
              <span className="text-xs font-semibold">CLEAR LOGS</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 lg:gap-8">
          {/* Left */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <div className="glass-card rounded-xl p-6 shadow-xl space-y-4">
              <div>
                <label className="font-label-caps text-label-caps text-indigo-400 block mb-2 uppercase tracking-wider text-xs">
                  Claimed Identity
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setClaimFile(null);
                    setClaimPreviewUrl(null);
                  }}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-lg py-3 px-4 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500 text-white transition-all"
                >
                  <option value="">-- Select Enrolled Subject --</option>
                  {enrolledSubjects.map((sub) => (
                    <option key={sub.subject_id} value={sub.subject_id}>
                      {sub.subject_id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-center text-slate-500 text-xs font-semibold uppercase tracking-wider">- OR -</div>

              <div>
                <label className="font-label-caps text-label-caps text-indigo-400 block mb-2 uppercase tracking-wider text-xs">
                  Custom Claim Image
                </label>
                <input
                  type="file"
                  ref={claimInputRef}
                  onChange={(e) => handleClaimFileChange(e.target.files[0])}
                  accept="image/*"
                  style={{ display: "none" }}
                />
                <button
                  onClick={() => claimInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-white/5 py-2.5 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Icon name="upload_file" className="text-sm" />
                  {claimFile ? `Replace Claim (${claimFile.name})` : "Upload Claim Image"}
                </button>
              </div>

              {(selectedSubject || claimPreviewUrl) && (
                <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg border border-white/5">
                  <img
                    src={
                      selectedSubject
                        ? `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"}/api/v1/enrollment/enrolled/${selectedSubject}/image`
                        : claimPreviewUrl || TEMPLATE_IMG
                    }
                    alt="Template"
                    className="w-12 h-12 rounded-full object-cover shrink-0 border border-white/10"
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Claim Target</p>
                    <p className="text-sm font-semibold text-white truncate">
                      {selectedSubject
                        ? selectedSubject.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                        : "Custom Image Upload"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="glass-card rounded-xl p-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-transparent" />
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <label className="font-label-caps text-label-caps text-indigo-400 uppercase tracking-wider text-xs">
                    Live Face Capture / Probe
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={probeInputRef}
                      onChange={(e) => handleProbeFileChange(e.target.files[0])}
                      accept="image/*"
                      style={{ display: "none" }}
                    />
                    <button
                      onClick={() => probeInputRef.current?.click()}
                      className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all flex items-center gap-1.5"
                    >
                      <Icon name="upload_file" className="text-base" />
                      <span className="text-[10px] font-bold">LOAD FILE</span>
                    </button>
                  </div>
                </div>
                <div
                  onClick={() => probeInputRef.current?.click()}
                  className="relative aspect-[4/3] bg-slate-950 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center cursor-pointer hover:border-indigo-500/50 transition-colors"
                >
                  <img src={probePreviewUrl || CAPTURE_IMG} alt="Probe Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-56 h-72 sm:w-64 sm:h-80 border-2 border-indigo-500/30 rounded-[40px] flex items-center justify-center">
                      <div className="w-full h-[2px] bg-indigo-500/60 shadow-[0_0_15px_#6366f1] absolute top-1/3" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center pointer-events-none">
                    <div className="bg-slate-900/95 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-indigo-300 font-code border border-indigo-500/20">
                      {probeFile ? `PROBE: Loaded (${probeFile.name})` : "NO IMAGE LOADED - CLICK TO BROWSE"}
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
            {result ? (
              <div
                className={`glass-card rounded-xl p-6 sm:p-8 border-l-4 ${
                  accepted
                    ? "border-l-emerald-500 bg-emerald-500/5"
                    : "border-l-rose-500 bg-rose-500/5"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                    <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full -rotate-90">
                        <circle className="text-white/5" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="8" />
                        <circle
                          className={accepted ? "text-emerald-500" : "text-rose-500"}
                          cx="48" cy="48" fill="transparent" r="40"
                          stroke="currentColor"
                          strokeDasharray={dash}
                          strokeDashoffset={offset}
                          strokeWidth="8"
                          style={{ transition: "stroke-dashoffset 0.6s ease" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-sm font-bold text-white">{scorePercent.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-widest border ${
                            accepted
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          Decision: {accepted ? "Accept" : "Reject"}
                        </span>
                        <span className="text-slate-500 text-xs font-medium">
                          Verified threshold: {threshold.toFixed(2)}
                        </span>
                      </div>
                      <h3 className="font-h2 text-xl text-white">
                        {accepted ? "Identity Authenticated" : "Authentication Failed"}
                      </h3>
                      <p className="text-slate-400 text-sm">
                        {accepted
                          ? "Subject matches template identity with acceptable confidence."
                          : "Similarity score is below the configured threshold."}
                      </p>
                    </div>
                  </div>
                  <Icon
                    name={accepted ? "verified_user" : "gpp_bad"}
                    className={`hidden sm:block text-5xl opacity-40 ${accepted ? "text-emerald-500" : "text-rose-500"}`}
                  />
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-xl p-8 text-center text-slate-500 border border-white/5">
                <Icon name="fingerprint" className="text-5xl text-slate-600 mb-3 animate-pulse" />
                <h3 className="font-semibold text-lg text-white mb-1">Verification Status: Pending</h3>
                <p className="text-xs max-w-sm mx-auto">
                  Provide a probe face image and claimed subject ID, then select "Authenticate Identity" to start comparison.
                </p>
              </div>
            )}

            {/* Metrics bento */}
            {result && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="glass-card rounded-xl p-6">
                  <label className="font-label-caps text-label-caps text-slate-500 block mb-4 uppercase text-[10px] font-bold tracking-widest">
                    Similarity Metrics
                  </label>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-xs text-slate-400">Confidence Score</span>
                      <span className="text-sm font-bold text-white">{scorePercent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${accepted ? "bg-indigo-500" : "bg-rose-500"}`}
                        style={{ width: `${scorePercent}%`, transition: "width 0.6s ease" }}
                      />
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-xs text-slate-400">Cosine Distance</span>
                      <span className="text-sm font-bold text-white">
                        {(1 - result.score).toFixed(4)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500"
                        style={{ width: `${(1 - result.score) * 100}%`, transition: "width 0.6s ease" }}
                      />
                    </div>
                  </div>
                </div>
                <div className="glass-card rounded-xl p-6">
                  <label className="font-label-caps text-label-caps text-slate-500 block mb-4 uppercase text-[10px] font-bold tracking-widest">
                    Extracted Probe Face
                  </label>
                  <div className="flex gap-4">
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-slate-900">
                      <img
                        src={result.probe_preview ? `data:image/jpeg;base64,${result.probe_preview}` : EXTRACT_IMG}
                        alt="Probe Crop"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${result.probe_quality?.is_acceptable ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {result.probe_quality?.is_acceptable ? 'QUALITY: OK' : 'QUALITY: DEGRADED'}
                        </span>
                        <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                          RES: 160x160
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Landmarks extracted. Face cropped, centered, and aligned with neural network matrix coordinates.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quality Diagnostics Card */}
            {result && (result.probe_quality || result.claim_quality) && (
              <div className="glass-card rounded-xl p-6 border border-white/5">
                <label className="font-label-caps text-slate-400 block mb-4 uppercase text-xs tracking-wider font-bold">
                  🖼️ Image Quality Diagnostics
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Probe Quality */}
                  {result.probe_quality && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 tracking-wider">PROBE FACE QUALITY</span>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${result.probe_quality.is_acceptable ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {result.probe_quality.is_acceptable ? 'ACCEPTABLE' : 'DEGRADED'}
                        </span>
                      </div>
                      <div className="space-y-2 text-xs text-slate-300 font-mono">
                        <div className="flex justify-between p-2 rounded bg-slate-950/30">
                          <span>Sharpness (Blur):</span>
                          <span className={result.probe_quality.is_sharp ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                            {result.probe_quality.blur_score} {result.probe_quality.is_sharp ? '✓' : '✗'}
                          </span>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-slate-950/30">
                          <span>Brightness:</span>
                          <span className={result.probe_quality.is_well_exposed ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                            {result.probe_quality.exposure_score} {result.probe_quality.is_well_exposed ? '✓' : '✗'}
                          </span>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-slate-950/30">
                          <span>Contrast:</span>
                          <span className={result.probe_quality.has_contrast ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                            {result.probe_quality.contrast_score} {result.probe_quality.has_contrast ? '✓' : '✗'}
                          </span>
                        </div>
                      </div>
                      {result.probe_quality.reasons?.length > 0 && (
                        <div className="text-[10px] text-amber-400 italic bg-amber-500/5 border border-amber-500/10 p-2 rounded">
                          ⚠️ {result.probe_quality.reasons.join(', ')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Claim Quality */}
                  {result.claim_quality && (
                    <div className="space-y-3 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 tracking-wider">CLAIM FACE QUALITY</span>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${result.claim_quality.is_acceptable ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {result.claim_quality.is_acceptable ? 'ACCEPTABLE' : 'DEGRADED'}
                        </span>
                      </div>
                      <div className="space-y-2 text-xs text-slate-300 font-mono">
                        <div className="flex justify-between p-2 rounded bg-slate-950/30">
                          <span>Sharpness (Blur):</span>
                          <span className={result.claim_quality.is_sharp ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                            {result.claim_quality.blur_score} {result.claim_quality.is_sharp ? '✓' : '✗'}
                          </span>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-slate-950/30">
                          <span>Brightness:</span>
                          <span className={result.claim_quality.is_well_exposed ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                            {result.claim_quality.exposure_score} {result.claim_quality.is_well_exposed ? '✓' : '✗'}
                          </span>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-slate-950/30">
                          <span>Contrast:</span>
                          <span className={result.claim_quality.has_contrast ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                            {result.claim_quality.contrast_score} {result.claim_quality.has_contrast ? '✓' : '✗'}
                          </span>
                        </div>
                      </div>
                      {result.claim_quality.reasons?.length > 0 && (
                        <div className="text-[10px] text-amber-400 italic bg-amber-500/5 border border-amber-500/10 p-2 rounded">
                          ⚠️ {result.claim_quality.reasons.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Threshold Slider */}
            <div className="glass-card rounded-xl p-6 bg-indigo-500/5">
              <div className="flex justify-between items-center gap-4 mb-6">
                <div>
                  <label className="font-label-caps text-label-caps text-indigo-400 uppercase tracking-wider text-xs">
                    Dynamic Sensitivity Threshold
                  </label>
                  <p className="text-xs text-slate-400 mt-1">
                    Adjust acceptance threshold locally to explore match sensitivity.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-bold text-white">{threshold.toFixed(2)}</span>
                  <span className="text-[10px] block text-slate-500">
                    {threshold > 0.8 ? "STRICT" : threshold < 0.6 ? "RELAXED" : "OPTIMIZED"}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0.40"
                max="0.95"
                step="0.01"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between mt-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500">High Security (FAR Low)</span>
                  <span className="text-[10px] font-bold text-rose-400">STRICT (0.85+)</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-slate-500">Permissive (FRR Low)</span>
                  <span className="text-[10px] font-bold text-indigo-400">RELAXED (0.50-)</span>
                </div>
              </div>
            </div>

            {/* Execution Log */}
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
