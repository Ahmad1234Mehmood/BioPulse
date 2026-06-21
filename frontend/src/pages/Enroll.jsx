import { useState, useRef, useEffect } from "react";
import Icon from "../components/Icon";
import { useApp } from "../context/AppContext";
import { enrollSubject, getEnrolledSubjects, deleteSubject } from "../api/services";

const PREVIEW =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDK57T6AA3Wc0sHzBwUXgU289gUqq23gZWK9NFr79gR_hpLitqkhVX9zly5y8CevG9-ODKMbsCthp8RflLR-TJiiS5AZ7SDanhQfngu7ESiVlhVEi6Lo5fA-OQKoy5uyYZMVTcHWavI0-C24U1PDQ-49WlRFk8wq-zfS1LnTr83VC_lHV263WwHEnnK9J_hSQHpjGiPX0-bft_4V6cQcWcaupRWxRTJ6WxHE_5QnaAGKwpx6zJ3qjRPy1MVSORmFbNrqZxlP6E3iK1R";

const TABS = ["All", "Recent"];

export default function Enroll() {
  const { addToast } = useApp();

  // Form state
  const [name, setName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [enrolling, setEnrolling] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [lastEnrolled, setLastEnrolled] = useState("");

  // Registry state
  const [registry, setRegistry] = useState([]);
  const [filter, setFilter] = useState("All");
  const [menuOpen, setMenuOpen] = useState(null);

  // File and Dropzone state
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageReady, setImageReady] = useState(false);

  const fileInputRef = useRef(null);

  const fetchRegistry = async () => {
    try {
      const res = await getEnrolledSubjects();
      if (res.data?.enrolled_users) {
        const mapped = res.data.enrolled_users.map((sub) => ({
          name: sub.subject_id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          id: sub.subject_id,
          ago: "Enrolled",
          dot: "bg-emerald-500",
          img: null
        }));
        setRegistry(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch registry", err);
    }
  };

  useEffect(() => {
    fetchRegistry();
  }, []);

  const filteredRegistry =
    filter === "Recent"
      ? registry.slice(0, 3)
      : registry;

  useEffect(() => {
    return () => {
      selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
    };
  }, []);

  const handleFileChange = (files) => {
    if (!files) return;
    const newFiles = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setImageReady(true);
    addToast(`${newFiles.length} image(s) loaded for enrollment.`, "info");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles((prev) => {
      const target = prev[indexToRemove];
      if (target?.preview) {
        URL.revokeObjectURL(target.preview);
      }
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      if (updated.length === 0) {
        setImageReady(false);
      }
      return updated;
    });
  };

  const handleEnroll = async () => {
    if (!name.trim()) {
      addToast("Please enter a Subject Identity before enrolling.", "warning");
      return;
    }
    if (selectedFiles.length === 0) {
      addToast("Please select or drop at least one face image first.", "warning");
      return;
    }
    setEnrolling(true);
    try {
      const filesToSend = selectedFiles.map((f) => f.file);
      const res = await enrollSubject(name.trim(), filesToSend);
      if (res.data?.status === "success") {
        setLastEnrolled(name.trim());
        setShowBanner(true);
        setName("");
        selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
        setSelectedFiles([]);
        setImageReady(false);
        fetchRegistry();
        addToast(`Subject enrolled successfully!`, "success");
      }
    } catch (err) {
      console.error("Enrollment error", err);
      const errMsg = err.response?.data?.detail || "Enrollment failed.";
      addToast(errMsg, "error");
    } finally {
      setEnrolling(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await deleteSubject(id);
      if (res.data?.status === "success") {
        setMenuOpen(null);
        fetchRegistry();
        addToast(`Subject "${id}" removed from registry.`, "info");
      }
    } catch (err) {
      console.error("Delete error", err);
      addToast(err.response?.data?.detail || "Failed to remove subject.", "error");
    }
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
                Onboard new identities to the biometric database with precision mapping.
              </p>
            </div>
            <div className="space-y-6">
              {/* Dropzone */}
              {/* Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group relative border-2 border-dashed rounded-2xl p-6 sm:p-10 transition-all bg-slate-950/30 flex flex-col items-center justify-center gap-4 cursor-pointer ${dragOver
                    ? "border-indigo-500/80 bg-indigo-500/5"
                    : selectedFiles.length > 0
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-white/10 hover:border-indigo-500/50"
                  }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileChange(e.target.files)}
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                />
                <div className={`w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center transition-transform ${dragOver ? "scale-125" : "group-hover:scale-110"}`}>
                  <Icon name={dragOver ? "download" : "cloud_upload"} className="text-indigo-400 text-3xl" />
                </div>
                <div className="text-center">
                  {dragOver ? (
                    <p className="text-indigo-400 font-semibold">Release to load images</p>
                  ) : selectedFiles.length > 0 ? (
                    <>
                      <p className="text-emerald-400 font-semibold">✓ {selectedFiles.length} image(s) loaded</p>
                      <p className="text-xs text-slate-500 mt-1">Click or drag more files to append</p>
                    </>
                  ) : (
                    <>
                      <p className="text-white font-semibold">
                        Drop image(s) here or <span className="text-indigo-400">browse</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Select multiple files for better face generalized templates
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Capture buttons */}
              <div>
                <button
                  onClick={() => { fileInputRef.current?.click(); }}
                  className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 border border-white/5 p-4 rounded-xl transition-all group"
                >
                  <Icon name="photo_camera" className="text-slate-400 group-hover:text-indigo-400" />
                  <span className="text-sm font-semibold text-white">Upload File</span>
                </button>
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
              </div>

              {/* Preview */}
              <div className="bg-slate-950/50 rounded-2xl p-4 sm:p-6 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-label-caps text-slate-400 uppercase">Detection Analytics</p>
                  <span className="flex items-center gap-1.5 text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    <span className="w-1 h-1 bg-indigo-400 rounded-full animate-pulse" />
                    {imageReady ? `${selectedFiles.length} Images Loaded` : "Waiting"}
                  </span>
                </div>
                {selectedFiles.length > 0 ? (
                  <div className="flex flex-wrap gap-3 max-h-48 overflow-y-auto p-1">
                    {selectedFiles.map((item, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-slate-900">
                        <img src={item.preview} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(idx);
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-colors shadow-md cursor-pointer"
                        >
                          <Icon name="close" className="text-[10px]" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center">
                    <img src={PREVIEW} alt="" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 border border-indigo-500/40 m-8 sm:m-12 rounded-lg">
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-indigo-500" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-indigo-500" />
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-indigo-500" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-indigo-500" />
                    </div>
                  </div>
                )}
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
                <span className="text-xs text-slate-500">{registry.length} Subjects</span>
              </div>
              <div className="mt-4 flex gap-2">
                {TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors ${filter === t
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
