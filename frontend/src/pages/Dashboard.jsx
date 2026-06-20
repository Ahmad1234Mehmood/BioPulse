import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon";

const FACE_HERO =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDrqEaoOjXbbV20CJUjsiOk-MBQTnXqbSt1-JZUl_rQagTnHMcHjRLmwG794AzRaGJHBZQffwzEl3VB8Dz0Bkhf9FzD_CfBgEPeOXiatcd1GQ7I3GFiOyOcoHeOqBlNvZl5Na3YETy0Sh_pge0oGEovdMOALDqrDhpAtN8ZkiWHSti4uvzv_v5RUa3ftRohZ0WhWKRsGEeUtG7ja6aDNZxgsal6ON8TzeNbOAh3yQIfIK5-yMu67-aLDVWmW5A_5vZRsXO3RoDwpup4";
const FACE_A =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA-9sqwIYLUtCU4-1fw8K705Dy-_OkXteQgo28sl6reRZDG63QfYhU3djFYl0vAH-rhsGflQhnz1RZRRs6aKB8wmuENLSqNzKqkE2wogeK_oaV-Xoj8aKZRrTEJ6qFw4gPPrhqRyyaqdH_0k4_gljWR7wy2RGKSAYUCxtk_9M_D3uReGJz7JE5VSmS53UANqmqv0W0t4bUxZ6uvRcMozovGI-3u2ki-hXdVbiEr4PMwqaSKB2QZpWBbpel9S8sMpz1yx71smawOe-9-";
const FACE_M =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBKawcp0b11S7xepoWcgdY0ocaNoAvtS2sP0f2pjDTZKqHmSjm3lVaFWg3QodHHotBTd3kLjkDtMdVsJGl0-dZT0PZNP4SsLMORQn2mqQoOujTitaaFwctdtCe3HCTbcdg_7ktJIRlBPzsM7kgMVaeSmRTcnkT3CqbK4SkJ53g8VcX5l2xE556oiWb9kTkLiQnj4E5DkddsJBXjIijsu2ZBI3lZTabgr5ABdoX-Gcp-CwAYKyGefvRalRoAjFXFe46lROuWxvYiCgAa";

const SAMPLE_POOL = [
  { name: "A. Thompson", img: FACE_A, action: "Verification",   score: 99.8, status: "Passed",   sClass: "bg-emerald-500/10 text-emerald-400", bar: "bg-emerald-500", bw: "98%" },
  { name: "M. Kovic",    img: FACE_M, action: "Identification", score: 84.2, status: "Matched",  sClass: "bg-indigo-500/10 text-indigo-400",  bar: "bg-indigo-500",  bw: "84%" },
  { name: "S. Chen",     img: null,   action: "Verification",   score: 96.5, status: "Passed",   sClass: "bg-emerald-500/10 text-emerald-400", bar: "bg-emerald-500", bw: "96%" },
  { name: "D. Miller",   img: null,   action: "Enrollment",     score: null, status: "Enrolled", sClass: "bg-indigo-500/10 text-indigo-400",  bar: "bg-indigo-500",  bw: "100%" },
  { name: "Unknown",     img: null,   action: "Verification",   score: 12.0, status: "Rejected", sClass: "bg-red-500/10 text-red-400",        bar: "bg-red-500",     bw: "12%" },
  { name: "J. Wilson",   img: null,   action: "Identification", score: 78.3, status: "Matched",  sClass: "bg-indigo-500/10 text-indigo-400",  bar: "bg-indigo-500",  bw: "78%" },
  { name: "E. Rodriguez",img: null,   action: "Verification",   score: 93.1, status: "Passed",   sClass: "bg-emerald-500/10 text-emerald-400", bar: "bg-emerald-500", bw: "93%" },
];

function nowTime() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

const FALLBACK_LFW_POOL = [
  { name: "Abdullah Gul", subject_id: "abdullah_gul" },
  { name: "Adrien Brody", subject_id: "adrien_brody" },
  { name: "Alan Greenspan", subject_id: "alan_greenspan" },
  { name: "Angelina Jolie", subject_id: "angelina_jolie" },
  { name: "Bill Clinton", subject_id: "bill_clinton" },
  { name: "Colin Powell", subject_id: "colin_powell" },
  { name: "Donald Rumsfeld", subject_id: "donald_rumsfeld" },
];

const INITIAL_ROWS = [
  { id: 1, name: "Abdullah Gul", subject_id: "abdullah_gul", action: "Verification", score: 92.4, status: "Passed", sClass: "bg-emerald-500/10 text-emerald-400", bar: "bg-emerald-500", bw: "92.4%", time: "14:02:11" },
  { id: 2, name: "Adrien Brody", subject_id: "adrien_brody", action: "Identification", score: 85.1, status: "Matched", sClass: "bg-indigo-500/10 text-indigo-400", bar: "bg-indigo-500", bw: "85.1%", time: "13:58:45" },
  { id: 3, name: "Unknown", subject_id: null, action: "Verification", score: 14.2, status: "Rejected", sClass: "bg-red-500/10 text-red-400", bar: "bg-red-500", bw: "14.2%", time: "13:55:01" },
];

