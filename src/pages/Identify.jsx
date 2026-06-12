import { useState } from "react";
import Icon from "../components/Icon";
import { useApp } from "../context/AppContext";

const PRIMARY_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBEoJXX6acW8xU-jwACDzhpJLThiUOTuCA0fdkhYx6WchhktpmBY_EMGZ0XWJuH-JXgR3GMz-pGrHA-UwS9TveLb39KfRU9WBl5iguXF20PeQMBe5yy_64VUHvyDL8DI-Rjv-6kFOY5V8Xn_eD5czJ6Xk1i9Vutsfm4c49uCNifZA2l-261JKNVqDDcdEmwon_fs6cJFuq-kjxHNii8_ZDijzBUXFFtRXukNGDvlmgrlV5x4XOH8UdZEUKYOxJ4BYiNjdO8g3mnPaPF";

const MATCH_IMGS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB7630tz5AsIm58dSjFz-qD_aQPUox0edMi1BolH0zwz-p7kP5o8lDayWq6VCOo-2byw3dJT1eNnEX5BW0KzdXbiJvA0ewaR_pfFK-8UB8EUNQLuI0lnzfRtGTVcZKdUOzTxLO-0ZPoObX_SAq4D7vsuZrGYR3iCQ5Tw1dv86o0kJbx0_8HfYpADDGSn0xf3ckDEd0ogca5aueKBqHUMSwJUFvHTBX-Y3KE3HgUhh5aHvIko-w42zwRUWELepZibxo-ZOEKZyUd17om",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC_DT3uL_ZO8ajUxyImB3OOy5GdOe9wPoUkRhYHhaS_KiA8-UqJQQcn7KeX3X7of_YBXFf9FEHGylof7XNpSkOsly545R4tEOTvhZ5GX4xhJt2vwBJBi3LmkV8I-EhHoZu6Jkf1sa99JvpiVmXxWFntOZKZtptp7axrKwpeNODvKcRzBqbDnX2tmNUIMg9oaNi6HzCIBKcXLSXXerkzxPF1BfVDar3SkicKIRVUyhwIltVvq5g7BAn7WMu8OceLg8q54yvx5Ih4brrw",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBFp6qDxnuHx9efcE4RU9KUbZ2G4fTMD_zJKcy-ovx9figMfTk2FuXKbFQlo3u_zleVUgx9YQgANIOSAYN-0-eKldE_zumMVc0zvcPlv_YeaM9cPKd5qwJ0RDO1s8b-qrJiyxoimjdDaSwSGuKvP1R-KC8cll_fJu2Wn3dzG4sFmYJZRWlrYG57SSCFKIcyIw7ma53l67VjVEu0KsFl0bwPeDD6Be0TxlVfBDAhiTpAGYCIes2bxeIw8p4D3JGpRlywgyeyrwmNmACZ",
];

const BASE_MATCHES = [
  { rank: "#2", name: "David Miller",      sub: "Last seen: London HQ (2h ago)",  score: 84.5, dim: false, img: MATCH_IMGS[0] },
  { rank: "#3", name: "James Arclight",    sub: "Department: Infrastructure",     score: 72.1, dim: false, img: MATCH_IMGS[1] },
  { rank: "#4", name: "Elena S. Sterling", sub: "Related Kin (Probable)",         score: 68.3, dim: true,  img: MATCH_IMGS[2] },
];

const TOP_K_OPTIONS = ["Top 5 Matches", "Top 10 Matches", "Top 20 Matches"];

