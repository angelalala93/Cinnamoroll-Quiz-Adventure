import React, { useState } from "react";
import { Question } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, XCircle, ChevronRight, RotateCcw, Award, Check, X, ShieldAlert, Star } from "lucide-react";

interface QuizPlayProps {
  questions: Question[];
  onRefreshQuestions: () => void;
}

export default function QuizPlay({ questions, onRefreshQuestions }: QuizPlayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [isTypedCorrect, setIsTypedCorrect] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [answersHistory, setAnswersHistory] = useState<{ qIndex: number; isCorrect: boolean; selected: number }[]>([]);

  // Derived state to ensure scoring is always in perfect synchronization with answers history
  const score = answersHistory.filter((item) => item.isCorrect).length;

  // If there are no questions loaded yet, show a lovely bubble loading status
  if (!questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white/85 rounded-3xl border-4 border-sky-100 shadow-xl max-w-lg mx-auto p-8 backdrop-blur-md">
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="w-20 h-20 bg-sky-200 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-inner border border-sky-300 mb-6"
        >
          ☁️
        </motion.div>
        <p className="text-sky-600 font-semibold text-lg tracking-wide text-center">
          「現在空中還沒有題目呢...」
        </p>
        <p className="text-slate-400 text-sm mt-2 text-center">
          請點擊上方的「後台管理」新增一些有趣的多選題吧！
        </p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  // Synthesize cute chiptune sound effect for correct answer
  const playCorrectSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0.08, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = audioCtx.currentTime;
      // High-pitched bright happy arpeggio
      playTone(523.25, now, 0.12);     // C5
      playTone(659.25, now + 0.08, 0.12); // E5
      playTone(783.99, now + 0.16, 0.12); // G5
      playTone(1046.50, now + 0.24, 0.24); // C6
    } catch (e) {
      console.warn("Audio Context playback prevented or unsupported:", e);
    }
  };

  // Synthesize soft cartoon-like cute sliding downward buzz for wrong answers
  const playWrongSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "triangle";
      const now = audioCtx.currentTime;
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.exponentialRampToValueAtTime(220.00, now + 0.3); // Downward slide to A3
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn("Audio Context playback prevented or unsupported:", e);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    if (hasAnswered) return; // Prevent double selecting

    setSelectedIdx(optionIndex);
    setHasAnswered(true);

    const isCorrect = optionIndex === currentQuestion.correctAnswerIndex;
    if (isCorrect) {
      playCorrectSound();
    } else {
      playWrongSound();
    }

    setAnswersHistory((prev) => {
      // Prevent double record insertions for the same question due to fast double-clicks
      if (prev.some((item) => item.qIndex === currentIndex)) {
        return prev;
      }
      return [
        ...prev,
        {
          qIndex: currentIndex,
          isCorrect,
          selected: optionIndex,
        },
      ];
    });
  };

  const handleSubmitBlank = () => {
    if (hasAnswered || !typedAnswer.trim()) return;

    const userAns = typedAnswer.trim().toLowerCase();
    const cleanUserAns = userAns.replace(/[\s,，./\\|;；\-_]+/g, ""); // remove all spacing/punctuations for lenient checks
    const acceptable = (currentQuestion.correctAnswers || []).map(a => a.trim().toLowerCase());
    
    // Check 1: Direct perfect match, or exact alphanumeric content matches one of the options
    let isCorrect = acceptable.some(ans => {
      const cleanAcceptable = ans.replace(/[\s,，./\\|;；\-_]+/g, "");
      return ans === userAns || (cleanAcceptable && cleanAcceptable === cleanUserAns);
    });
    
    // Check 2: Multi-blank questions (like "China uses _ while HK uses _ ... [simplified, traditional]")
    // If the user typed both correct options (independent of separators/spaces)
    if (!isCorrect && acceptable.length > 1) {
      const cleanAcceptableParts = acceptable.map(a => a.replace(/[\s,，./\\|;；\-_]+/g, "")).filter(Boolean);
      if (cleanAcceptableParts.length > 0) {
        const allPresent = cleanAcceptableParts.every(part => cleanUserAns.includes(part));
        if (allPresent) {
          isCorrect = true;
        }
      }
    }
    
    setHasAnswered(true);
    setIsTypedCorrect(isCorrect);

    if (isCorrect) {
      playCorrectSound();
    } else {
      playWrongSound();
    }

    setAnswersHistory((prev) => {
      // Prevent double record insertions for the same question due to fast double-clicks
      if (prev.some((item) => item.qIndex === currentIndex)) {
        return prev;
      }
      return [
        ...prev,
        {
          qIndex: currentIndex,
          isCorrect,
          selected: -1,
        },
      ];
    });
  };

  const handleNext = () => {
    // Only allow proceeding to the next question if the current question has been answered!
    const answeredCurrent = answersHistory.some((item) => item.qIndex === currentIndex);
    if (!answeredCurrent) return;

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => {
        // Prevent double click Next button from skipping questions
        if (prev !== currentIndex) {
          return prev;
        }
        return prev + 1;
      });
      setSelectedIdx(null);
      setTypedAnswer("");
      setIsTypedCorrect(false);
      setHasAnswered(false);
    } else {
      setIsFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedIdx(null);
    setTypedAnswer("");
    setIsTypedCorrect(false);
    setHasAnswered(false);
    setIsFinished(false);
    setAnswersHistory([]);
    onRefreshQuestions();
  };

  // Compute funny positive feedback messages
  const getFinishFeedback = (score: number, total: number) => {
    const percentage = score / total;
    if (percentage === 1) {
      return {
        title: "大耳狗終極特級大師！👑",
        description: "太神奇了！你對大耳狗的一切瞭若指掌，簡直就像在雲上一起長大的小夥伴！☁️🐾",
        color: "text-sky-600 sugar-glow"
      };
    } else if (percentage >= 0.6) {
      return {
        title: "超棒的 Cinnamoroll 鐵粉！🍨",
        description: "哇！大部分的題目都答對了呢！尾巴像肉桂捲一樣驕傲地捲起來了！✨🍰",
        color: "text-pink-500"
      };
    } else {
      return {
        title: "可愛的初學者！🌱",
        description: "再接再厲！大耳狗在 Cafe Cinnamon 咬著肉桂捲，在雲朵上為你加油打氣喔！🐾🧁",
        color: "text-indigo-400"
      };
    }
  };

  const feedback = getFinishFeedback(score, questions.length);

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* 5. score indicator above the questions */}
      {!isFinished && (
        <div className="mb-6 bg-white/95 rounded-2xl p-4 border-2 border-sky-100 shadow-md backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-500 border border-sky-200 animate-bounce">
              ☁️
            </span>
            <div>
              <p className="text-xs text-sky-400 font-bold tracking-wider uppercase">Current Progress / 當前進度</p>
              <h3 className="text-sky-700 font-bold text-base md:text-lg">
                問題 {currentIndex + 1} 之 {questions.length}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-sky-50 px-4 py-2 rounded-full border border-sky-200">
            <span className="text-xs text-sky-500 font-bold">目前得分：</span>
            <span className="text-lg font-extrabold text-sky-600 bg-white shadow-sm px-3 py-1 rounded-full border border-sky-100 min-w-[3.5rem] text-center">
              {score} <span className="text-xs text-slate-400 font-medium">/ {questions.length}</span>
            </span>
          </div>
        </div>
      )}

      {/* Progress level line decoration */}
      {!isFinished && (
        <div className="w-full bg-slate-100 h-2.5 rounded-full mb-8 overflow-hidden border border-slate-200 shadow-inner">
          <motion.div
            className="h-full bg-sky-300 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            transition={{ ease: "easeOut", duration: 0.4 }}
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        {!isFinished ? (
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            transition={{ type: "spring", stiffness: 260, damping: 25 }}
            className="bg-white/95 rounded-3xl p-6 md:p-8 border-4 border-sky-100 shadow-xl backdrop-blur-md relative overflow-hidden"
          >
            {/* Soft decorative clouds */}
            <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none select-none text-sky-400 text-5xl">☁️</div>
            <div className="absolute bottom-4 left-4 p-3 opacity-10 pointer-events-none select-none text-sky-400 text-6xl">☁️</div>

            {/* Question Text */}
            <div className="mb-6 relative z-10">
              <span className="inline-block bg-pink-50 text-pink-500 border border-pink-100 font-extrabold text-xs px-3 py-1.5 rounded-full mb-3 uppercase tracking-wider shadow-sm animate-fade-in">
                {currentQuestion.type === "blank" ? "✏️ FILL IN THE BLANK / 填空問答" : "🎀 MULTIPLE CHOICE / 單選問答"}
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-slate-700 leading-snug">
                {currentQuestion.question}
              </h2>
            </div>

            {/* Interactive Options list or Fill-in-the-blank text input */}
            {currentQuestion.type === "blank" ? (
              <div className="space-y-4 mb-6 relative z-10 animate-fade-in">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="請在此輸入您的解答..."
                    disabled={hasAnswered}
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && typedAnswer.trim() && !hasAnswered) {
                        handleSubmitBlank();
                      }
                    }}
                    className="w-full p-4 pr-12 rounded-2xl border-2 border-slate-200 focus:border-purple-300 bg-white/70 text-slate-700 outline-none text-base font-bold tracking-wide transition-all shadow-inner focus:ring-4 focus:ring-purple-100"
                  />
                  {typedAnswer && !hasAnswered && (
                    <button
                      onClick={() => setTypedAnswer("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-full text-center shrink-0 transition-all"
                    >
                      清除
                    </button>
                  )}
                </div>
                {!hasAnswered && (
                  <button
                    onClick={handleSubmitBlank}
                    disabled={!typedAnswer.trim()}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-extrabold text-sm border-b-4 border-indigo-700 hover:border-indigo-800 active:border-b-0 active:translate-y-[2px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:active:border-b-4 transition-all shadow-md"
                  >
                    送出回答
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3.5 mb-6 relative z-10">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = selectedIdx === idx;
                  const isCorrectAns = idx === currentQuestion.correctAnswerIndex;

                  let optionClass = "border-2 border-slate-100 hover:border-sky-300 hover:bg-sky-50 text-slate-600 bg-white/70";
                  let iconEl = null;

                  if (hasAnswered) {
                    if (isCorrectAns) {
                      // Correct options show soft light pastel green
                      optionClass = "border-2 border-emerald-400 bg-emerald-50 text-emerald-700 font-bold shadow-sm";
                      iconEl = <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0"><Check size={14} strokeWidth={3} /></div>;
                    } else if (isSelected) {
                      // Incorrect selected shows pink/red
                      optionClass = "border-2 border-pink-300 bg-pink-50 text-pink-700 font-bold shadow-sm";
                      iconEl = <div className="h-6 w-6 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-sm shrink-0"><X size={14} strokeWidth={3} /></div>;
                    } else {
                      // Non-involved options are muted/disabled after answering
                      optionClass = "border-2 border-slate-100 bg-slate-50/50 text-slate-400 opacity-60";
                    }
                  }

                  return (
                    <motion.button
                      id={`option-btn-${idx}`}
                      key={idx}
                      disabled={hasAnswered}
                      onClick={() => handleSelectOption(idx)}
                      whileHover={!hasAnswered ? { scale: 1.01 } : {}}
                      whileTap={!hasAnswered ? { scale: 0.99 } : {}}
                      className={`w-full p-4 rounded-2xl text-left transition-all duration-250 flex items-center justify-between gap-3 text-base ${optionClass} cursor-pointer`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                          ${isSelected ? 'bg-pink-400 text-white' : isCorrectAns && hasAnswered ? 'bg-emerald-400 text-white' : 'bg-sky-100 text-sky-500'}`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="break-words font-medium">{option}</span>
                      </div>
                      {iconEl}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* 6. Instant explanation and checkmark response box */}
            <AnimatePresence>
              {hasAnswered && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: 10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden border-t-2 border-dashed border-sky-100 pt-5 mt-5"
                >
                  {(() => {
                    const isCorrect = currentQuestion.type === "blank" ? isTypedCorrect : (selectedIdx === currentQuestion.correctAnswerIndex);
                    return (
                      <div className={`p-4 rounded-2xl flex flex-col md:flex-row items-start gap-4 shadow-inner ${
                        isCorrect
                          ? 'bg-emerald-50 border border-emerald-100 text-emerald-800'
                          : 'bg-rose-50 border border-thin border-rose-100 text-rose-900'
                      }`}>
                        <div className="shrink-0 mt-0.5">
                          {isCorrect ? (
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-extrabold text-xl animate-pulse">
                              🎉
                            </span>
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-500 font-extrabold text-xl animate-pulse">
                              💡
                            </span>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <h4 className="font-extrabold text-base flex items-center gap-2">
                            {isCorrect ? (
                              <span className="text-emerald-700">「答對了！恭喜你！」🍰</span>
                            ) : (
                              <span className="text-rose-700">
                                「答錯了，正確答案是：{currentQuestion.type === "blank" ? (currentQuestion.correctAnswers || []).join(" 或 ") : currentQuestion.options[currentQuestion.correctAnswerIndex]}」🐾
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-slate-600 leading-relaxed font-normal bg-white/70 backdrop-blur-sm p-3 rounded-xl border border-white/50 shadow-inner">
                            {currentQuestion.explanation}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="mt-5 flex justify-end">
                    <button
                      id="next-question-btn"
                      onClick={handleNext}
                      className="px-6 py-3 rounded-full bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 border-b-4 border-sky-600 hover:border-sky-700 active:border-b-0 cursor-pointer"
                    >
                      {currentIndex === questions.length - 1 ? "查看結算總分" : "下一題"}
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* 7. Settlement Screen / Result Screen */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/95 rounded-3xl p-8 border-4 border-pink-100 shadow-xl text-center backdrop-blur-md relative overflow-hidden"
          >
            {/* Playful background highlights */}
            <div className="absolute top-0 left-0 p-4 opacity-10 pointer-events-none select-none text-pink-300 text-7xl">🎈</div>
            <div className="absolute bottom-0 right-0 p-4 opacity-10 pointer-events-none select-none text-sky-300 text-7xl">☁️</div>

            <motion.div
              animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.05, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 3, repeatDelay: 1 }}
              className="inline-flex justify-center items-center h-24 w-24 rounded-full bg-gradient-to-b from-pink-50 to-pink-100 text-pink-400 font-extrabold text-5xl mb-6 shadow-inner border border-pink-200"
            >
              👑
            </motion.div>

            <h2 className="text-2xl md:text-3xl font-black text-rose-500 tracking-tight mb-2">
              ✨ 挑戰賽順利結算 ✨
            </h2>

            <p className={`text-xl font-bold mb-4 ${feedback.color}`}>
              {feedback.title}
            </p>

            {/* Score Showcase Bubble */}
            <div className="bg-gradient-to-br from-sky-50 to-sky-100/50 p-6 rounded-2xl max-w-sm mx-auto border border-sky-200 shadow-lg mb-6 transform hover:scale-105 transition-all">
              <span className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                🏆 FINAL TOTAL SCORE / 總得分 🏆
              </span>
              <div className="flex items-baseline justify-center gap-1.5 text-sky-600">
                <span className="text-5xl font-black">{score}</span>
                <span className="text-slate-400 font-medium text-lg">/</span>
                <span className="text-2xl font-bold text-slate-500">{questions.length}</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                答對率 {Math.round((score / questions.length) * 100) || 0}%
              </p>
            </div>

            <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed mb-8 font-medium">
              {feedback.description}
            </p>

            {/* History overview of questions answered correct / incorrect */}
            <div className="max-w-md mx-auto mb-8 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
              <h4 className="text-xs font-extrabold text-slate-400 mb-3 text-left uppercase tracking-wider px-1">
                📊 答題軌跡回顧
              </h4>
              <div className="flex flex-wrap gap-2.5 justify-start">
                {[...answersHistory]
                  .sort((a, b) => a.qIndex - b.qIndex)
                  .map((item) => (
                    <div
                      key={item.qIndex}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border ${
                        item.isCorrect
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-pink-50 border-pink-200 text-pink-700"
                      }`}
                    >
                      <span>第 {item.qIndex + 1} 題</span>
                      {item.isCorrect ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    </div>
                  ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                id="reset-play-btn"
                onClick={handleRestart}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 text-white font-extrabold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2.5 border-b-4 border-pink-600 hover:border-pink-700 active:border-b-0 cursor-pointer"
              >
                <RotateCcw size={18} />
                再挑戰一次
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
