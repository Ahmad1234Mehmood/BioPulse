import { useState, useRef, useEffect } from "react";
import Icon from "../components/Icon";
import { useApp } from "../context/AppContext";
import { queryAssistant } from "../api/services";

const PROFILE_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCdw6quLqKA5b8SZmhRQJnLX1mTRdkANAB749_VFO-OJ3_DTW9tN7uhxHJOD4wVnvoy6xMAtiHDy52R2jvXwGYn6zpKNClPOCENc1_aPZbuukG6Qvsz5M30heS0Fd5l745c0eHXZZRtpWr6KFVNvNRn8hfkZDPHfeno_P-xmNAXYQdrkqttrCzWMsK7x787kLg1IcgCChWcSmmRdMz4n9j91cCGQqpEgm-dFQkRkwykgB9roJn4CwlqqBs-XNQ425pZ9k2eqQuUaTa9";

const MINI_BARS = ["15%", "20%", "18%", "25%", "22%", "14%", "12%", "9%"];

const INITIAL_MSGS = [
  {
    id: 1,
    role: "ai",
    text: null,
    blocks: [
      { type: "text", content: "Hello! I am FaceMetrics AI, your assistant for biometric system analysis. I have analyzed our facial biometrics model (FaceNet) and loaded evaluation metrics from LFW experiments." },
      { type: "text", content: "I can help explain Equal Error Rate (EER) tradeoffs, analyze matching errors, evaluate rotation robustness, or guide you through threshold optimization. What would you like to investigate today?" }
    ]
  }
];

const QUICK_ACTIONS = [
  "Why is FRR high?",
  "Show accuracy summary",
  "What is the optimal threshold?",
  "Generate evaluation report"
];

let _msgId = 10;

// Helper to parse markdown-like responses (containing code blocks) into blocks
const parseMarkdownToBlocks = (text) => {
  if (!text) return [];
  const blocks = [];
  const parts = text.split(/(```[\s\S]*?```)/g);
  
  parts.forEach((part) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      // Extract code contents, removing leading markdown language identifiers
      const content = part.replace(/^```[a-zA-Z0-9_\-]*\n/, "").replace(/```$/, "").trim();
      blocks.push({ type: "code", content });
    } else {
      // Split by double newlines for paragraph separation
      const paragraphs = part.split(/\n\n+/);
      paragraphs.forEach((p) => {
        const cleanText = p.trim();
        if (cleanText) {
          blocks.push({ type: "text", content: cleanText });
        }
      });
    }
  });
  return blocks;
};

function renderInlineFormatting(text) {
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const parts = text.split(regex);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-indigo-300">
          {part.slice(2, -2)}
        </strong>
      );
    } else if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="bg-slate-950/80 px-1.5 py-0.5 rounded border border-white/5 font-code text-xs text-indigo-300 mx-0.5">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function formatText(content) {
  if (!content) return "";
  
  // Check if this block is a blockquote alert
  const trimmedContent = content.trim();
  if (trimmedContent.startsWith("> [!")) {
    const lines = content.split("\n");
    const typeLine = lines[0].trim();
    const type = typeLine.includes("WARNING") ? "warning" : "info";

    const bodyLines = lines.slice(1).map((line) => {
      let l = line.trim();
      if (l.startsWith(">")) {
        l = l.slice(1).trim();
      }
      return l;
    });

    const bodyText = bodyLines.join("\n");
    const bgCls =
      type === "warning"
        ? "bg-red-500/10 border-red-500/20 text-red-200"
        : "bg-indigo-500/10 border-indigo-500/20 text-indigo-200";
    const icon = type === "warning" ? "warning" : "info";
    const iconCls = type === "warning" ? "text-red-400" : "text-indigo-400";

    return (
      <div className={`p-4 rounded-xl border ${bgCls} flex gap-3 items-start my-2`}>
        <Icon name={icon} className={`${iconCls} text-sm mt-0.5 shrink-0`} />
        <div className="text-xs leading-relaxed flex-grow">
          {renderInlineFormatting(bodyText)}
        </div>
      </div>
    );
  }

  const lines = content.split("\n");
  const hasList = lines.some((line) => {
    const trimmed = line.trim();
    return trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed);
  });

  if (hasList) {
    return (
      <ul className="list-disc pl-5 space-y-1 my-2">
        {lines.map((line, lidx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            return (
              <li key={lidx} className="text-on-surface">
                {renderInlineFormatting(trimmed.slice(2))}
              </li>
            );
          } else if (/^\d+\.\s/.test(trimmed)) {
            const match = trimmed.match(/^(\d+\.\s)/);
            const marker = match[1];
            return (
              <li key={lidx} className="list-decimal text-on-surface ml-5">
                {renderInlineFormatting(trimmed.slice(marker.length))}
              </li>
            );
          }
          return <div key={lidx}>{renderInlineFormatting(line)}</div>;
        })}
      </ul>
    );
  }

  return renderInlineFormatting(content);
}