export default function Identify() {
  const { addToast } = useApp();

  const [threshold, setThreshold] = useState(0.85);
  const [topK, setTopK] = useState(TOP_K_OPTIONS[0]);
  const [searching, setSearching] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [matches, setMatches] = useState(BASE_MATCHES);
  const [primaryScore, setPrimaryScore] = useState(99.82);
  const [searchCount, setSearchCount] = useState(0);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    setHasImage(true);
    addToast("Reference image loaded. Ready to search.", "info");
  };

  const handleUploadClick = () => {
    setHasImage(true);
    addToast("Reference image loaded. Ready to search.", "info");
  };

  const handleSearch = () => {
    if (searching) return;
    setSearching(true);

    setTimeout(() => {
      const jitter = () => +(Math.random() * 2 - 1).toFixed(1);
      const newScore = Math.min(99.99, Math.max(95, primaryScore + jitter()));
      setPrimaryScore(parseFloat(newScore.toFixed(2)));
      setMatches(
        BASE_MATCHES.map((m) => ({
          ...m,
          score: Math.min(99, Math.max(50, m.score + jitter())),
        }))
      );
      setSearchCount((c) => c + 1);
      setSearching(false);
      setHasImage(true);
      addToast(`Search complete. ${parseInt(topK)} result${parseInt(topK) > 1 ? "s" : ""} found across 12.4M records.`, "success");
    }, 2000);
  };

  const handleConfirmIdentity = () => {
    addToast("Identity confirmed and flagged for review.", "success");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
      <section className="flex flex-col gap-2">
        <h1 className="font-h1 text-h2 text-white">
          Identification <span className="text-indigo-400">(1:N)</span>
        </h1>
        <p className="text-slate-400 max-w-2xl">
          Perform high-precision search across the entire neural database. Upload a reference image to find the
          closest topological matches within milliseconds.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left */}
        <div className="lg:col-span-5 space-y-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={handleUploadClick}
            className={`glass-panel rounded-xl p-6 flex flex-col items-center justify-center border-dashed border-2 h-80 sm:h-96 relative overflow-hidden group cursor-pointer transition-all ${
              dragOver
                ? "border-indigo-500 bg-indigo-500/10"
                : hasImage
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-indigo-500/30 hover:border-indigo-500/60"
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 pointer-events-none" />
            <div className="flex flex-col items-center gap-4 text-center">
              {hasImage ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                    <Icon name="check_circle" fill className="text-4xl text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Image loaded</p>
                    <p className="text-xs text-slate-500 mt-1">Ready for 1:N search — click to change image</p>
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
                    <p className="text-white font-semibold">Drop image here or click to upload</p>
                    <p className="text-xs text-slate-500 mt-1">Supports JPG, PNG, RAW (Max 20MB)</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 mt-4">
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); handleUploadClick(); }}
                      className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Icon name="upload_file" className="text-sm" /> Browse Files
                    </button>
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); handleUploadClick(); }}
                      className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-white"
                    >
                      <Icon name="videocam" className="text-sm" /> Live Capture
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
                    min="0"
                    max="1"
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
                <select
                  value={topK}
                  onChange={(e) => setTopK(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg text-xs py-1 px-2 focus:ring-indigo-500"
                >
                  {TOP_K_OPTIONS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="w-full py-3 bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white rounded-lg font-bold text-sm glow-primary transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {searching ? (
                <>
                  <Icon name="sync" className="text-sm animate-spin" />
                  Searching {(12.4 + searchCount * 0.1).toFixed(1)}M records…
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
          <div className="relative">
            <div className="absolute -top-3 left-4 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-full z-10 shadow-lg shadow-indigo-500/20">
              PRIMARY MATCH (RANK 1)
            </div>
            <div className="glass-panel rounded-2xl p-6 border-indigo-500/40 bg-indigo-500/[0.03] overflow-hidden flex flex-col md:flex-row gap-6 items-center">
              <div className="w-40 h-40 sm:w-48 sm:h-48 flex-shrink-0 relative">
                <div className="absolute inset-0 border-2 border-indigo-500/50 rounded-xl m-2 animate-pulse pointer-events-none" />
                <img
                  src={PRIMARY_IMG}
                  alt=""
                  className="w-full h-full object-cover rounded-xl shadow-2xl border border-white/10"
                />
              </div>
              <div className="flex-1 space-y-4 text-center md:text-left">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-white tracking-tight">Alexander V. Sterling</h3>
                  <p className="text-slate-400 text-sm">UID: BK-99420-CORE</p>
                </div>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Similarity</span>
                    <span className="text-2xl font-bold text-indigo-400 font-h1">{primaryScore}%</span>
                  </div>
                  <div className="w-px h-10 bg-white/10 hidden md:block" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Latency</span>
                    <span className="text-2xl font-bold text-white font-h1">
                      {searching ? "—" : `${11 + searchCount}ms`}
                    </span>
                  </div>
                  <div className="w-px h-10 bg-white/10 hidden md:block" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Status</span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mt-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Verified
                    </span>
                  </div>
                </div>
                <div className="pt-2 flex gap-3 justify-center md:justify-start">
                  <button
                    onClick={handleConfirmIdentity}
                    className="flex-1 py-2 bg-indigo-500 text-white rounded-lg text-sm font-semibold hover:bg-indigo-600 transition-colors"
                  >
                    Confirm Identity
                  </button>
                  <button
                    onClick={() => addToast("Profile opened in new tab (demo).", "info")}
                    className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <Icon name="open_in_new" className="text-sm" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Ranked list */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <span className="font-label-caps text-slate-400">Additional Matches (Rank 2–5)</span>
              <button
                onClick={() => addToast("Full match list view coming soon.", "info")}
                className="text-xs text-indigo-400 font-semibold hover:underline"
              >
                View All Matches
              </button>
            </div>
            <div className="space-y-3">
              {matches.map((m) => (
                <div
                  key={m.rank}
                  className={`glass-panel p-4 rounded-xl flex items-center justify-between gap-3 group hover:bg-white/5 transition-colors cursor-pointer ${
                    m.dim ? "opacity-80" : ""
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="font-code text-slate-600 font-bold w-4">{m.rank}</span>
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0">
                      <img
                        src={m.img}
                        alt=""
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{m.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{m.sub}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-300">{m.score.toFixed(1)}%</p>
                    <div className="w-20 sm:w-24 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-slate-500" style={{ width: `${m.score}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                <Icon name="database" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Records Scanned</p>
                <p className="text-lg font-bold text-white">{(12.4 + searchCount * 0.1).toFixed(1)}M</p>
              </div>
            </div>
            <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                <Icon name="security" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">FAR Rate</p>
                <p className="text-lg font-bold text-white">
                  {(0.0001 * (1 - threshold + 0.85)).toFixed(4)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
