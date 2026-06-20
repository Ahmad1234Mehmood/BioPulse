import { useState, useRef, useEffect } from "react";
import Icon from "../components/Icon";
import { useApp } from "../context/AppContext";
import { queryAssistant } from "../api/services";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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

const generatePDFReport = (markdownText) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const margin = 20;
  const maxLineWidth = 170;
  let y = 20;
  const pageHeight = 297;

  const checkPageOverflow = (heightNeeded) => {
    if (y + heightNeeded > pageHeight - 20) {
      doc.addPage();
      
      // Top header line
      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(0.5);
      doc.line(margin, 12, margin + maxLineWidth, 12);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("FaceMetrics AI - Biometric System Evaluation", margin, 10);
      
      y = 20;
    }
  };

  // Header Background banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 40, "F");

  // Accent Line
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 38, 210, 2, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("FaceMetrics AI", margin, 18);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(165, 180, 252);
  doc.text("BIOMETRIC SYSTEM PERFORMANCE REPORT", margin, 26);

  // Info
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${dateStr} | UPEC Facial Biometrics Lab`, margin, 32);

  y = 52;

  // Split lines
  const lines = markdownText.split("\n");
  let inCodeBlock = false;
  let tableBuffer = [];

  const flushPDFTable = () => {
    if (tableBuffer.length === 0) return;

    const tableRows = [];
    for (let r = 0; r < tableBuffer.length; r++) {
      const rawCells = tableBuffer[r].split("|").map(c => c.trim());
      const rowCells = rawCells.slice(1, rawCells.length - 1);
      if (rowCells.length === 0) continue;
      // Skip separator lines like |---|---|
      if (rowCells.every(cell => cell.startsWith("-") || cell === "")) {
        continue;
      }
      tableRows.push(rowCells);
    }

    if (tableRows.length > 0) {
      // Draw table using jspdf-autotable plugin
      autoTable(doc, {
        head: [tableRows[0]],
        body: tableRows.slice(1),
        startY: y - 2,
        theme: "striped",
        headStyles: {
          fillColor: [15, 23, 42], // slate-900 header
          textColor: [165, 180, 252], // indigo-200 text
          fontStyle: "bold",
          fontSize: 8.5
        },
        bodyStyles: {
          textColor: [71, 85, 105], // slate-600 body
          fontSize: 8
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // slate-50 alternating background
        },
        margin: { left: margin, right: margin },
        styles: {
          font: "helvetica",
          cellPadding: 2,
          lineColor: [241, 245, 249],
          lineWidth: 0.1
        }
      });
      
      // Update Y coordinate to end of autoTable
      y = doc.lastAutoTable.finalY + 5;
    }

    tableBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmed = line.trim();
    
    // Detect table line
    const isTableLine = trimmed.startsWith("|");
    if (!isTableLine) {
      flushPDFTable();
    }

    if (!trimmed) {
      if (!inCodeBlock) {
        y += 4;
      }
      continue;
    }

    // Skip helper info or blockquote warning formatting
    if (trimmed.startsWith(">") || trimmed.includes("GEMINI_API_KEY") || trimmed.includes("offline mode")) {
      continue;
    }

    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      checkPageOverflow(6);
      doc.setFillColor(241, 245, 249); // slate-100 grey background
      doc.rect(margin - 2, y - 3.5, maxLineWidth + 4, 5.5, "F");
      
      doc.setFont("courier", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(line, margin, y);
      y += 5.5;
      continue;
    }

    if (isTableLine) {
      tableBuffer.push(line);
      continue;
    }

    const cleanLineText = (txt) => txt.replace(/\*\*/g, "");

    // Headings
    if (trimmed.startsWith("###")) {
      const headingText = cleanLineText(trimmed.slice(3).trim());
      checkPageOverflow(10);
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(99, 102, 241);
      doc.text(headingText, margin, y);
      y += 6;
    } else if (trimmed.startsWith("##")) {
      const headingText = cleanLineText(trimmed.slice(2).trim());
      checkPageOverflow(12);
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text(headingText, margin, y);
      y += 8;
    } else if (trimmed.startsWith("#")) {
      const headingText = cleanLineText(trimmed.slice(1).trim());
      checkPageOverflow(14);
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text(headingText, margin, y);
      y += 10;
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      // Bullet list item
      const listContent = trimmed.slice(2).trim();
      checkPageOverflow(7);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text("•", margin, y);
      
      const wrappedText = doc.splitTextToSize(listContent, maxLineWidth - 6);
      for (let w = 0; w < wrappedText.length; w++) {
        checkPageOverflow(6);
        const subLine = wrappedText[w];
        
        let parts = subLine.split("**");
        let curX = margin + 5;
        for (let p = 0; p < parts.length; p++) {
          const isBoldPart = p % 2 === 1;
          doc.setFont("helvetica", isBoldPart ? "bold" : "normal");
          doc.setTextColor(
            isBoldPart ? 30 : 71,
            isBoldPart ? 41 : 85,
            isBoldPart ? 59 : 105
          );
          doc.text(parts[p], curX, y);
          curX += doc.getTextWidth(parts[p]);
        }
        y += 6;
      }
    } else {
      // Paragraph
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      
      const wrappedText = doc.splitTextToSize(trimmed, maxLineWidth);
      for (let w = 0; w < wrappedText.length; w++) {
        checkPageOverflow(6);
        const subLine = wrappedText[w];
        
        let parts = subLine.split("**");
        let curX = margin;
        for (let p = 0; p < parts.length; p++) {
          const isBoldPart = p % 2 === 1;
          doc.setFont("helvetica", isBoldPart ? "bold" : "normal");
          doc.setTextColor(
            isBoldPart ? 30 : 71,
            isBoldPart ? 41 : 85,
            isBoldPart ? 59 : 105
          );
          doc.text(parts[p], curX, y);
          curX += doc.getTextWidth(parts[p]);
        }
        y += 6;
      }
    }
  }

  // Flush remaining table
  flushPDFTable();

  // Draw footer line and text
  checkPageOverflow(15);
  y += 5;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, margin + maxLineWidth, y);
  y += 6;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("End of Report. Developed for UPEC Facial Biometrics Dashboard Project © 2026.", margin, y);

  doc.save("FaceMetrics_Biometric_Report.pdf");
};

function DownloadReportButton({ text }) {
  const [downloading, setDownloading] = useState(false);
  const handleDownload = () => {
    setDownloading(true);
    try {
      generatePDFReport(text);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloading(false);
    }
  };
  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-xs text-indigo-300 transition-colors flex items-center gap-1 font-semibold cursor-pointer disabled:opacity-50"
    >
      <Icon name={downloading ? "sync" : "picture_as_pdf"} className={`text-xs ${downloading ? "animate-spin" : ""}`} />
      {downloading ? "Generating PDF..." : "Download Report (PDF)"}
    </button>
  );
}

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

  const lines = content.split("\n");
  const elements = [];
  let currentList = null;
  let currentTable = null;

  const flushList = (key) => {
    if (currentList) {
      elements.push(
        <ul key={`list-${key}`} className="list-disc pl-5 space-y-1 my-3">
          {currentList.map((item, idx) => (
            <li key={idx} className="text-slate-300 text-sm">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ul>
      );
      currentList = null;
    }
  };

  const flushTable = (key) => {
    if (currentTable) {
      const headerRow = currentTable[0];
      const isDivider = currentTable.length > 1 && currentTable[1].every(c => c.trim().startsWith("-") || c.trim() === "");
      const bodyRows = isDivider ? currentTable.slice(2) : currentTable.slice(1);

      elements.push(
        <div key={`table-wrapper-${key}`} className="overflow-x-auto my-4 rounded-xl border border-white/10 bg-slate-950/40">
          <table className="min-w-full divide-y divide-white/10 text-xs">
            <thead className="bg-white/5">
              <tr>
                {headerRow.map((cell, idx) => (
                  <th key={idx} className="px-4 py-2.5 text-left font-semibold text-indigo-300 uppercase tracking-wider">
                    {renderInlineFormatting(cell.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-white/5 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-2 whitespace-nowrap">
                      {renderInlineFormatting(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      currentTable = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if we need to flush previous structures
    const isListLine = trimmed.startsWith("- ") || trimmed.startsWith("* ");
    const isTableLine = trimmed.startsWith("|");

    if (!isListLine) {
      flushList(i);
    }
    if (!isTableLine) {
      flushTable(i);
    }

    if (!trimmed) {
      continue;
    }

    // Parse blockquote alerts
    if (trimmed.startsWith("> [!")) {
      let alertType = trimmed.includes("WARNING") ? "warning" : "info";
      let alertLines = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        let l = lines[i].trim().slice(1).trim();
        if (!l.startsWith("[!")) {
          alertLines.push(l);
        }
        i++;
      }
      i--; // adjust index

      const bodyText = alertLines.join("\n");
      const bgCls = alertType === "warning" ? "bg-red-500/10 border-red-500/20 text-red-200" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-200";
      const icon = alertType === "warning" ? "warning" : "info";
      const iconCls = alertType === "warning" ? "text-red-400" : "text-indigo-400";
      
      elements.push(
        <div key={`alert-${i}`} className={`p-4 rounded-xl border ${bgCls} flex gap-3 items-start my-3`}>
          <Icon name={icon} className={`${iconCls} text-sm mt-0.5 shrink-0`} />
          <div className="text-xs leading-relaxed flex-grow">
            {renderInlineFormatting(bodyText)}
          </div>
        </div>
      );
      continue;
    }

    // Headings
    if (trimmed.startsWith("###")) {
      elements.push(
        <h4 key={i} className="text-xs font-bold text-indigo-400 mt-4 mb-2 uppercase tracking-wider">
          {renderInlineFormatting(trimmed.slice(3).trim())}
        </h4>
      );
    } else if (trimmed.startsWith("##")) {
      elements.push(
        <h3 key={i} className="text-sm font-bold text-white mt-5 mb-2.5">
          {renderInlineFormatting(trimmed.slice(2).trim())}
        </h3>
      );
    } else if (trimmed.startsWith("#")) {
      elements.push(
        <h2 key={i} className="text-base font-bold text-white mt-6 mb-3">
          {renderInlineFormatting(trimmed.slice(1).trim())}
        </h2>
      );
    } else if (isListLine) {
      const content = trimmed.slice(2).trim();
      if (!currentList) {
        currentList = [];
      }
      currentList.push(content);
    } else if (isTableLine) {
      const cells = line.split("|").map(c => c.trim());
      const actualCells = cells.slice(1, cells.length - 1);
      
      if (!currentTable) {
        currentTable = [];
      }
      currentTable.push(actualCells);
    } else {
      elements.push(
        <p key={i} className="text-slate-300 text-sm leading-relaxed my-2">
          {renderInlineFormatting(line)}
        </p>
      );
    }
  }

  flushList(lines.length);
  flushTable(lines.length);

  return elements;
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

  const msgText = msg.blocks ? msg.blocks.map((b) => b.content).join("\n") : (msg.text || "");
  const isReport = msg.role === "ai" && msgText && (
    msgText.toLowerCase().includes("report") ||
    msgText.toLowerCase().includes("performance summary") ||
    msgText.toLowerCase().includes("biometric system performance")
  );

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
          <CopyButton text={msgText} />
          {isReport && <DownloadReportButton text={msgText} />}
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
