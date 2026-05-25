import React, { useState, useEffect } from "react";
import QuizPlay from "./components/QuizPlay";
import AdminPanel from "./components/AdminPanel";
import { Question } from "./types";
import { Settings, Play, Cloud, HelpCircle, Sparkles } from "lucide-react";

export default function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"quiz" | "admin">("quiz");
  const [isShareMode, setIsShareMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch all quiz questions from our Express dynamic backend
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/questions");
      if (!res.ok) {
        throw new Error("無法取得題庫資料");
      }
      const data = await res.json();
      setQuestions(data);
    } catch (err: any) {
      setErrorMsg(err?.message || "無法連線至後台，請確認伺服器運作中。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
    
    // Detect visitor share link to restrict access to admin pages
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("share") === "true" || window.location.hash === "#share") {
        setIsShareMode(true);
        setActiveTab("quiz");
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#E0F2FE] relative flex flex-col font-sans overflow-x-hidden pb-12">
      {/* Full-screen Background Watermark Layer with opacity */}
      <div 
        className="absolute inset-0 opacity-25 z-0 bg-cover bg-center pointer-events-none" 
        style={{ backgroundImage: "url('https://cdn.shopify.com/s/files/1/0568/2298/8958/files/sanrio_characters_cinnamoroll_3.png?v=1750757067')" }}
      />

      {/* Decorative Blur Spheres - Artistic Flair */}
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white rounded-full blur-3xl opacity-60 z-0 pointer-events-none"></div>
      <div className="absolute -top-10 -right-10 w-72 h-72 bg-pink-200 rounded-full blur-3xl opacity-40 z-0 pointer-events-none"></div>

      {/* Header Bar */}
      <header className="relative z-10 w-full p-4 md:p-6 max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-sky-200 animate-pulse text-2xl">
            ☁️
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-sky-600 tracking-tight flex items-center gap-1.5 sugar-glow">
              Cinnamoroll <span className="text-pink-400 font-extrabold">Quiz Adventure</span>
            </h1>
            <p className="text-[11px] text-sky-700/70 font-bold tracking-wider uppercase">
              Interact & Manage Questions Offline Friendly
            </p>
          </div>
        </div>

        {/* Dynamic Mode Switcher (Play / Manage Backend) */}
        {isShareMode ? (
          <div className="flex items-center gap-2 bg-gradient-to-r from-sky-450 to-indigo-500 text-white px-4 py-2.5 rounded-2xl shadow-md border-2 border-white/40 font-extrabold text-xs tracking-wider animate-pulse shadow-sky-100">
            🎮 挑戰賽答題模式
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-md border border-sky-100">
            <button
              id="nav-play-mode"
              onClick={() => setActiveTab("quiz")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === "quiz"
                  ? "bg-sky-400 text-white shadow-md border-b-2 border-sky-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Play size={13} strokeWidth={3} />
              開始挑戰答題
            </button>

            <button
              id="nav-admin-mode"
              onClick={() => setActiveTab("admin")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === "admin"
                  ? "bg-pink-400 text-white shadow-md border-b-2 border-pink-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Settings size={13} />
              後台題庫設定
            </button>
          </div>
        )}
      </header>

      {/* Main Content View Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto flex flex-col justify-center py-4 md:py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/80 rounded-[40px] max-w-md mx-auto p-8 shadow-xl border border-sky-100 backdrop-blur-md">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-sky-400 mb-4" />
            <p className="text-sky-600 font-bold text-sm tracking-wide">正在載入大耳狗精選考題中...</p>
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white/90 rounded-3xl max-w-md mx-auto p-8 shadow-xl border border-rose-100 backdrop-blur-md text-center">
            <span className="text-4xl mb-3">⚠️</span>
            <p className="text-rose-600 font-bold text-base mb-2">{errorMsg}</p>
            <button
               id="reload-btn"
               onClick={fetchQuestions}
               className="mt-4 px-5 py-2 rounded-xl bg-sky-400 text-white font-bold text-xs shadow-sm hover:bg-sky-500 transition-all"
            >
               重新整理連線
            </button>
          </div>
        ) : (activeTab === "quiz" || isShareMode) ? (
          <QuizPlay questions={questions} onRefreshQuestions={fetchQuestions} />
        ) : (
          <AdminPanel questions={questions} onRefreshQuestions={fetchQuestions} />
        )}
      </main>

      {/* Persistent Decorative Footer Info on bottom */}
      <footer className="relative z-10 text-center text-[11px] text-sky-800/60 font-medium px-4 pt-12">
      </footer>
    </div>
  );
}
