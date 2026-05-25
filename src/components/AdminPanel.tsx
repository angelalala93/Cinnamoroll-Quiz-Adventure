import React, { useState } from "react";
import { Question } from "../types";
import { Plus, ListCollapse, Trash2, Edit2, RotateCcw, AlertTriangle, CheckCircle, Save, FileText, Upload, Copy, HelpCircle } from "lucide-react";
import mammoth from "mammoth";

interface AdminPanelProps {
  questions: Question[];
  onRefreshQuestions: () => void;
}

export default function AdminPanel({ questions, onRefreshQuestions }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"list" | "form" | "import">("list");
  
  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [questionType, setQuestionType] = useState<"mc" | "blank">("mc");
  const [questionText, setQuestionText] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswerIdx, setCorrectAnswerIdx] = useState<number>(0);
  const [blankAnswers, setBlankAnswers] = useState("");
  const [explanation, setExplanation] = useState("");

  // Bulk Import States
  const [importText, setImportText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  // UI Feedback States
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteConfirm, setIsBulkDeleteConfirm] = useState(false);

  const toggleSelectQuestion = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === questions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(questions.map((q) => q.id));
    }
  };

  const executeBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/questions/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds })
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback("success", `已成功刪除 ${selectedIds.length} 題所選考題！✨`);
        setSelectedIds([]);
        setIsBulkDeleteConfirm(false);
        onRefreshQuestions();
      } else {
        showFeedback("error", data.error || "批量刪除失敗");
      }
    } catch (err) {
      showFeedback("error", "無法正常發送批量刪除請求");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyShareLink = () => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("share", "true");
      url.hash = "";
      const shareUrl = url.toString();
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    }
  };

  const clearForm = () => {
    setEditingId(null);
    setQuestionType("mc");
    setQuestionText("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrectAnswerIdx(0);
    setBlankAnswers("");
    setExplanation("");
  };

  const showFeedback = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Pre-load a question to form for editing
  const handleEditInit = (q: Question) => {
    setEditingId(q.id);
    const typeVal = q.type || "mc";
    setQuestionType(typeVal);
    setQuestionText(q.question);
    
    if (typeVal === "blank") {
      setBlankAnswers((q.correctAnswers || []).join(", "));
      setOptionA("");
      setOptionB("");
      setOptionC("");
      setOptionD("");
      setCorrectAnswerIdx(0);
    } else {
      setBlankAnswers("");
      setOptionA(q.options[0] || "");
      setOptionB(q.options[1] || "");
      setOptionC(q.options[2] || "");
      setOptionD(q.options[3] || "");
      setCorrectAnswerIdx(q.correctAnswerIndex);
    }
    setExplanation(q.explanation);
    setActiveTab("form");
  };

  // Submit add or edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return showFeedback("error", "請提供題目文字");
    
    let submitBody: any = {
      type: questionType,
      question: questionText.trim(),
      explanation: explanation.trim() || "恭喜答對！🐾"
    };

    if (questionType === "mc") {
      if (!optionA.trim() || !optionB.trim()) {
        return showFeedback("error", "選擇題的選項 A 與 選項 B 為必填選項。");
      }

      const options = [optionA.trim(), optionB.trim()];
      if (optionC.trim()) options.push(optionC.trim());
      if (optionD.trim()) options.push(optionD.trim());

      if (correctAnswerIdx >= options.length) {
        return showFeedback("error", `正確答案索引(${correctAnswerIdx})超出了填寫的選項數量範圍。`);
      }
      submitBody.options = options;
      submitBody.correctAnswerIndex = correctAnswerIdx;
    } else {
      // blank type
      if (!blankAnswers.trim()) {
        return showFeedback("error", "填空題必須提供至少一個正確解答。");
      }
      const correctAnswers = blankAnswers.split(/[,，;；\n]+/).map(a => a.trim()).filter(Boolean);
      if (correctAnswers.length === 0) {
        return showFeedback("error", "請提供有效的正確答案內容。");
      }
      submitBody.correctAnswers = correctAnswers;
      submitBody.options = [];
      submitBody.correctAnswerIndex = 0;
    }

    setIsLoading(true);
    try {
      if (editingId) {
        // PUT /api/questions/:id
        const res = await fetch(`/api/questions/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitBody)
        });
        const data = await res.json();
        if (res.ok) {
          showFeedback("success", "題目已修改成功！🎈");
          clearForm();
          onRefreshQuestions();
          setActiveTab("list");
        } else {
          showFeedback("error", data.error || "修改題目失敗");
        }
      } else {
        // POST /api/questions (Add single)
        const res = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitBody)
        });
        const data = await res.json();
        if (res.ok) {
          showFeedback("success", "新題目已成功新增並載入！✨");
          clearForm();
          onRefreshQuestions();
          setActiveTab("list");
        } else {
          showFeedback("error", data.error || "新增題目失敗");
        }
      }
    } catch (err) {
      showFeedback("error", "網路連線失敗，請稍後重試。");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete question
  const executeDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showFeedback("success", "題目已成功刪除！");
        setDeleteConfirmId(null);
        onRefreshQuestions();
      } else {
        showFeedback("error", data.error || "刪除失敗");
      }
    } catch (err) {
      showFeedback("error", "無法正常發送刪除請求");
    }
  };

  // Reset to default Cinnamoroll pack
  const executeResetToDefault = async () => {
    try {
      const res = await fetch("/api/questions/reset", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showFeedback("success", "已成功恢復成大耳狗預設趣味考題！☁️🌈");
        setShowResetConfirm(false);
        onRefreshQuestions();
        clearForm();
        setActiveTab("list");
      } else {
        showFeedback("error", "重置考題包失敗");
      }
    } catch (err) {
      showFeedback("error", "連線異常，重置失敗");
    }
  };

  // --- SMART REGEX WORD/TEXT PARSER ---
  const parseRawQuestionsText = (text: string) => {
    if (!text || !text.trim()) {
      setParsedQuestions([]);
      return;
    }

    const rawLines = text.split(/\r?\n/).map(l => l.trim());
    const tempQuestions: Question[] = [];
    
    let currentQ: Partial<Question> | null = null;
    let currentOptions: string[] = [];
    let isNewBlockPending = false;

    const pushQuestion = (item: Partial<Question>, opts: string[]) => {
      if (!item.question || !item.question.trim()) return;
      const isBlank = item.type === "blank" || opts.length < 2;
      
      let finalType: "mc" | "blank" = isBlank ? "blank" : "mc";
      let finalCorrectAnswers = item.correctAnswers || [];
      
      if (isBlank && finalCorrectAnswers.length === 0) {
        if (opts.length > 0) {
          finalCorrectAnswers = [opts[0]];
        } else {
          finalCorrectAnswers = ["肉桂"]; 
        }
      }

      let correctIdx = item.correctAnswerIndex ?? 0;
      if (correctIdx >= opts.length) {
        correctIdx = 0;
      }

      tempQuestions.push({
        id: `temp-${Date.now()}-${tempQuestions.length}`,
        type: finalType,
        question: item.question.trim(),
        options: finalType === "blank" ? [] : opts,
        correctAnswerIndex: finalType === "blank" ? 0 : correctIdx,
        correctAnswers: finalType === "blank" ? finalCorrectAnswers : undefined,
        explanation: item.explanation || "恭喜答對！🐾"
      } as Question);
    };

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (!line) {
        isNewBlockPending = true;
        continue;
      }

      const questionMatch = line.match(/^[\(\[\（\【]?\s*(?:(?:(?:(?:[Qq](?:uestion|uuestion)?|[第問])?\s*\d+\s*(?:[\.\、\s\-\：\:\)\）\]\}]+|\s*題\s*[:：]?\s*))|(?:【(?:問題|問|題)?\s*\d*\s*】\s*)|(?:問\s*[:：]\s*)|(?:[①-⑩一二三四五六七八九十]{1,3}\s*[\.\、\s\：\:\)\）]?\s*)))\s*(.+)$/i);
      const optionMatch = line.match(/^[\(\[\（]?\s*([A-Da-d]|[①-④])\s*[\.\、\s\-\：\:\)\）\]\}]+\s*(.+)$/i);
      const answerMatch = line.match(/^(?:正確答案|正確解答|答案|解答|鍵|Key|Correct Answers|Correct Answer|Correct|Answers|Answer|Ans)(?:為|是)?\s*[:：\s]*\s*(.+)$/i);
      const explanationMatch = line.match(/^(?:詳細解析|解析|說明|詳解|Explanation|Explaination|Explain)(?:為|是)?\s*[:：\s]*\s*(.+)$/i);

      let shouldStartNew = false;
      if (currentQ) {
        if (questionMatch && !optionMatch && !answerMatch && !explanationMatch) {
          shouldStartNew = true;
        } else if (currentQ.explanation || currentQ.correctAnswers || currentQ.correctAnswerIndex !== undefined) {
          if (!optionMatch && !answerMatch && !explanationMatch) {
            shouldStartNew = true;
          }
        } else if (isNewBlockPending && !optionMatch && !answerMatch && !explanationMatch) {
          if (currentOptions.length > 0) {
            shouldStartNew = true;
          }
        }
      }

      if (shouldStartNew && currentQ) {
        pushQuestion(currentQ, currentOptions);
        currentQ = null;
        currentOptions = [];
        isNewBlockPending = false;
      }

      if (questionMatch && !optionMatch && !answerMatch && !explanationMatch) {
        currentQ = {
          question: questionMatch[1].trim(),
          explanation: ""
        };
        currentOptions = [];
        isNewBlockPending = false;
      } else if (optionMatch) {
        if (!currentQ) {
          currentQ = { question: "未命名題目", explanation: "" };
        }
        currentOptions.push(optionMatch[2].trim());
        isNewBlockPending = false;
      } else if (answerMatch) {
        if (!currentQ) {
          currentQ = { question: "未命名題目", explanation: "" };
        }
        const rawAns = answerMatch[1].trim();
        const isLetter = rawAns.toUpperCase().match(/^[A-D]$/);
        if (isLetter) {
          const letter = rawAns.toUpperCase();
          const index = letter.charCodeAt(0) - 65;
          currentQ.correctAnswerIndex = isNaN(index) || index < 0 ? 0 : index;
          currentQ.type = "mc";
        } else {
          const checkLetterPrefix = rawAns.toUpperCase().match(/^([A-D])[\.\、\s\-\：\:\)\）\]\}]+\s*(.+)$/);
          if (checkLetterPrefix) {
            const letter = checkLetterPrefix[1];
            const index = letter.charCodeAt(0) - 65;
            currentQ.correctAnswerIndex = isNaN(index) || index < 0 ? 0 : index;
            currentQ.type = "mc";
          } else {
            const optionIdx = currentOptions.findIndex(o => o.toLowerCase() === rawAns.toLowerCase());
            if (optionIdx !== -1) {
              currentQ.correctAnswerIndex = optionIdx;
              currentQ.type = "mc";
            } else {
              const parts = rawAns.split(/\s*[,，/\|;；]\s*|\s+and\s+|\s+or\s+|\s+或\s+/i).map(a => a.trim()).filter(Boolean);
              currentQ.correctAnswers = parts;
              currentQ.type = "blank";
            }
          }
        }
        isNewBlockPending = false;
      } else if (explanationMatch) {
        if (!currentQ) {
          currentQ = { question: "未命名題目", explanation: "" };
        }
        currentQ.explanation = explanationMatch[1].trim();
        isNewBlockPending = false;
      } else {
        if (!currentQ) {
          currentQ = {
            question: line,
            explanation: ""
          };
          currentOptions = [];
        } else {
          if (currentQ.explanation) {
            currentQ.explanation += " " + line;
          } else if (currentOptions.length > 0) {
            currentOptions[currentOptions.length - 1] += " " + line;
          } else {
            currentQ.question = (currentQ.question || "") + " " + line;
          }
        }
        isNewBlockPending = false;
      }
    }

    if (currentQ) {
      pushQuestion(currentQ, currentOptions);
    }

    setParsedQuestions(tempQuestions);
  };

  // Handle uploaded Word docx file via Mammoth
  const processDocxFile = async (file: File) => {
    setImportLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const rawText = result.value;
      setImportText(rawText);
      parseRawQuestionsText(rawText);
      showFeedback("success", `成功讀取並解析 Word 檔案：${file.name}！請於下方預覽確認。`);
    } catch (err) {
      showFeedback("error", "解析 Word 檔案時發生錯誤，請確認此檔案非損毀文件。");
    } finally {
      setImportLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        await processDocxFile(file);
      } else if (file.name.endsWith(".txt") || file.type === "text/plain") {
        const txtText = await file.text();
        setImportText(txtText);
        parseRawQuestionsText(txtText);
        showFeedback("success", `已讀取純文字檔案：${file.name}`);
      } else {
        showFeedback("error", "不支援的檔案格式，請僅使用 Word (.docx) 或純文字 (.txt) 格式之檔案。");
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith(".docx")) {
        await processDocxFile(file);
      } else {
        const txtText = await file.text();
        setImportText(txtText);
        parseRawQuestionsText(txtText);
        showFeedback("success", `已讀取檔案：${file.name}`);
      }
    }
  };

  // Import confirmed parsed questions into live list
  const handleConfirmImport = async () => {
    if (parsedQuestions.length === 0) {
      return showFeedback("error", "目前預覽中沒有已成功解析的題目。");
    }

    setIsLoading(true);
    try {
      // Merge all parsedQuestions into current list
      const combinedList = [...questions];
      
      // Clean up temporary IDs and attach secure timestamp keys
      const formattedToImport = parsedQuestions.map((q, qIdx) => ({
        id: `imported-${Date.now()}-${qIdx}`,
        type: q.type || "mc",
        question: q.question,
        options: q.type === "blank" ? [] : q.options,
        correctAnswerIndex: q.type === "blank" ? 0 : q.correctAnswerIndex,
        correctAnswers: q.type === "blank" ? q.correctAnswers : undefined,
        explanation: q.explanation || "恭喜答對！🐾"
      }));

      const finalMerged = [...combinedList, ...formattedToImport];
      
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalMerged)
      });

      if (res.ok) {
        showFeedback("success", `🎉 恭喜！成功批次匯入 ${formattedToImport.length} 題，已與現有題庫合併保存！`);
        setImportText("");
        setParsedQuestions([]);
        onRefreshQuestions();
        setActiveTab("list");
      } else {
        const data = await res.json();
        showFeedback("error", data.error || "批次儲存至伺服器時失敗。");
      }
    } catch (err) {
      showFeedback("error", "連線伺服器失敗，批次匯入失敗。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      {/* Tab Switcher & Default Reset Panel */}
      <div className="bg-white/95 rounded-3xl p-6 border-4 border-slate-100 shadow-xl backdrop-blur-md">
        
        {/* Alerts / Feedback Message block */}
        {message && (
          <div className={`p-4 rounded-2xl mb-5 flex items-start gap-2 text-sm border ${
            message.type === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
              : "bg-pink-50 border-pink-200 text-pink-800"
          }`}>
            {message.type === "success" ? <CheckCircle className="shrink-0 text-emerald-500 mt-0.5" size={18} /> : <AlertTriangle className="shrink-0 text-pink-500 mt-0.5" size={18} />}
            <span className="font-bold">{message.text}</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rose-50 pb-5 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            <div>
              <h2 className="text-lg font-extrabold text-slate-700">互動式題庫管理後台</h2>
              <p className="text-xs text-slate-400 font-medium">動態新增、編輯與重置考題資料</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              id="copy-share-link-btn"
              onClick={handleCopyShareLink}
              className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0 ${
                copiedLink
                  ? "bg-emerald-50 border-emerald-300 text-emerald-600 font-extrabold animate-pulse"
                  : "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700 font-bold"
              }`}
            >
              <Copy size={13} className={copiedLink ? "text-emerald-500" : "text-purple-500"} />
              {copiedLink ? "分享連結已複製！☁️" : "分享連結"}
            </button>

            {showResetConfirm ? (
              <div className="flex items-center gap-1.5 bg-orange-50 p-1.5 rounded-xl border border-orange-200 animate-fade-in shadow-sm">
                <span className="text-[10px] font-black text-orange-600 px-1">確定要重置嗎？</span>
                <button
                  onClick={executeResetToDefault}
                  className="px-2 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                >
                  確認
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 text-[10px] font-bold transition-all cursor-pointer"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                id="reset-to-default-btn"
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <RotateCcw size={13} />
                重置為 5 題預設考題
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tab Menu */}
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <button
            id="tab-btn-list"
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
              activeTab === "list"
                ? "bg-sky-50 border-sky-400 text-sky-600 font-black"
                : "bg-slate-50 border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <ListCollapse size={16} />
            現有題庫清單 ({questions.length})
          </button>

          <button
            id="tab-btn-form"
            onClick={() => {
              if (activeTab !== "form") clearForm();
              setActiveTab("form");
            }}
            className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
              activeTab === "form"
                ? "bg-pink-50 border-pink-400 text-pink-600 font-black"
                : "bg-slate-50 border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Plus size={16} />
            {editingId ? "✏️ 修改當前題目" : "➕ 新增自訂考題"}
          </button>

          <button
            id="tab-btn-import"
            onClick={() => setActiveTab("import")}
            className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
              activeTab === "import"
                ? "bg-purple-50 border-purple-400 text-purple-600 font-black"
                : "bg-slate-50 border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <FileText size={16} />
            📂 Word / 文本批次匯入
          </button>
        </div>

        {/* Tab contents */}
        {activeTab === "list" ? (
          /* List Tab */
          <div className="space-y-4">
            {questions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                <p className="font-semibold text-slate-500">此時還沒有任何題目喔！</p>
                <p className="text-xs mt-1">請點擊右邊的分頁來建立新的選擇題吧！</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Bulk Select Control Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-purple-50/20 border border-purple-100 p-3 rounded-2xl animate-fade-in">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="select-all-questions"
                      checked={questions.length > 0 && selectedIds.length === questions.length}
                      onChange={handleSelectAll}
                      className="h-4.5 w-4.5 text-purple-600 rounded border-slate-300 focus:ring-purple-400 cursor-pointer"
                    />
                    <label htmlFor="select-all-questions" className="text-xs font-extrabold text-slate-600 select-none cursor-pointer">
                      {selectedIds.length === questions.length ? "取消全選" : "全選所有考題"} （已選 {selectedIds.length} 題）
                    </label>
                  </div>

                  {selectedIds.length > 0 && (
                    <div className="flex items-center gap-2 animate-fade-in">
                      {isBulkDeleteConfirm ? (
                        <div className="flex items-center gap-1.5 bg-pink-50 p-1.5 rounded-xl border border-pink-200 shadow-sm animate-pulse">
                          <span className="text-[10px] font-black text-pink-700 px-1">
                            確定刪除這 {selectedIds.length} 題嗎？🐾
                          </span>
                          <button
                            type="button"
                            onClick={executeBulkDelete}
                            className="px-2.5 py-1 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                          >
                            確定批量刪除
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsBulkDeleteConfirm(false)}
                            className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 text-[10px] font-bold transition-all cursor-pointer"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsBulkDeleteConfirm(true)}
                          className="px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-600 hover:text-pink-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <Trash2 size={13} />
                          批量刪除選取題目 ({selectedIds.length})
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Question Cards Container */}
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {questions.map((q, idx) => {
                    const isSelected = selectedIds.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        className={`p-4 rounded-2xl border shadow-sm transition-all flex items-start justify-between gap-4 ${
                          isSelected
                            ? "bg-purple-50/30 border-purple-200 shadow-inner"
                            : "bg-slate-50 border-slate-200/80 hover:border-sky-200"
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Checkbox for selection */}
                          <div className="pt-1.5 shrink-0 select-none">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectQuestion(q.id)}
                              className="h-4.5 w-4.5 text-purple-600 rounded border-slate-300 focus:ring-purple-400 cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600">
                                Q {idx + 1}
                              </span>
                              {q.type === "blank" ? (
                                <span className="text-xs bg-purple-100 text-purple-700 font-extrabold px-2 py-0.5 rounded-full">
                                  ✏️ 填空問答題
                                </span>
                              ) : (
                                <span className="text-xs bg-sky-100 text-sky-700 font-extrabold px-2 py-0.5 rounded-full">
                                  🎀 {q.options ? q.options.length : 0} 個選項 (選擇題)
                                </span>
                              )}
                            </div>
                            
                            <h4 className="font-bold text-slate-700 text-sm truncate md:whitespace-normal md:overflow-visible">
                              {q.question}
                            </h4>
                            <p className="text-xs text-slate-500 truncate">
                              <span className="font-bold text-emerald-600 font-mono">正確答案：</span>
                              {q.type === "blank" ? (q.correctAnswers || []).join(" 或 ") : (q.options ? q.options[q.correctAnswerIndex] : "無")}
                            </p>
                            <p className="text-[11px] text-slate-400 italic font-medium truncate">
                              解析：{q.explanation}
                            </p>
                          </div>
                        </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {deleteConfirmId === q.id ? (
                        <div className="flex items-center gap-1 bg-pink-50 p-1 rounded-xl border border-pink-100 animate-fade-in shadow-sm">
                          <span className="text-[10px] font-black text-pink-700 px-1">確定刪除？</span>
                          <button
                            onClick={() => executeDelete(q.id)}
                            className="px-2 py-1 rounded bg-pink-500 hover:bg-pink-600 text-white text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                          >
                            刪除
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-600 text-[10px] font-bold transition-all cursor-pointer"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditInit(q)}
                            className="p-2 rounded-xl bg-white hover:bg-sky-50 border border-slate-200 text-sky-600 hover:text-sky-700 hover:border-sky-300 transition-all shadow-sm cursor-pointer"
                            title="編輯此題"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirmId(q.id);
                              // Auto-dismiss in 6 seconds if they don't click anything
                              setTimeout(() => {
                                setDeleteConfirmId((prev) => (prev === q.id ? null : prev));
                              }, 6000);
                            }}
                            className="p-2 rounded-xl bg-white hover:bg-pink-50 border border-slate-200 text-pink-600 hover:text-pink-700 hover:border-pink-300 transition-all shadow-sm cursor-pointer"
                            title="刪除此題"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    ) : activeTab === "form" ? (
          /* Create / Edit Form Tab */
          <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
            {/* Question Type Selector segment */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                <span>⚙️ 題型模式 / Question Type :</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${questionType === "mc" ? "bg-sky-100 text-sky-700" : "bg-purple-100 text-purple-700"}`}>
                  {questionType === "mc" ? "選擇題" : "填空題"}
                </span>
              </span>
              <div className="flex bg-slate-200/60 p-1 rounded-xl gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setQuestionType("mc")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    questionType === "mc" 
                      ? "bg-sky-500 hover:bg-sky-600 text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  🎀 選擇題 (MC)
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionType("blank")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    questionType === "blank" 
                      ? "bg-purple-500 hover:bg-purple-600 text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  ✏️ 填空題 (Blank)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                題目內容 / Question Text
              </label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="例如：大耳狗最喜歡吃的食物是什麼？"
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-pink-300 focus:bg-pink-50/20 text-sm focus:outline-none transition-all"
                rows={2}
                required
              />
            </div>

            {questionType === "blank" ? (
              <div className="bg-purple-50/40 p-5 rounded-2xl border border-purple-100 space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-black text-purple-700 uppercase tracking-wider mb-1 flex justify-between">
                    <span>正確解答 (必填) / Acceptable Blank Answers</span>
                    <span className="text-[10px] text-purple-500 font-semibold lowercase">支援多個同義詞正確答案，用逗號或分行區隔（不分大小寫）</span>
                  </label>
                  <textarea
                    value={blankAnswers}
                    onChange={(e) => setBlankAnswers(e.target.value)}
                    placeholder="例如：肉桂卷, 肉桂卷餅, Cinnamoroll"
                    className="w-full p-3 rounded-xl border border-purple-200 focus:border-purple-400 focus:bg-white text-sm focus:outline-none transition-all font-bold text-slate-700"
                    rows={2}
                    required={questionType === "blank"}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                    <span className="bg-sky-100 text-sky-600 text-[10px] px-1.5 py-0.5 rounded font-black">A</span>
                    選項 A *
                  </label>
                  <input
                    type="text"
                    value={optionA}
                    onChange={(e) => setOptionA(e.target.value)}
                    placeholder="輸入選項 A"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-sky-300 focus:bg-sky-50/20"
                    required={questionType === "mc"}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                    <span className="bg-sky-100 text-sky-600 text-[10px] px-1.5 py-0.5 rounded font-black">B</span>
                    選項 B *
                  </label>
                  <input
                    type="text"
                    value={optionB}
                    onChange={(e) => setOptionB(e.target.value)}
                    placeholder="輸入選項 B"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-sky-300 focus:bg-sky-50/20"
                    required={questionType === "mc"}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                    <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded font-black">C</span>
                    選項 C (選填)
                  </label>
                  <input
                    type="text"
                    value={optionC}
                    onChange={(e) => setOptionC(e.target.value)}
                    placeholder="輸入選項 C"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                    <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded font-black">D</span>
                    選項 D (選填)
                  </label>
                  <input
                    type="text"
                    value={optionD}
                    onChange={(e) => setOptionD(e.target.value)}
                    placeholder="輸入選項 D"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-slate-300"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                  💡 正確答案選項
                </label>
                {questionType === "blank" ? (
                  <div className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-purple-600 bg-purple-50 font-extrabold text-center select-none shadow-sm">
                    ✍️ 由填空輸入匹配
                  </div>
                ) : (
                  <select
                    value={correctAnswerIdx}
                    onChange={(e) => setCorrectAnswerIdx(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none font-bold text-slate-600 bg-white"
                  >
                    <option value={0}>選項 A (預設) </option>
                    <option value={1}>選項 B</option>
                    {optionC.trim() && <option value={2}>選項 C</option>}
                    {optionD.trim() && <option value={3}>選項 D</option>}
                  </select>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                  📝 精準解析 / Instant Explanation Feedback
                </label>
                <input
                  type="text"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="例如：大耳狗是白色小狗喔！尾巴像肉桂捲得名。"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-pink-300 focus:bg-pink-50/20"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3">
              <button
                type="button"
                onClick={() => {
                  clearForm();
                  setActiveTab("list");
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 text-xs font-bold transition-all cursor-pointer"
              >
                取消
              </button>
              
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs shadow hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer animate-fade-in"
              >
                <Save size={13} />
                {isLoading ? "儲存中..." : editingId ? "完成修改" : "新增題目"}
              </button>
            </div>
          </form>
        ) : (
          /* Word/Text Bulk Import Tab */
          <div className="space-y-6">
            {/* Guide & Standard Format Blueprint box */}
            <div className="bg-purple-50/70 rounded-2xl p-4.5 border border-purple-100 text-xs text-purple-950 leading-relaxed font-semibold">
              <h4 className="flex items-center gap-1.5 text-sm font-black text-purple-900 mb-2">
                <HelpCircle size={16} className="text-purple-600" /> Word 格式與解析指南 (Standard Layout Pattern)
              </h4>
              <p className="mb-3 text-purple-800">
                系統支援直接上傳或拖曳 Word 檔案 (`.docx`)、文字檔 (`.txt`)，或直接在下方框內複製貼上文字。解析引擎支援以下兩種
                <span className="text-indigo-600 font-extrabold mx-1">標準排版結構 (Standard Layout Pattern)</span>：
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* MC Format column */}
                <div className="bg-white/90 p-3.5 rounded-xl border border-purple-100 flex flex-col justify-between">
                  <div>
                    <span className="inline-block bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded-full mb-2">
                      📖 模式一：單選題格式
                    </span>
                    <p className="text-[11px] text-slate-500 mb-2">
                      必須在題目下方提供選項行 (以 A. B. C. D. 開頭)，正解可以為選項英文字母。
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg font-mono text-[10px] text-slate-600 space-y-1 border border-slate-100">
                    <p className="text-purple-600 font-bold">1. 大耳狗的尾巴形狀像什麼？</p>
                    <p>A. 甜甜圈</p>
                    <p>B. 焦糖肉桂捲</p>
                    <p>C. 草莓馬卡龍</p>
                    <p className="text-emerald-600 font-bold">答案: B</p>
                    <p className="text-slate-400">解析: 牠最擅長做香甜美味的肉桂捲與麵包點心！</p>
                  </div>
                </div>

                {/* Blank Format column */}
                <div className="bg-white/90 p-3.5 rounded-xl border border-purple-100 flex flex-col justify-between">
                  <div>
                    <span className="inline-block bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full mb-2">
                      ✍️ 模式二：填空題格式
                    </span>
                    <p className="text-[11px] text-slate-500 mb-2">
                      不提供任何選項行。答案輸入文字，可用逗號 `,` 區隔多個判定為正確的通融答案。
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg font-mono text-[10px] text-slate-600 space-y-1 border border-slate-100">
                    <p className="text-indigo-600 font-bold">2. 大耳狗一出生是從哪裡飛下來的？</p>
                    <p className="text-emerald-600 font-bold">答案: 天空, 雲朵, 雲端</p>
                    <p className="text-slate-400">解析: 牠是在天空中像白雲一樣飛過來，然後落在大耳狗咖啡廳前！</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Drag & Drop Upload Container */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-4 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-purple-400 bg-purple-50"
                  : "border-slate-200 hover:border-purple-300 bg-slate-50/50"
              }`}
            >
              <input
                id="word-file-upload"
                type="file"
                accept=".docx,.txt"
                onChange={handleFileInput}
                className="hidden"
              />
              <label htmlFor="word-file-upload" className="cursor-pointer block">
                <Upload className="mx-auto h-12 w-12 text-purple-400 mb-2 animate-bounce" />
                <p className="font-bold text-sm text-slate-700">
                  {importLoading ? "正在解析 Word 文件中..." : "將 Word (.docx) 或文字檔 (.txt) 拖曳到這，或點選此處瀏覽"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  支援自動辨識單選題、填空題、答案與解析
                </p>
              </label>
            </div>

            {/* Paste Plain Text Area */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  或直接在此貼上考題文字內容
                </label>
                <div className="flex gap-3 text-[11px]">
                  <span className="text-purple-600 font-black hover:underline cursor-pointer flex items-center gap-0.5" onClick={() => {
                    const demo = `1. 大耳狗的尾巴形狀像什麼？\nA. 草莓馬卡龍\nB. 焦糖肉桂捲\nC. 甜甜圈\n答案: B\n解析: 沒錯！就是像香甜熱騰騰的奶油肉桂捲喔！🐾`;
                    setImportText(demo);
                    parseRawQuestionsText(demo);
                  }}>
                    📋 貼上單選題範本
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-indigo-600 font-black hover:underline cursor-pointer flex items-center gap-0.5" onClick={() => {
                    const demo2 = `1. 大耳狗一出生是從哪裡飛下來的？\n答案: 天空, 雲朵, 白雲\n解析: 牠就像一朵雪白的小雲，從天空中緩緩飄下來呢！☁️`;
                    setImportText(demo2);
                    parseRawQuestionsText(demo2);
                  }}>
                    ✍️ 貼上填空題範本
                  </span>
                </div>
              </div>
              <textarea
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  parseRawQuestionsText(e.target.value);
                }}
                placeholder="在此貼上多行題目文字..."
                className="w-full p-4 rounded-xl border border-slate-200 focus:border-purple-300 text-xs font-mono focus:bg-purple-50/10 focus:outline-none transition-all"
                rows={6}
              />
            </div>

            {/* Parsed Interactive Question Preview table */}
            {parsedQuestions.length > 0 && (
              <div className="space-y-4 border-t border-slate-100 pt-5">
                <div className="flex justify-between items-center bg-purple-50 p-3 rounded-xl border border-purple-100">
                  <span className="text-xs font-bold text-purple-800">
                    🔍 預覽解析結果（已成功辨識 {parsedQuestions.length} 題，可即時修訂）
                  </span>
                  <button
                    onClick={() => {
                      setParsedQuestions([]);
                      setImportText("");
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    清除重來
                  </button>
                </div>

                <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                  {parsedQuestions.map((pq, pqIdx) => (
                    <div key={pq.id} className="p-4 rounded-2xl bg-white border border-purple-100 shadow-sm space-y-2">
                      <div className="text-[11px] font-black text-purple-600 uppercase tracking-widest">
                        辨識題目 {pqIdx + 1}
                      </div>

                      <input
                        type="text"
                        value={pq.question}
                        onChange={(e) => {
                          const updated = [...parsedQuestions];
                          updated[pqIdx].question = e.target.value;
                          setParsedQuestions(updated);
                        }}
                        className="w-full font-bold text-slate-700 text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
                        placeholder="點此修改題目內容..."
                      />

                      {pq.type === "blank" ? (
                        <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100 space-y-1.5 animate-fade-in text-xs">
                          <span className="font-bold text-purple-700">✏️ 辨識為：填空題型</span>
                          <div className="flex gap-2 items-center">
                            <span className="font-semibold text-slate-500 shrink-0">正確答案：</span>
                            <input
                              type="text"
                              value={(pq.correctAnswers || []).join(", ")}
                              onChange={(e) => {
                                const updated = [...parsedQuestions];
                                updated[pqIdx].correctAnswers = e.target.value.split(/\s*[,，;；]\s*|\s+and\s+|\s+or\s+|\s+或\s+/i).map(a => a.trim()).filter(Boolean);
                                setParsedQuestions(updated);
                              }}
                              className="w-full text-xs font-bold p-1 bg-white border border-purple-200 rounded focus:outline-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {pq.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex gap-1.5 items-center">
                              <span className="text-[10px] font-black bg-slate-100 px-1.5 py-1 text-slate-500 rounded shrink-0">
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...parsedQuestions];
                                  updated[pqIdx].options[oIdx] = e.target.value;
                                  setParsedQuestions(updated);
                                }}
                                className="w-full text-xs p-1 bg-slate-50/50 border border-slate-100 rounded focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 p-1.5 rounded-lg border border-emerald-100">
                          <span className="font-bold shrink-0">正解:</span>
                          {pq.type === "blank" ? (
                            <span className="font-bold text-emerald-800 text-xs text-center w-full">手動輸入比對</span>
                          ) : (
                            <select
                              value={pq.correctAnswerIndex}
                              onChange={(e) => {
                                const updated = [...parsedQuestions];
                                updated[pqIdx].correctAnswerIndex = Number(e.target.value);
                                setParsedQuestions(updated);
                              }}
                              className="bg-transparent font-bold text-emerald-800 focus:outline-none w-full"
                            >
                              {(pq.options || []).map((_, index) => (
                                <option key={index} value={index}>
                                  選項 {String.fromCharCode(65 + index)}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="flex items-center gap-1 bg-slate-50 text-slate-700 p-1.5 rounded-lg border border-slate-200">
                          <span className="font-bold shrink-0">解析:</span>
                          <input
                            type="text"
                            value={pq.explanation}
                            onChange={(e) => {
                              const updated = [...parsedQuestions];
                              updated[pqIdx].explanation = e.target.value;
                              setParsedQuestions(updated);
                            }}
                            className="bg-transparent focus:outline-none w-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Import Submit Button */}
                <div className="flex justify-end pt-2">
                  <button
                    id="submit-batch-import"
                    disabled={isLoading}
                    onClick={handleConfirmImport}
                    className="px-8 py-3.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-extrabold text-sm shadow-md flex items-center gap-2 cursor-pointer active:scale-95 transition-all text-center"
                  >
                    <CheckCircle size={16} />
                    {isLoading ? "匯入中..." : `確認匯入這 ${parsedQuestions.length} 道題目`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

