import { useState, useRef } from "react";
import Icon from "../components/Icon";
import { useApp } from "../context/AppContext";

const PREVIEW =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDK57T6AA3Wc0sHzBwUXgU289gUqq23gZWK9NFr79gR_hpLitqkhVX9zly5y8CevG9-ODKMbsCthp8RflLR-TJiiS5AZ7SDanhQfngu7ESiVlhVEi6Lo5fA-OQKoy5uyYZMVTcHWavI0-C24U1PDQ-49WlRFk8wq-zfS1LnTr83VC_lHV263WwHEnnK9J_hSQHpjGiPX0-bft_4V6cQcWcaupRWxRTJ6WxHE_5QnaAGKwpx6zJ3qjRPy1MVSORmFbNrqZxlP6E3iK1R";

const ACCESS_TIERS = [
  "Standard Personnel",
  "Privileged Admin",
  "Executive Access",
  "Visitor - Temporary",
];

const INITIAL_REGISTRY = [
  { name: "Sarah Chen",     id: "BP-99210", ago: "2m ago",  dot: "bg-emerald-500", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDQ1NELyfxVDyzmgsGhMBDale5QSHpH_XmucFqcIyzGc21n4pxMWdEjshkaU1Q7evr06NeWO7K12zpEpvNvSkJ_aXg6hP4Xfg5vRbTFcBumfKESCa17BT-GZgUt6SyXMBrBXI1SIPJLs2fIJB_Df2UrJodpPUsGLQxBgpnmwbwivWd3wF8wsQRXzxEL5GNn7Jnk7kzxcihX7527_A7SrxCyFUZ2bV2_Atu1ce_VXf8GDdo5Ye7cVD8CAubsofCwkR8JzuGkxYAdxjyY" },
  { name: "David Miller",   id: "BP-99185", ago: "45m ago", dot: "bg-emerald-500", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAWoGBi5lsu-cBeBAOQE3SLq2ZhRM3P4OfmB9rEaabvDh1bMT34zGMHWMst_Zj5WWyCY2tXAj_QdF6DhOmOLWVt8QpJGQdLjwXOY3NisGVxoIlVJe7GmEv9n4JShwGPlsPLj49DwBmPxQ5xaUSFMBFoCAqKngBBjcr3SOS-Ks777b-8SNGw6xyB1VJbfJDBDZydZQDis9p4m35gtsOs2_yNE9_jnHMbXnKy_FLqq22GERRBKeV3KBIo9T794VsBnh2jM_5rlg7TnXbV" },
  { name: "Elena Rodriguez",id: "BP-99172", ago: "2h ago",  dot: "bg-emerald-500", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDmmXCRKeJ06oCWuvknVI7e6RiSSclO_003XUKeVI9Ol-0FsWyG36DtDex2B6hfNr8L4FYCaozCmkAF9crmprD3ve6i8NIlWgcYtG5hk2AldpoJUTfXXhKOWuREZGLFuyrjgupRWWLtZQW1klrVissdYaRY5ysMfYK9MtvA_vsqQ82OCyUl7zdhXNZK7Wpk0m38oqo8fY_eRgUqPZn1Fz3TAGe8_oPob7KX3_4wjhi2SMTUYDsYcZ-U96UUtqz9QTzgj_dAqC0pKg08" },
  { name: "James Wilson",   id: "BP-99150", ago: "5h ago",  dot: "bg-amber-500",   img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDK2HWdP3dRZrtXFoZtll0nKw6J8KCKHJqWq-OQu3FGZJOLrtU04QN_O8jBiHMdtHbcCn2tPaBXgpXKLYG0X-F22MT6_5DRK9b5LfYKqIRjgVHRJBB6OaTg7sQETGpxw8mZSDIQ6Yj9Ab1VF7vUJZzrMPJq7btiG6YiLYBOtwVtGcx64ZL-jMpCUNDRH1xIv6igdNeWbMJqqRPecmKVW_EhVam54LnnWMv89o0q1ty32h5bZNGxCBfXw-LZy6k1KybFbqO_cbu5h4Ql" },
  { name: "Sophie Taylor",  id: "BP-99142", ago: "8h ago",  dot: "bg-emerald-500", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA_avT819AT7b_k1PiKqi8qpAHbsoZvKmYRSNs5MEIt1bzU4ISxVG8BQcqA0gDuIBAhuwLELGVsJ1-EvOmnW47wrk8lIHZb9zIAw3WUYxiTpgfdzG0DUxYSoiim4uvOlF-0XfmMLd-fsreT6sJzHOynqM9-zqGak28q5jAUa_H1PGPJ0bhxXN03V1t3fqXAkfNQcfCBRTbN16PESIFUT7vCoe7A8qD6EH4rQch7c4SYaHkIBI468hN7KA6DXTt_2C_cfExBrvYF8yvB" },
  { name: "Robert Vance",   id: "BP-99131", ago: "1d ago",  dot: "bg-slate-600",   img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwAdRIVajNVfVOsdGuBGt76vEc9qNzaemfkI56tj_Ix0ee4PGRKTSibcM7mIMIf5si7v_i19Ld6CuyAvhZhH_yhEj54R4_UsF_X8aGtJSExVpqXp8Ey0Hhvw6aABZBlT3XNX8GaF96xOqN-52R9245IGiXyDZPuEm6TGTeHm0BVFSh0GpqSVm2LezLwUz2K0gYcxN4lFWnSR8H_L83VXZpOVJiJPHQA88tcNMPTCvxykDeEL33Al5Gy1uPVMv6gdDnnXflHtzn4Nr4" },
];

const TABS = ["All", "Recent", "Flagged"];

export default function Enroll() {
  const { addToast } = useApp();

  // Form state
  const [name, setName] = useState("");
  const [tier, setTier] = useState(ACCESS_TIERS[0]);
  const [enrolling, setEnrolling] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [lastEnrolled, setLastEnrolled] = useState("");

  // Registry state
  const [registry, setRegistry] = useState(INITIAL_REGISTRY);
  const [filter, setFilter] = useState("All");
  const [menuOpen, setMenuOpen] = useState(null);

  // Dropzone state
  const [dragOver, setDragOver] = useState(false);
  const [imageReady, setImageReady] = useState(true);

  const idRef = useRef(99300);

  const filteredRegistry =
    filter === "Recent"
      ? registry.slice(0, 3)
      : filter === "Flagged"
      ? registry.filter((r) => r.dot === "bg-amber-500" || r.dot === "bg-slate-600")
      : registry;

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    setImageReady(true);
    addToast("Image loaded for detection analysis.", "info");
  };

  const handleEnroll = () => {
    if (!name.trim()) {
      addToast("Please enter a Subject Identity before enrolling.", "warning");
      return;
    }
    setEnrolling(true);
    setTimeout(() => {
      const newId = `BP-${++idRef.current}`;
      setRegistry((prev) => [
        { name: name.trim(), id: newId, ago: "just now", dot: "bg-emerald-500", img: null },
        ...prev,
      ]);
      setLastEnrolled(name.trim());
      setShowBanner(true);
      setName("");
      setTier(ACCESS_TIERS[0]);
      setEnrolling(false);
    }, 1600);
  };

  const handleDelete = (id) => {
    setRegistry((prev) => prev.filter((r) => r.id !== id));
    setMenuOpen(null);
    addToast("Subject removed from registry.", "info");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Success banner */}
      {showBanner && (
        <div className="mb-6 lg:mb-8 flex items-start sm:items-center justify-between gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 rounded-full p-1 flex items-center justify-center shrink-0">
              <Icon name="check_circle" fill className="text-white text-lg" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-400">Enrollment Successful</p>
              <p className="text-xs text-emerald-400/70">
                Subject &ldquo;{lastEnrolled}&rdquo; has been added to the secure registry.
              </p>
            </div>
          </div>
          <button onClick={() => setShowBanner(false)}>
            <Icon name="close" className="text-emerald-400/50 cursor-pointer hover:text-emerald-400 shrink-0" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Form */}
        <section className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-5 sm:p-8 rounded-2xl">
            <div className="mb-8">
              <h1 className="font-h2 text-h2 text-white mb-2">Subject Enrollment</h1>
              <p className="text-on-surface-variant font-body text-sm">
                Onboard new identities to the neural biometric database with precision mapping.
              </p>
            </div>
            <div className="space-y-6">
              {/* Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => { setImageReady(true); addToast("Image loaded for detection analysis.", "info"); }}
                className={`group relative border-2 border-dashed rounded-2xl p-6 sm:p-10 transition-all bg-slate-950/30 flex flex-col items-center justify-center gap-4 cursor-pointer ${
                  dragOver
                    ? "border-indigo-500/80 bg-indigo-500/5"
                    : "border-white/10 hover:border-indigo-500/50"
                }`}
              >
                <div className={`w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center transition-transform ${dragOver ? "scale-125" : "group-hover:scale-110"}`}>
                  <Icon name={dragOver ? "download" : "cloud_upload"} className="text-indigo-400 text-3xl" />
                </div>
                <div className="text-center">
                  {dragOver ? (
                    <p className="text-indigo-400 font-semibold">Release to load image</p>
                  ) : (
                    <>
                      <p className="text-white font-semibold">
                        Drop image here or <span className="text-indigo-400">browse</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        High-resolution JPEG or PNG preferred (min 600px)
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Capture buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setImageReady(true); addToast("Live capture initialized.", "info"); }}
                  className="flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 border border-white/5 p-4 rounded-xl transition-all group"
                >
                  <Icon name="photo_camera" className="text-slate-400 group-hover:text-indigo-400" />
                  <span className="text-sm font-semibold text-white">Live Capture</span>
                </button>
                <div className="flex items-center justify-center gap-3 bg-slate-800/40 border border-white/5 p-4 rounded-xl cursor-not-allowed grayscale">
                  <Icon name="video_camera_front" className="text-slate-600" />
                  <span className="text-sm font-semibold text-slate-600">3D Scan</span>
                </div>
              </div>

              {/* Inputs */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-label-caps text-slate-400 uppercase tracking-wider">
                    Subject Identity
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEnroll()}
                    placeholder="e.g. Marcus Thorne"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-3 px-4 text-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none placeholder:text-slate-600 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-label-caps text-slate-400 uppercase tracking-wider">
                    Access Tier
                  </label>
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-3 px-4 text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  >
                    {ACCESS_TIERS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-slate-950/50 rounded-2xl p-4 sm:p-6 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-label-caps text-slate-400 uppercase">Detection Analytics</p>
                  <span className="flex items-center gap-1.5 text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    <span className="w-1 h-1 bg-indigo-400 rounded-full animate-pulse" />
                    {imageReady ? "Ready" : "Waiting"}
                  </span>
                </div>
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <img src={PREVIEW} alt="" className="w-full h-full object-cover opacity-60" />
                  <div className="absolute inset-0 border border-indigo-500/40 m-8 sm:m-12 rounded-lg">
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-indigo-500" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-indigo-500" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-indigo-500" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-indigo-500" />
                  </div>
                  <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                    <p className="text-[10px] text-white font-mono">CONFIDENCE: 98.42%</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-60 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] inner-glow-btn flex items-center justify-center gap-2"
              >
                {enrolling ? (
                  <>
                    <Icon name="sync" className="text-sm animate-spin" />
                    Enrolling…
                  </>
                ) : (
                  "Enroll Face"
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Registry */}
        <section className="lg:col-span-5 flex flex-col lg:h-[calc(100vh-160px)]">
          <div className="glass-panel rounded-2xl flex flex-col h-full">
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="font-h2 text-lg text-white">Registry</h3>
                <span className="text-xs text-slate-500">{registry.length + 2475} Subjects</span>
              </div>
              <div className="mt-4 flex gap-2">
                {TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors ${
                      filter === t
                        ? "bg-indigo-500 text-white"
                        : "bg-white/5 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredRegistry.length === 0 && (
                <p className="text-center text-xs text-slate-600 py-8">No entries in this filter.</p>
              )}
              {filteredRegistry.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group relative"
                >
                  <div className="relative shrink-0">
                    {r.img ? (
                      <img src={r.img} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
                        <Icon name="person" className="text-slate-500" />
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${r.dot} border-2 border-slate-900 rounded-full`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{r.name}</p>
                    <p className="text-[10px] text-slate-500">ID: {r.id} · {r.ago}</p>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === r.id ? null : r.id)}
                      className="text-slate-600 group-hover:text-slate-400 cursor-pointer p-1 rounded hover:bg-white/10"
                    >
                      <Icon name="more_vert" />
                    </button>
                    {menuOpen === r.id && (
                      <div className="absolute right-0 top-full mt-1 w-36 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-10">
                        <button
                          onClick={() => { setMenuOpen(null); addToast(`Viewing profile for ${r.name}.`, "info"); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 transition-colors"
                        >
                          <Icon name="open_in_new" className="text-sm" /> View Profile
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Icon name="delete" className="text-sm" /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-950/40 rounded-b-2xl border-t border-white/5">
              <button
                onClick={() => addToast("Full registry view coming soon.", "info")}
                className="w-full flex items-center justify-center gap-2 text-xs text-indigo-400 font-semibold hover:text-indigo-300 transition-colors"
              >
                View Full Registry <Icon name="arrow_forward" className="text-sm" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
