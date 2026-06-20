import { useState, useRef, useEffect } from "react";
import Icon from "../components/Icon";
import { useApp } from "../context/AppContext";
import { identifyUser } from "../api/services";

const PRIMARY_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBEoJXX6acW8xU-jwACDzhpJLThiUOTuCA0fdkhYx6WchhktpmBY_EMGZ0XWJuH-JXgR3GMz-pGrHA-UwS9TveLb39KfRU9WBl5iguXF20PeQMBe5yy_64VUHvyDL8DI-Rjv-6kFOY5V8Xn_eD5czJ6Xk1i9Vutsfm4c49uCNifZA2l-261JKNVqDDcdEmwon_fs6cJFuq-kjxHNii8_ZDijzBUXFFtRXukNGDvlmgrlV5x4XOH8UdZEUKYOxJ4BYiNjdO8g3mnPaPF";


export default function Identify() {
  const { addToast } = useApp();

  const [threshold, setThreshold] = useState(0.70);
  const [searching, setSearching] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [prevMatched, setPrevMatched] = useState(null);

  // File state
  const [probeFile, setProbeFile] = useState(null);
  const [probePreviewUrl, setProbePreviewUrl] = useState(null);

  // Results state
  const [results, setResults] = useState(null);
  const [searchLatency, setSearchLatency] = useState(0);

  const fileInputRef = useRef(null);

  const handleFileChange = (file) => {
    if (file) {
      setProbeFile(file);
      setProbePreviewUrl(URL.createObjectURL(file));
      setResults(null); // Clear previous results
      addToast(`Probe image "${file.name}" loaded.`, "info");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSearch = async () => {
    if (!probeFile) {
      addToast("Please upload or select a probe image.", "warning");
      return;
    }
    if (searching) return;

    setSearching(true);
    setResults(null);
    const startTime = performance.now();

    try {
      const res = await identifyUser(probeFile, threshold);
      const endTime = performance.now();
      setSearchLatency(Math.round(endTime - startTime));

      if (res.data?.status === "success") {
        setResults(res.data);
        const matchCount = res.data.matches?.length || 0;
        addToast(`Search complete. Found ${matchCount} matching templates.`, "success");
      }
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.detail || "Identification search failed.", "error");
    } finally {
      setSearching(false);
    }
  };

  const handleConfirmIdentity = () => {
    addToast("Identity confirmed and logged to security database.", "success");
  };

  // Extract primary match and list matches
  const allMatches = results?.matches || [];
  const rawPrimaryMatch = allMatches.length > 0 ? allMatches[0] : null;
  const matches = allMatches.filter((m) => m.score >= threshold);
  const primaryMatch = matches.length > 0 ? matches[0] : null;
  const secondaryMatches = matches.slice(1);
  const matchedOverThreshold = primaryMatch && (primaryMatch.score >= threshold);

  useEffect(() => {
    if (rawPrimaryMatch) {
      const isMatch = rawPrimaryMatch.score >= threshold;
      if (prevMatched !== null && prevMatched !== isMatch) {
        addToast(
          isMatch
            ? `Search decision updated: MATCH ACCEPTED for ${rawPrimaryMatch.subject_id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} (${(rawPrimaryMatch.score * 100).toFixed(1)}%)`
            : `Search decision updated: NO MATCH (Highest candidate is below threshold)`,
          isMatch ? "success" : "error"
        );
      }
      setPrevMatched(isMatch);
    } else {
      setPrevMatched(null);
    }
  }, [threshold, rawPrimaryMatch]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
      <section className="flex flex-col gap-2">
        <h1 className="font-h1 text-h2 text-white">
          Identification <span className="text-indigo-400">(1:N)</span>
        </h1>
        <p className="text-slate-400 max-w-2xl">
          Perform high-precision search across the LFW Dataset. Upload a reference image to find the
          closest topological matches within milliseconds.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left */}
        <div className="lg:col-span-5 space-y-6">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileChange(e.target.files[0])}
            accept="image/*"
            style={{ display: "none" }}
          />
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`glass-panel rounded-xl p-6 flex flex-col items-center justify-center border-dashed border-2 h-80 sm:h-96 relative overflow-hidden group cursor-pointer transition-all ${dragOver
              ? "border-indigo-500 bg-indigo-500/10"
              : probePreviewUrl
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-indigo-500/30 hover:border-indigo-500/60"
              }`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 pointer-events-none" />
            <div className="flex flex-col items-center gap-4 text-center">
              {probePreviewUrl ? (
                <>
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-emerald-500/30 bg-slate-900 shadow-md">
                    <img src={probePreviewUrl} alt="Probe" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-emerald-400 font-semibold">Probe image loaded</p>
                    <p className="text-xs text-slate-500 mt-1">Ready for 1:N search — click to replace image</p>
                  </div>
                </>
              ) : dragOver ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/40">
                    <Icon name="download" className="text-4xl text-indigo-400" />
                  </div>
                  <p className="text-indigo-400 font-semibold">Release to load image</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-slate-950 flex items-center justify-center border border-white/10 group-hover:border-indigo-500/50 transition-colors">
                    <Icon name="add_a_photo" className="text-4xl text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Drop probe image here or click to upload</p>
                    <p className="text-xs text-slate-500 mt-1">Supports JPG, PNG (Max 20MB)</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mt-4">
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-white border border-white/5"
                    >
                      <Icon name="upload_file" className="text-sm" /> Browse Files
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="glass-panel rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-label-caps text-slate-400">Search Configuration</span>
              <Icon name="tune" className="text-indigo-400 text-lg" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">
                  Similarity Threshold
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0.4"
                    max="0.9"
                    step="0.01"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="flex-1 accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none"
                  />
                  <span className="text-xs font-code text-indigo-400 w-8 text-right">
                    {threshold.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">
                  Top-K Results
                </label>
                <div className="w-full bg-slate-950 border border-white/10 rounded-lg text-xs py-2.5 px-3 text-slate-400 font-semibold select-none">
                  Top 5 Matches
                </div>
              </div>
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !probeFile}
              className="w-full py-3 bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white rounded-lg font-bold text-sm glow-primary transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {searching ? (
                <>
                  <Icon name="sync" className="text-sm animate-spin" />
                  Searching neural database...
                </>
              ) : (
                "Initialize 1:N Search"
              )}
            </button>
          </div>
        </div>

        {/* Right */}
        <div className="lg:col-span-7 space-y-6">
          {/* Rank 1 */}
          {results ? (
            primaryMatch ? (
              <div className="relative">
                <div className="absolute -top-3 left-4 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-full z-10 shadow-lg shadow-indigo-500/20">
                  PRIMARY MATCH (RANK 1)
                </div>
                <div className={`glass-panel rounded-2xl p-6 border-2 overflow-hidden flex flex-col md:flex-row gap-6 items-center ${matchedOverThreshold ? 'border-emerald-500/40 bg-emerald-500/[0.02]' : 'border-rose-500/40 bg-rose-500/[0.02]'}`}>
                  <div className="w-40 h-40 sm:w-48 sm:h-48 flex-shrink-0 relative bg-slate-900 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
                    <img
                      src={results.probe_preview ? `data:image/jpeg;base64,${results.probe_preview}` : PRIMARY_IMG}
                      alt="Extracted Probe Face"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-4 text-center md:text-left min-w-0">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-bold text-white truncate">
                        {primaryMatch.subject_id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </h3>
                      <p className="text-slate-400 text-sm truncate">UID: {primaryMatch.subject_id.toUpperCase()}</p>
                    </div>
                    <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Similarity</span>
                        <span className={`text-2xl font-bold font-h1 ${matchedOverThreshold ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {(primaryMatch.score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-px h-10 bg-white/10 hidden md:block" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Latency</span>
                        <span className="text-2xl font-bold text-white font-h1">
                          {searchLatency}ms
                        </span>
                      </div>
                      <div className="w-px h-10 bg-white/10 hidden md:block" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Decision</span>
                        <span className={`flex items-center gap-1.5 text-xs font-bold mt-2 ${matchedOverThreshold ? 'text-emerald-400' : 'text-rose-400'}`}>
                          <span className={`w-2 h-2 rounded-full ${matchedOverThreshold ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                          {matchedOverThreshold ? "Match (Accept)" : "No Match (Reject)"}
                        </span>
                      </div>
                    </div>

                    {/* Probe Quality Indicators */}
                    {results.probe_quality && (
                      <div className="pt-2 border-t border-white/5 space-y-1.5 text-left">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-slate-500">PROBE IMAGE QUALITY</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${results.probe_quality.is_acceptable ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {results.probe_quality.is_acceptable ? 'ACCEPTABLE' : 'DEGRADED'}
                          </span>
                        </div>
                        <div className="flex gap-2 text-[10px] font-mono text-slate-400">
                          <span>Blur: <span className={results.probe_quality.is_sharp ? 'text-emerald-400' : 'text-amber-400'}>{results.probe_quality.blur_score}</span></span>
                          <span>Exposure: <span className={results.probe_quality.is_well_exposed ? 'text-emerald-400' : 'text-amber-400'}>{results.probe_quality.exposure_score}</span></span>
                          <span>Contrast: <span className={results.probe_quality.has_contrast ? 'text-emerald-400' : 'text-amber-400'}>{results.probe_quality.contrast_score}</span></span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex gap-3 justify-center md:justify-start">
                      <button
                        onClick={handleConfirmIdentity}
                        className="flex-1 py-2 bg-indigo-500 text-white rounded-lg text-sm font-semibold hover:bg-indigo-600 transition-colors"
                      >
                        Confirm Identity
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-panel rounded-2xl p-8 text-center text-slate-500 border border-white/5">
                <Icon name="search_off" className="text-5xl text-slate-600 mb-3" />
                <h3 className="font-semibold text-lg text-white mb-1">No Matches Found</h3>
                <p className="text-xs max-w-sm mx-auto">
                  The biometric matcher completed scanning but no templates matched the probe embedding.
                </p>
              </div>
            )
          ) : (
            <div className="glass-panel rounded-2xl p-8 text-center text-slate-500 border border-white/5">
              <Icon name="search_check" className="text-5xl text-slate-600 mb-3 animate-pulse" />
              <h3 className="font-semibold text-lg text-white mb-1">1:N Identification Status: Pending</h3>
              <p className="text-xs max-w-sm mx-auto">
                Load a probe face image, configure dynamic settings, and initialize the search to compare against enrolled templates.
              </p>
            </div>
          )}

          {/* Ranked list */}
          {results && secondaryMatches.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="font-label-caps text-slate-400">Additional Matches (Rank 2–5)</span>
              </div>
              <div className="space-y-3">
                {secondaryMatches.map((m) => {
                  const mOverThreshold = m.score >= threshold;
                  return (
                    <div
                      key={m.rank}
                      className="glass-panel p-4 rounded-xl flex items-center justify-between gap-3 group hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="font-code text-slate-600 font-bold w-4">#{m.rank}</span>
                        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center shrink-0">
                          <Icon name="person" className="text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {m.subject_id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">UID: {m.subject_id.toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${mOverThreshold ? 'text-indigo-400' : 'text-slate-500'}`}>
                          {(m.score * 100).toFixed(1)}%
                        </p>
                        <div className="w-20 sm:w-24 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                          <div className={`h-full ${mOverThreshold ? 'bg-indigo-500' : 'bg-slate-600'}`} style={{ width: `${m.score * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                <Icon name="database" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Search Latency</p>
                <p className="text-lg font-bold text-white">{results ? `${searchLatency}ms` : "—"}</p>
              </div>
            </div>
            <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                <Icon name="security" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Sensitivity Threshold</p>
                <p className="text-lg font-bold text-white">
                  {(threshold * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