function StatCard({ icon, label, value, footer }) {
  return (
    <div className="glass-panel p-6 rounded-2xl group hover:border-indigo-500/30 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
          <Icon name={icon} />
        </div>
        <div>
          <div className="text-[11px] font-label-caps text-slate-500 uppercase tracking-wider">{label}</div>
          <div className="text-2xl font-bold text-white mt-1">{value}</div>
        </div>
      </div>
      <div className="mt-4">{footer}</div>
    </div>
  );
}

import { healthCheck, getEnrolledSubjects, getDatasetStats } from "../api/services";

export default function Dashboard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(INITIAL_ROWS);
  const [simulating, setSimulating] = useState(false);
  const rowIdRef = useRef(10);
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [dbEnrolledCount, setDbEnrolledCount] = useState(0);
  const [enrolledSubjects, setEnrolledSubjects] = useState([]);
  const [totalEnrolledImages, setTotalEnrolledImages] = useState(0);
  const [datasetStats, setDatasetStats] = useState({
    total_images: 5985,
    probe_count: 1796,
    enrollment_count: 4189
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const healthRes = await healthCheck();
        if (healthRes.data?.status === "healthy") {
          setBackendStatus("Connected");
        } else {
          setBackendStatus("Error");
        }
      } catch (err) {
        setBackendStatus("Disconnected");
      }
      try {
        const enrolledRes = await getEnrolledSubjects();
        if (enrolledRes.data?.enrolled_users) {
          const users = enrolledRes.data.enrolled_users;
          setEnrolledSubjects(users);
          setDbEnrolledCount(users.length);
          const totalImg = users.reduce((acc, sub) => acc + (sub.image_count || 0), 0);
          setTotalEnrolledImages(totalImg);
        }
      } catch (err) {
        console.error("Failed to fetch enrolled subjects", err);
      }
      try {
        const statsRes = await getDatasetStats();
        if (statsRes.data?.data) {
          setDatasetStats(statsRes.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch dataset stats", err);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const addRow = () => {
    const pool = enrolledSubjects.length > 0 ? enrolledSubjects : FALLBACK_LFW_POOL;
    const isUnknown = Math.random() < 0.15;
    
    let subject_id = null;
    let name = "Unknown";
    
    if (!isUnknown) {
      const randomSub = pool[Math.floor(Math.random() * pool.length)];
      subject_id = randomSub.subject_id || null;
      name = subject_id 
        ? subject_id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : randomSub.name;
    }

    const isVerification = Math.random() > 0.4;
    const isMatch = !isUnknown && (Math.random() > 0.15); // 85% match rate for enrolled subjects
    
    let action, score, status, sClass, bar, bw;
    if (isVerification) {
      action = "Verification";
      if (isMatch) {
        score = parseFloat((75 + Math.random() * 23).toFixed(1));
        status = "Passed";
        sClass = "bg-emerald-500/10 text-emerald-400";
        bar = "bg-emerald-500";
      } else {
        score = parseFloat((10 + Math.random() * 45).toFixed(1));
        status = "Rejected";
        sClass = "bg-red-500/10 text-red-400";
        bar = "bg-red-500";
      }
    } else {
      action = "Identification";
      if (isMatch) {
        score = parseFloat((70 + Math.random() * 27).toFixed(1));
        status = "Matched";
        sClass = "bg-indigo-500/10 text-indigo-400";
        bar = "bg-indigo-500";
      } else {
        score = isUnknown ? 0.0 : parseFloat((5 + Math.random() * 30).toFixed(1));
        status = isUnknown ? "No Match" : "Rejected";
        sClass = "bg-red-500/10 text-red-400";
        bar = "bg-red-500";
      }
    }
    
    bw = `${score}%`;

    setRows((prev) => [
      {
        id: ++rowIdRef.current,
        name,
        subject_id,
        action,
        score: isUnknown && !isVerification ? null : score,
        status,
        sClass,
        bar,
        bw,
        time: nowTime()
      },
      ...prev
    ].slice(0, 9));
  };

  // Auto-simulate every 14 seconds
  useEffect(() => {
    const t = setInterval(addRow, 14000);
    return () => clearInterval(t);
  }, []);

  const handleSimulate = () => {
    setSimulating(true);
    addRow();
    setTimeout(() => setSimulating(false), 700);
  };

  const enrolledCount = rows.filter((r) => r.status === "Enrolled").length;

  return (
    <div className="mesh-bg min-h-full p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-12 glass-panel border-indigo-500/10">
          <div className="absolute top-0 right-0 w-2/3 sm:w-1/2 h-full opacity-30 pointer-events-none">
            <img src={FACE_HERO} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-label-caps text-[10px] uppercase tracking-wider mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              System Live
            </span>
            <h1 className="font-h1 text-[2rem] sm:text-h1 leading-tight text-white mb-4">
              Facial Biometrics System
            </h1>
            <p className="font-body text-body text-slate-400 mb-8 sm:mb-10 max-w-lg">
              Verification, Identification &amp; AI-Powered Analysis. High-fidelity facial recognition orchestration
              for enterprise security and user authentication.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4">
              <button
                onClick={() => navigate("/verify")}
                className="glow-button flex items-center justify-center gap-3 bg-indigo-500 hover:bg-indigo-400 text-white px-6 sm:px-8 py-4 rounded-xl font-semibold transition-all transform active:scale-95 shadow-lg shadow-indigo-500/20"
              >
                <Icon name="verified_user" />
                Start Verification
              </button>
              <button
                onClick={() => navigate("/identify")}
                className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white px-6 sm:px-8 py-4 rounded-xl font-semibold transition-all border border-white/10 backdrop-blur-sm active:scale-95"
              >
                <Icon name="search_check" />
                Start Identification
              </button>
            </div>
          </div>
        </section>

        {/* Status + Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-label-caps text-slate-400 uppercase tracking-widest text-[11px]">
                System Status
              </h3>
              <Icon name="settings_suggest" className="text-slate-500" />
            </div>
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-3 rounded-xl border ${backendStatus === "Connected" ? "bg-emerald-500/5 border-emerald-500/10" : "bg-rose-500/5 border-rose-500/10"}`}>
                <span className="text-sm font-medium text-slate-300">Backend status</span>
                <div className="flex items-center gap-2">
                  <span className={`${backendStatus === "Connected" ? "text-emerald-400" : "text-rose-400"} text-xs font-semibold`}>{backendStatus}</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${backendStatus === "Connected" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                <span className="text-sm font-medium text-slate-300">Model status</span>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400 text-xs font-semibold">Loaded</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                </div>
              </div>
            </div>
            <div className="pt-2">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs text-slate-500">Latency</span>
                <span className="text-xs text-indigo-400 font-code">24ms</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="w-[85%] h-full bg-indigo-500 rounded-full" />
              </div>
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              icon="groups"
              label="Total Subjects"
              value={(dbEnrolledCount).toLocaleString()}
              footer={
                <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Icon name="trending_up" className="text-[14px]" />
                  Active registered templates
                </div>
              }
            />
            <StatCard
              icon="image"
              label="Total Images"
              value={(datasetStats.total_images + totalEnrolledImages).toLocaleString()}
              footer={
                <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Icon name="trending_up" className="text-[14px]" />
                  Includes gallery and probe sets
                </div>
              }
            />
            <StatCard
              icon="assignment_ind"
              label="Enrollment Count"
              value={totalEnrolledImages.toLocaleString()}
              footer={<div className="text-[10px] text-slate-500">Total enrolled gallery templates</div>}
            />
            <StatCard
              icon="fingerprint"
              label="Probe Count"
              value={datasetStats.probe_count.toLocaleString()}
              footer={<div className="text-[10px] text-slate-500">Evaluation query pool size</div>}
            />
          </div>
        </div>

        {/* Live Analysis Stream */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-h2 text-lg text-white">Live Analysis Stream</h2>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" /> LIVE
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSimulate}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  simulating
                    ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                    : "bg-white/5 hover:bg-white/10 text-slate-400 border-white/5"
                }`}
              >
                <Icon name="sync" className={`text-sm ${simulating ? "animate-spin" : ""}`} />
                Simulate
              </button>
              <button className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold px-2">
                View History
              </button>
            </div>
          </div>
          <div className="p-2 table-scroll">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="text-[10px] text-slate-500 font-label-caps uppercase tracking-widest">
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Accuracy</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {rows.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-white/5 transition-colors ${i > 0 ? "border-t border-white/5" : ""}`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden border border-white/10 shrink-0 flex items-center justify-center">
                          {r.subject_id ? (
                            <img
                              src={`${import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"}/api/v1/enrollment/enrolled/${r.subject_id}/image`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : r.img ? (
                            <img src={r.img} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Icon
                              name={r.name === "Unknown" ? "person_off" : "person"}
                              className="text-slate-500 text-sm"
                            />
                          )}
                        </div>
                        <span className="text-white font-medium whitespace-nowrap">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-400 whitespace-nowrap">{r.action}</td>
                    <td className="px-4 py-4">
                      {r.score != null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className={`${r.bar} h-full`} style={{ width: r.bw }} />
                          </div>
                          <span className={`text-xs ${r.sClass.split(" ")[1]}`}>{r.score}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-500 font-code text-xs whitespace-nowrap">
                      {r.time}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${r.sClass}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
