import { useState, useRef, useEffect } from "react";
import Icon from "../components/Icon";
import { useApp } from "../context/AppContext";

const PROFILE_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCdw6quLqKA5b8SZmhRQJnLX1mTRdkANAB749_VFO-OJ3_DTW9tN7uhxHJOD4wVnvoy6xMAtiHDy52R2jvXwGYn6zpKNClPOCENc1_aPZbuukG6Qvsz5M30heS0Fd5l745c0eHXZZRtpWr6KFVNvNRn8hfkZDPHfeno_P-xmNAXYQdrkqttrCzWMsK7x787kLg1IcgCChWcSmmRdMz4n9j91cCGQqpEgm-dFQkRkwykgB9roJn4CwlqqBs-XNQ425pZ9k2eqQuUaTa9";

const MINI_BARS = ["40%", "35%", "55%", "70%", "45%", "80%", "95%", "98%"];

const INITIAL_MSGS = [
  {
    id: 1,
    role: "ai",
    text: "Hello! I've finished analyzing the latest biometric enrollment batch. I noticed a slight spike in the False Rejection Rate (FRR) for the thermal-imaging sensor nodes. How can I help you optimize these metrics today?",
  },
  {
    id: 2,
    role: "user",
    text: "Why is FRR high on the thermal nodes specifically? We haven't changed the firmware recently.",
  },
  {
    id: 3,
    role: "ai",
    text: null, // special: code block message
    blocks: [
      { type: "text", content: "Based on the telemetry logs from Node-Group-7 (Thermal), the increased FRR (currently 1.84%) correlates with a 4.2°C ambient temperature rise in the server room over the last 6 hours." },
      { type: "code", content: "Event:  Thermal_Noise_Spike\nSource: Sensor_Array_X2\nAction: Recommend recalibration or dynamic gain adjustment." },
      { type: "text", content: "Would you like me to generate a recalibration script for these nodes or run a deeper diagnostic on the sensor gain settings?" },
    ],
  },
];

const QUICK_ACTIONS = [
  "Why is FRR high?",
  "Show accuracy summary",
  "Optimize sensor gain",
];

const CANNED_RESPONSES = [
  {
    keywords: ["frr", "rejection", "thermal", "node"],
    reply: "The current FRR of 1.84% on Node-Group-7 is caused by thermal sensor drift. A 4.2°C rise in ambient temperature shifts the IR baseline, causing more false negatives. I recommend running a 50-probe recalibration cycle — estimated time: 8 minutes. Shall I generate the script?",
  },
  {
    keywords: ["far", "acceptance", "threshold"],
    reply: "Current FAR is stable at 0.0012%, within enterprise threshold. If you lower the match threshold below 0.80, expect FAR to rise to ~0.005%. Current threshold of 0.842 provides the optimal FAR/FRR trade-off for your deployment profile.",
  },
  {
    keywords: ["accuracy", "summary", "metric", "performance"],
    reply: "System Rank-1 accuracy: 99.982%. ROC AUC is 0.9998 for model v4.2.0. The primary degradation vector is the LowRes_Challenge dataset (0.142% EER) — the model needs additional low-resolution training samples to improve edge-case recognition.",
  },
  {
    keywords: ["calibrate", "sensor", "gain", "recalibrate"],
    reply: "To recalibrate Node-Group-7: (1) Go to Admin → Sensor Management, (2) Set IR gain to 0.74 for current ambient conditions, (3) Run a 50-probe validation cycle. Estimated completion: 8 minutes. Shall I generate the recalibration script now?",
  },
  {
    keywords: ["enroll", "enrollment", "subject"],
    reply: "Current enrollment quality metrics look good — average face detection confidence is 97.3%. I flagged 3 recent enrollments with sub-optimal lighting. Recommend re-enrollment for BP-99150 (James Wilson) to improve match reliability.",
  },
];

const DEFAULT_REPLY =
  "I've analyzed the biometric pipeline for relevant data. Could you clarify what aspect you'd like to investigate? I can help with FRR/FAR optimization, sensor calibration, threshold tuning, enrollment quality analysis, or system performance diagnostics.";

let _msgId = 10;

function pickReply(input) {
  const lower = input.toLowerCase();
  for (const r of CANNED_RESPONSES) {
    if (r.keywords.some((k) => lower.includes(k))) return r.reply;
  }
  return DEFAULT_REPLY;
}