function MessageBubble({ msg }) {
  if (msg.error) {
    return (
      <div className="flex gap-3 sm:gap-4 items-start max-w-4xl mx-auto">
        <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center shrink-0 shadow-lg shadow-red-500/20">
          <Icon name="warning" className="text-white text-sm" />
        </div>
        <div className="flex flex-col gap-2 min-w-0">
          <div className="font-semibold text-sm text-red-400">System Error</div>
          <div className="text-red-200 bg-red-500/10 p-4 rounded-2xl rounded-tl-none border border-red-500/20 leading-relaxed text-sm">
            {msg.text}
          </div>
        </div>
      </div>
    );
  }

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
          <div className="font-semibold text-sm text-indigo-400">FaceMetrics AI</div>
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
        <div className="font-semibold text-sm text-indigo-400">FaceMetrics AI</div>
        <div className="text-on-surface bg-surface-container/50 p-4 rounded-2xl rounded-tl-none border border-white/5 leading-relaxed space-y-4">
          {msg.blocks ? (
            msg.blocks.map((b, i) =>
              b.type === "code" ? (
                <div key={i} className="bg-slate-950/50 p-3 rounded-xl border border-white/5 font-code text-xs whitespace-pre overflow-x-auto">
                  {b.content.split("\n").map((line, j) => {
                    if (line.includes(":")) {
                      const colonIdx = line.indexOf(":");
                      const key = line.slice(0, colonIdx);
                      const rest = line.slice(colonIdx + 1);
                      return (
                        <div key={j}>
                          <span className="text-indigo-400">{key}:</span>
                          {rest}
                        </div>
                      );
                    }
                    return <div key={j}>{line}</div>;
                  })}
                </div>
              ) : (
                <div key={i}>{formatText(b.content)}</div>
              )
            )
          ) : (
            <div>{formatText(msg.text)}</div>
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
    navigator.clipboard.writeText(text).catch(() => { });
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
    { id: 1, title: "Rotation Degradation", sub: "EER degrades to 25.4% if auto-orient correction is turned OFF.", cls: "p-3 bg-red-500/5 border border-red-500/20 rounded-lg", titleCls: "text-xs font-semibold text-red-200", subCls: "text-[10px] text-red-300/60 mt-1" },
    { id: 2, title: "Challenging Poses", sub: "LFW probe matches show higher errors on extreme head turns.", cls: "p-3 bg-surface-container/40 border border-white/5 rounded-lg", titleCls: "text-xs font-semibold text-slate-300", subCls: "text-[10px] text-slate-500 mt-1" },
  ]);

  const chatRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg = { id: ++_msgId, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // Reconstruct simple dialogue history for the Gemini backend
      const history = messages
        .filter((m) => m.role === "user" || m.text || m.blocks)
        .map((m) => {
          const content = m.blocks
            ? m.blocks.map((b) => b.content).join("\n")
            : (m.text || "");
          return {
            role: m.role === "user" ? "user" : "model",
            content: content
          };
        });

      const response = await queryAssistant(text, history);

      if (response.data && response.data.status === "success") {
        const replyText = response.data.reply;
        if (replyText.startsWith("Error connecting to Gemini API:")) {
          setMessages((prev) => [
            ...prev,
            { id: ++_msgId, role: "ai", text: replyText, error: true }
          ]);
        } else {
          const parsedBlocks = parseMarkdownToBlocks(replyText);
          setMessages((prev) => [
            ...prev,
            { id: ++_msgId, role: "ai", text: null, blocks: parsedBlocks }
          ]);
        }
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("AI Assistant error:", error);
      addToast("Failed to connect to FaceMetrics AI Assistant.", "error");
      setMessages((prev) => [
        ...prev,
        {
          id: ++_msgId,
          role: "ai",
          text: "I apologize, but I encountered an error communicating with the backend LLM service. Please check that your server is running and your GEMINI_API_KEY is configured in the .env file.",
          error: true
        }
      ]);
    } finally {
      setIsTyping(false);
    }
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
                className={`px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer ${input === action
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
              placeholder="Ask FaceMetrics AI anything about your metrics…"
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
            FaceMetrics AI may produce inaccurate biometric correlations. Verify results with core logs.
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
              <div className="text-[10px] text-slate-500 uppercase">System EER</div>
              <div className="text-xl font-bold text-indigo-400">0.97%</div>
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
                  className={`${i === MINI_BARS.length - 1 ? "bg-indigo-400" : "bg-indigo-500/30"} w-full rounded-t-sm`}
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
              onClick={() => handleQuickAction("What is the optimal threshold?")}
              className="flex gap-3 group cursor-pointer"
            >
              <div className="shrink-0 w-8 h-8 rounded-lg bg-surface-bright flex items-center justify-center border border-white/10 group-hover:border-indigo-500/50 transition-colors">
                <Icon name="tune" className="text-xs" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-300">Threshold Balance</div>
                <div className="text-[10px] text-slate-500">Calculate optimal FAR/FRR threshold.</div>
              </div>
            </div>
            <div
              onClick={() => handleQuickAction("Generate evaluation report")}
              className="flex gap-3 group cursor-pointer"
            >
              <div className="shrink-0 w-8 h-8 rounded-lg bg-surface-bright flex items-center justify-center border border-white/10 group-hover:border-indigo-500/50 transition-colors">
                <Icon name="article" className="text-xs" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-300">Generate Report</div>
                <div className="text-[10px] text-slate-500">Output dynamic markdown performance report.</div>
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
              <div className="text-sm font-semibold text-white truncate">Students</div>
              <div className="text-[10px] text-slate-500 truncate">UPEC Students</div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