function MessageBubble({ msg }) {
  if (msg.role === "user") {
    return (
      <div className="flex gap-3 sm:gap-4 items-start flex-row-reverse max-w-4xl mx-auto">
        <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 border border-white/10">
          <Icon name="person" className="text-slate-400 text-sm" />
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="font-semibold text-sm text-slate-400">System Admin</div>
          <div className="text-on-surface bg-indigo-500/10 p-4 rounded-2xl rounded-tr-none border border-indigo-500/20 leading-relaxed">
            {msg.text}
          </div>
        </div>
      </div>
    );
  }

  if (msg.typing) {
    return (
      <div className="flex gap-3 sm:gap-4 items-start max-w-4xl mx-auto">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
          <Icon name="smart_toy" fill className="text-white text-sm" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="font-semibold text-sm text-indigo-400">BioPulse AI</div>
          <div className="text-on-surface bg-surface-container/50 p-4 rounded-2xl rounded-tl-none border border-white/5">
            <div className="flex gap-1.5 items-center h-4">
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 sm:gap-4 items-start max-w-4xl mx-auto">
      <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
        <Icon name="smart_toy" fill className="text-white text-sm" />
      </div>
      <div className="flex flex-col gap-2 min-w-0">
        <div className="font-semibold text-sm text-indigo-400">BioPulse AI</div>
        <div className="text-on-surface bg-surface-container/50 p-4 rounded-2xl rounded-tl-none border border-white/5 leading-relaxed space-y-4">
          {msg.blocks ? (
            msg.blocks.map((b, i) =>
              b.type === "code" ? (
                <div key={i} className="bg-slate-950/50 p-3 rounded-xl border border-white/5 font-code text-xs whitespace-pre">
                  {b.content.split("\n").map((line, j) => {
                    const [key, ...rest] = line.split(":");
                    return (
                      <div key={j}>
                        <span className="text-indigo-400">{key}:</span>
                        {rest.join(":")}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p key={i}>{b.content}</p>
              )
            )
          ) : (
            <p>{msg.text}</p>
          )}
        </div>
        <div className="flex gap-2 mt-1">
          <CopyButton text={msg.blocks ? msg.blocks.map((b) => b.content).join("\n") : msg.text} />
        </div>
      </div>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handle}
      className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-bright border border-white/10 rounded-lg text-xs transition-colors flex items-center gap-1"
    >
      <Icon name={copied ? "check" : "content_copy"} className="text-xs" />
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function Assistant() {
  const { addToast } = useApp();
  const [messages, setMessages] = useState(INITIAL_MSGS);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [issues, setIssues] = useState([
    { id: 1, title: "Thermal Noise Drift", sub: "Node Group 7 showing sensor instability due to ambient heat.", cls: "p-3 bg-red-500/5 border border-red-500/20 rounded-lg", titleCls: "text-xs font-semibold text-red-200", subCls: "text-[10px] text-red-300/60 mt-1" },
    { id: 2, title: "Auth Token Expiry",   sub: "Service worker tokens for 'Identify' API expire in 14h.",  cls: "p-3 bg-surface-container/40 border border-white/5 rounded-lg", titleCls: "text-xs font-semibold text-slate-300", subCls: "text-[10px] text-slate-500 mt-1" },
  ]);

  const chatRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg = { id: ++_msgId, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const aiText = pickReply(text);
      setMessages((prev) => [...prev, { id: ++_msgId, role: "ai", text: aiText }]);
      setIsTyping(false);
    }, 1400);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickAction = (action) => {
    setInput(action);
    textareaRef.current?.focus();
  };

  const dismissIssue = (id) => {
    setIssues((prev) => prev.filter((i) => i.id !== id));
    addToast("Issue acknowledged and dismissed.", "info");
  };

  return (
    <div className="flex flex-col lg:flex-row lg:h-full bg-background">
      {/* Chat */}
      <div className="flex-grow flex flex-col items-center relative lg:h-full">
        <div
          ref={chatRef}
          className="w-full max-w-3xl flex-grow lg:overflow-y-auto px-4 sm:px-6 py-8 space-y-8 no-scrollbar"
        >
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {isTyping && <MessageBubble msg={{ role: "ai", typing: true }} />}
        </div>

        {/* Composer */}
        <div className="w-full max-w-3xl pb-8 px-4 sm:px-6 pt-2">
          <div className="flex flex-wrap gap-2 mb-4 justify-center">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                onClick={() => handleQuickAction(action)}
                className={`px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
                  input === action
                    ? "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300"
                    : "bg-slate-800/40 border border-white/10 text-slate-400 hover:border-indigo-500/40"
                }`}
              >
                {action}
              </button>
            ))}
          </div>
          <div className="glass-panel rounded-2xl p-2 flex items-end gap-2 group focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
            <button className="p-2 hover:bg-white/5 rounded-xl text-slate-500 transition-colors">
              <Icon name="attach_file" />
            </button>
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask BioPulse AI anything about your metrics…"
              className="flex-grow bg-transparent border-none focus:ring-0 resize-none py-2 text-sm text-on-surface placeholder-slate-500 min-h-[40px]"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className="p-2 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-400 active:scale-95 transition-all disabled:opacity-40"
            >
              <Icon name="arrow_upward" />
            </button>
          </div>
          <p className="text-[10px] text-center text-slate-600 mt-4 uppercase tracking-[0.2em]">
            BioPulse AI may produce inaccurate biometric correlations. Verify results with core logs.
          </p>
        </div>
      </div>

      {/* Insights rail */}
      <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/5 bg-slate-900/40 p-6 flex flex-col gap-6 lg:overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-label-caps text-label-caps text-indigo-400 uppercase tracking-widest">
            Quick Insights
          </h3>
          <Icon name="info" className="text-slate-500 text-sm" />
        </div>

        {/* Performance summary */}
        <div className="bg-surface-container/40 border border-white/10 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Icon name="speed" className="text-indigo-400 text-sm" />
            <span className="text-xs font-bold text-white">Performance Summary</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Current FRR</div>
              <div className="text-xl font-bold text-error">1.84%</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">Avg Latency</div>
              <div className="text-xl font-bold text-white">124ms</div>
            </div>
          </div>
          <div className="h-[60px] w-full mt-2 overflow-hidden rounded-lg bg-slate-950/50 relative">
            <div className="absolute inset-0 flex items-end gap-1 px-2 pb-1">
              {MINI_BARS.map((h, i) => (
                <div
                  key={i}
                  className={`${i === MINI_BARS.length - 1 ? "bg-error" : "bg-indigo-500/30"} w-full rounded-t-sm`}
                  style={{ height: h }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Detected issues */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="warning" className="text-error text-sm" />
            <span className="text-xs font-bold text-white">Detected Issues</span>
            {issues.length > 0 && (
              <span className="ml-auto text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full">
                {issues.length}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {issues.length === 0 ? (
              <p className="text-[11px] text-slate-600 text-center py-2">No active issues.</p>
            ) : (
              issues.map((issue) => (
                <div key={issue.id} className={`${issue.cls} flex items-start gap-2 group`}>
                  <div className="flex-1 min-w-0">
                    <div className={issue.titleCls}>{issue.title}</div>
                    <div className={issue.subCls}>{issue.sub}</div>
                  </div>
                  <button
                    onClick={() => dismissIssue(issue.id)}
                    className="text-slate-600 hover:text-slate-400 transition-colors shrink-0 mt-0.5"
                  >
                    <Icon name="close" className="text-xs" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Optimization tips */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="auto_awesome" className="text-secondary text-sm" />
            <span className="text-xs font-bold text-white">Optimization Tips</span>
          </div>
          <div className="space-y-3">
            <div
              onClick={() => handleQuickAction("Optimize sensor gain")}
              className="flex gap-3 group cursor-pointer"
            >
              <div className="shrink-0 w-8 h-8 rounded-lg bg-surface-bright flex items-center justify-center border border-white/10 group-hover:border-indigo-500/50 transition-colors">
                <Icon name="tune" className="text-xs" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-300">Recalibrate Sensors</div>
                <div className="text-[10px] text-slate-500">Run auto-tune for IR clusters.</div>
              </div>
            </div>
            <div
              onClick={() => addToast("Batch update queued for edge nodes.", "info")}
              className="flex gap-3 group cursor-pointer"
            >
              <div className="shrink-0 w-8 h-8 rounded-lg bg-surface-bright flex items-center justify-center border border-white/10 group-hover:border-indigo-500/50 transition-colors">
                <Icon name="cloud_upload" className="text-xs" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-300">Batch Update</div>
                <div className="text-[10px] text-slate-500">Push v4.2.1-beta to edge nodes.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile */}
        <div className="mt-auto pt-6 border-t border-white/5">
          <div className="flex items-center gap-3">
            <img
              src={PROFILE_IMG}
              alt="User profile"
              className="w-10 h-10 rounded-full border border-white/10 object-cover"
            />
            <div className="overflow-hidden">
              <div className="text-sm font-semibold text-white truncate">Marcus Chen</div>
              <div className="text-[10px] text-slate-500 truncate">Senior Biometrics Lead</div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
