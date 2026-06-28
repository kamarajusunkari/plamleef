"use client";
import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, ChevronRight, CheckCircle, XCircle, Zap, Star, BookOpen, FileText, Video, Layers, AlertTriangle, RotateCcw, Home, ChevronDown, ChevronUp, ExternalLink, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

const TYPE_ICON: Record<string, React.ReactNode> = {
  PDF: <FileText size={13} className="text-[#EF4444]" />,
  VIDEO: <Video size={13} className="text-[#3B82F6]" />,
  FLASHCARD: <Layers size={13} className="text-[#8B5CF6]" />,
};
const TYPE_BG: Record<string, string> = { PDF: "#FEF2F2", VIDEO: "#EFF6FF", FLASHCARD: "#F5F3FF" };

type Phase = "LOADING" | "INTRO" | "PLAYING" | "REVIEW" | "RESULTS";
const OPTION_LETTERS = ["A", "B", "C", "D"];

interface GameQuestion {
  id: string;
  text: string;
  options: string[];
  correct: number;
  explanation: string;
  topic: string;
  aiExplanation: string;
}

interface Resource {
  id: string;
  title: string;
  type: string;
  file_url: string | null;
}

function QuizContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useCurrentUser();

  const title           = searchParams.get("title")     ?? "Daily Quiz";
  const subject         = searchParams.get("subject")   ?? "General";
  const xpReward        = Number(searchParams.get("xp")        ?? "50");
  const questionCount   = Number(searchParams.get("questions") ?? "5");
  const timePerQuestion = Number(searchParams.get("time")      ?? "30");
  const assignmentId    = searchParams.get("id")        ?? "";
  const quizId          = searchParams.get("quizId")    ?? "";

  const [phase, setPhase] = useState<Phase>("LOADING");
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [relatedResources, setRelatedResources] = useState<Resource[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(timePerQuestion);
  const [showReview, setShowReview] = useState(false);
  const [showResources, setShowResources] = useState(false);

  // Results-phase AI explanation state
  const [aiExpanded, setAiExpanded] = useState<Record<string, boolean>>({});
  const [aiText, setAiText] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const aiTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // Attempt tracking
  const startTimeRef   = useRef<number>(Date.now());
  const attemptSavedRef = useRef(false);

  // Load questions for THIS specific quiz from the DB
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      try {
        let qs: GameQuestion[] = [];

        if (quizId) {
          // ── Primary path: load questions from the exact quiz ──────────
          const { data: rawQs } = await supabase
            .from("question")
            .select("id, question, options, answer, explanation")
            .eq("quiz_id", quizId)
            .order("created_at", { ascending: true });

          if (rawQs && rawQs.length > 0) {
            qs = rawQs.map(q => {
              const opts: string[]  = Array.isArray(q.options) ? q.options : [];
              const answerStr: string = Array.isArray(q.answer) ? q.answer[0] : (q.answer ?? "");
              const correct = Math.max(0, opts.indexOf(answerStr));
              return {
                id:            q.id,
                text:          q.question ?? "",
                options:       opts,
                correct,
                explanation:   q.explanation ?? `The correct answer is "${answerStr}".`,
                topic:         subject,
                aiExplanation: q.explanation ?? `The correct answer is "${answerStr}". Review your ${subject} notes.`,
              };
            }).filter(q => q.options.length >= 2);
          }

          // Fetch related resources via the quiz's subject
          const { data: quizMeta } = await supabase
            .from("quiz")
            .select("subject_id")
            .eq("id", quizId)
            .maybeSingle();

          if (quizMeta?.subject_id) {
            const { data: resources } = await supabase
              .from("resources")
              .select("id, title, type, file_url")
              .eq("subject_id", quizMeta.subject_id)
              .eq("visibility", "PUBLIC")
              .in("type", ["PDF", "VIDEO", "FLASHCARD"])
              .limit(6);
            if (!cancelled) setRelatedResources(resources ?? []);
          }
        }

        if (!cancelled) {
          setQuestions(qs);
          setAnswers(Array(qs.length).fill(null));
          setPhase("INTRO");
        }
      } catch {
        if (!cancelled) setPhase("INTRO");
      }
    }

    load();
    return () => { cancelled = true; };
  // quizId is the only thing that should trigger a reload
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  const totalQuestions = questions.length;
  const currentQ = questions[qIndex];
  const correct = answers.filter((a, i) => a !== null && questions[i] && a === questions[i].correct).length;
  const score = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
  const xpEarned = Math.round(xpReward * (score / 100));

  const handleAnswer = useCallback((optIdx: number) => {
    if (selected !== null) return;
    setSelected(optIdx);
    const newAnswers = [...answers];
    newAnswers[qIndex] = optIdx;
    setAnswers(newAnswers);
    setShowReview(true);
  }, [selected, answers, qIndex]);

  useEffect(() => {
    if (phase !== "PLAYING" || showReview) return;
    if (timeLeft <= 0) { handleAnswer(-1); return; }
    const t = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(t);
  }, [phase, timeLeft, showReview, handleAnswer]);

  const nextQuestion = () => {
    if (qIndex + 1 >= totalQuestions) {
      setPhase("RESULTS");
    } else {
      setQIndex(i => i + 1);
      setSelected(null);
      setShowReview(false);
      setTimeLeft(timePerQuestion);
    }
  };

  const generateAiExplanation = (qId: string, fullText: string) => {
    if (aiText[qId]) {
      setAiExpanded(p => ({ ...p, [qId]: !p[qId] }));
      return;
    }
    setAiExpanded(p => ({ ...p, [qId]: true }));
    setAiLoading(p => ({ ...p, [qId]: true }));
    setAiText(p => ({ ...p, [qId]: "" }));
    let i = 0;
    const delay = setTimeout(() => {
      const iv = setInterval(() => {
        i++;
        setAiText(p => ({ ...p, [qId]: fullText.slice(0, i) }));
        if (i >= fullText.length) {
          clearInterval(iv);
          setAiLoading(p => ({ ...p, [qId]: false }));
        }
      }, 12);
      aiTimers.current[qId] = iv;
    }, 700);
    return () => { clearTimeout(delay); clearInterval(aiTimers.current[qId]); };
  };

  const startQuiz = () => {
    startTimeRef.current = Date.now();
    attemptSavedRef.current = false;
    setPhase("PLAYING");
    setTimeLeft(timePerQuestion);
  };

  // ── Save attempt when results phase is reached ──────────────
  useEffect(() => {
    if (phase !== "RESULTS") return;
    if (attemptSavedRef.current) return;
    if (!user?.studentRecordId || !assignmentId) return;
    attemptSavedRef.current = true;

    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    const finalCorrect = answers.filter((a, i) => a !== null && questions[i] && a === questions[i].correct).length;
    const finalScore   = questions.length > 0 ? Math.round((finalCorrect / questions.length) * 100) : 0;
    const finalXp      = Math.round(xpReward * (finalScore / 100));

    (async () => {
      const supabase = createClient();
      try {
        const { data: attempt, error: aErr } = await supabase
          .from("assignment_attempts")
          .insert({
            assignment_id:      assignmentId,
            student_records_id: user.studentRecordId,
            score:              finalScore,
            performance:        finalScore,
            xp_earned:          finalXp,
            correct_count:      finalCorrect,
            time_taken:         timeTaken,
          })
          .select("id")
          .single();

        if (aErr) throw aErr;

        // Per-question answers
        if (questions.length > 0) {
          const rows = questions.map((q, i) => ({
            attempt_id:       attempt.id,
            question_id:      q.id,
            selected_options: answers[i] != null && answers[i] !== -1
              ? [q.options[answers[i] as number]]
              : [],
            is_correct:       answers[i] === q.correct,
          }));
          await supabase.from("assignment_answers").insert(rows).throwOnError();
        }

        // XP log
        if (finalXp > 0) {
          await supabase.from("xp_logs").insert({
            student_records_id: user.studentRecordId,
            xp:                 finalXp,
            source:             "ASSIGNMENT",
          });
          // Try RPC; silently ignore if not created yet
          await supabase.rpc("increment_xp", {
            p_student_records_id: user.studentRecordId,
            p_xp: finalXp,
          }).then(null, () => null);
        }
      } catch (err) {
        console.warn("Attempt save failed:", err);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const timePct = (timeLeft / timePerQuestion) * 100;
  const timerColor = timeLeft > 10 ? "#10B981" : timeLeft > 5 ? "#F59E0B" : "#EF4444";

  if (phase === "LOADING") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] to-[#1E3A5F] flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 size={40} className="animate-spin mx-auto mb-4 text-[#FF6B35]" />
          <div className="text-sm text-white/60">Loading questions...</div>
        </div>
      </div>
    );
  }

  if (phase === "INTRO") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] to-[#1E3A5F] flex items-start justify-center p-6 pt-10">
        <div className="w-full max-w-lg">
          <Link href="/student/assignments" className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-8 transition-colors">
            <ArrowLeft size={16} /> Back to Assignments
          </Link>

          <div className="bg-white rounded-3xl overflow-hidden">
            <div className="p-8 text-center border-b border-[#F0F4FA]">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF6B35] to-[#FFB347] flex items-center justify-center text-4xl mx-auto mb-4">
                📋
              </div>
              <div className="text-xl font-bold text-[#1A2035] mb-1">{title}</div>
              <div className="text-sm text-[#7A869A] mb-6">{subject}</div>

              {totalQuestions === 0 && (
                <div className="mb-4 p-3 bg-[#FFFBEB] rounded-xl border border-[#F59E0B]/30 text-xs text-[#F59E0B]">
                  No questions found for {subject}. Please try a different subject.
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: "Questions", value: totalQuestions || questionCount, icon: "❓" },
                  { label: "Time/Q", value: `${timePerQuestion}s`, icon: "⏱️" },
                  { label: "XP Reward", value: `+${xpReward}`, icon: "⚡" },
                ].map(s => (
                  <div key={s.label} className="bg-[#F8FAFC] rounded-xl p-3 text-center">
                    <div className="text-xl mb-1">{s.icon}</div>
                    <div className="text-sm font-bold text-[#1A2035]">{s.value}</div>
                    <div className="text-[10px] text-[#7A869A]">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-[#FFF7F4] rounded-xl p-3 text-left mb-6 border border-[#FFD4C2]">
                <div className="text-xs font-bold text-[#FF6B35] mb-1">💡 Quiz Rules</div>
                <ul className="text-xs text-[#7A869A] space-y-1">
                  <li>• You have {timePerQuestion} seconds per question</li>
                  <li>• Unanswered questions score 0 points</li>
                  <li>• XP is proportional to your score</li>
                  <li>• Review explanations after each answer</li>
                </ul>
              </div>

              <button
                onClick={startQuiz}
                disabled={totalQuestions === 0}
                className="w-full py-3.5 bg-gradient-to-r from-[#FF6B35] to-[#FFB347] text-white rounded-xl font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {totalQuestions === 0 ? "No Questions Available" : "Start Quiz →"}
              </button>
            </div>

            {/* Resources accordion */}
            {relatedResources.length > 0 && (
              <div className="border-t border-[#F0F4FA]">
                <button
                  onClick={() => setShowResources(v => !v)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                      <BookOpen size={14} className="text-[#3B82F6]" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-[#1A2035]">Study Resources</div>
                      <div className="text-[10px] text-[#7A869A]">
                        {relatedResources.length} resources for {subject} — review before you begin
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-[#3B82F6] bg-[#EFF6FF] px-2 py-0.5 rounded-full">Boost your score</span>
                    {showResources ? <ChevronUp size={16} className="text-[#7A869A]" /> : <ChevronDown size={16} className="text-[#7A869A]" />}
                  </div>
                </button>

                {showResources && (
                  <div className="px-6 pb-6 space-y-2">
                    {relatedResources.map(r => (
                      <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#E8EDF5] bg-[#F8FAFC]">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: TYPE_BG[r.type] ?? "#F8FAFC" }}>
                          {TYPE_ICON[r.type] ?? <BookOpen size={13} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-[#1A2035] truncate">{r.title}</div>
                          <div className="text-[10px] text-[#7A869A] mt-0.5">{r.type}</div>
                        </div>
                        <Link href="/student/resources" className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-[#3B82F6]">
                          Open <ExternalLink size={10} />
                        </Link>
                      </div>
                    ))}
                    <Link href="/student/resources" className="flex items-center justify-center gap-1.5 mt-3 py-2.5 rounded-xl border border-[#E8EDF5] text-xs font-semibold text-[#7A869A] hover:bg-[#F0F4FA]">
                      <BookOpen size={12} /> Browse all {subject} resources →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if ((phase === "PLAYING" || phase === "REVIEW") && currentQ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] to-[#1E3A5F] flex flex-col p-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="text-white/60 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="text-white/80 text-sm font-semibold">{title}</div>
          <div className="flex items-center gap-1.5 text-[#FF6B35] font-bold text-sm">
            <Zap size={14} />
            {xpReward} XP
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs text-white/60 mb-1">
            <span>Question {qIndex + 1} of {totalQuestions}</span>
            <span>{correct} correct so far</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#FF6B35] rounded-full transition-all duration-300" style={{ width: `${((qIndex + 1) / totalQuestions) * 100}%` }} />
          </div>
        </div>

        <div className="flex items-center justify-center mb-6">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
              <circle cx="32" cy="32" r="28" fill="none" stroke={timerColor} strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - timePct / 100)}`}
                strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold" style={{ color: timerColor }}>{Math.max(timeLeft, 0)}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
          <div className="bg-white rounded-2xl p-6 mb-4 flex-shrink-0">
            <div className="text-xs font-semibold text-[#FF6B35] mb-2">{subject} · Q{qIndex + 1}</div>
            <div className="text-lg font-bold text-[#1A2035] leading-relaxed">{currentQ.text}</div>
          </div>

          <div className="grid grid-cols-1 gap-3 mb-4">
            {currentQ.options.map((opt, i) => {
              let bgColor = "bg-white";
              let textColor = "text-[#1A2035]";
              let icon = null;

              if (showReview) {
                if (i === currentQ.correct) {
                  bgColor = "bg-[#ECFDF5]"; textColor = "text-[#10B981]";
                  icon = <CheckCircle size={18} className="text-[#10B981] shrink-0" />;
                } else if (i === selected && i !== currentQ.correct) {
                  bgColor = "bg-[#FEF2F2]"; textColor = "text-[#EF4444]";
                  icon = <XCircle size={18} className="text-[#EF4444] shrink-0" />;
                }
              }

              return (
                <button
                  key={i}
                  onClick={() => !showReview && handleAnswer(i)}
                  disabled={showReview}
                  className={`flex items-center gap-3 w-full text-left px-5 py-4 rounded-xl border-2 transition-all ${bgColor} ${textColor} ${!showReview ? "hover:border-[#FF6B35]/50 active:scale-[0.98]" : ""}`}
                  style={{ borderColor: showReview && i === currentQ.correct ? "#10B981" : showReview && i === selected ? "#EF4444" : selected === i ? "#FF6B35" : "transparent" }}
                >
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: showReview && i === currentQ.correct ? "#ECFDF5" : showReview && i === selected ? "#FEF2F2" : "#F0F4FA" }}>
                    {OPTION_LETTERS[i]}
                  </span>
                  <span className="flex-1 text-sm font-medium">{opt}</span>
                  {icon}
                </button>
              );
            })}
          </div>

          {showReview && (
            <div className="space-y-3">
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20">
                <div className="text-xs font-bold text-[#FF6B35] mb-1">
                  {selected === currentQ.correct ? "✓ Correct!" : selected === -1 ? "⏰ Time&apos;s up!" : "✗ Incorrect"}
                </div>
                <div className="text-sm text-white/90">{currentQ.explanation}</div>
              </div>
              <button onClick={nextQuestion} className="w-full py-3.5 bg-gradient-to-r from-[#FF6B35] to-[#FFB347] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                {qIndex + 1 >= totalQuestions ? "View Results" : "Next Question"}
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // RESULTS
  const stars = score >= 90 ? 3 : score >= 70 ? 2 : score >= 50 ? 1 : 0;
  const resultLabel = score >= 90 ? "Outstanding! 🎉" : score >= 70 ? "Great Job! 👏" : score >= 50 ? "Good Effort! 💪" : "Keep Practicing! 📚";
  const wrongQuestions = questions.filter((q, i) => answers[i] !== q.correct && answers[i] !== -1 && answers[i] !== null);
  const skippedQuestions = questions.filter((q, i) => answers[i] === -1 || answers[i] === null);
  const weakTopics = Array.from(new Set(wrongQuestions.map(q => q.topic)));
  const scoreColor = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] to-[#1E3A5F] p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl overflow-hidden mb-4">
          <div className="p-6 sm:p-8">
            <div className="flex justify-center gap-2 mb-3">
              {[1, 2, 3].map(s => (
                <Star key={s} size={32} className="transition-all duration-500"
                  style={{ color: s <= stars ? "#FFB347" : "#E2E8F0", fill: s <= stars ? "#FFB347" : "#E2E8F0" }} />
              ))}
            </div>
            <div className="text-center mb-5">
              <div className="text-2xl font-bold text-[#1A2035]">{resultLabel}</div>
              <div className="text-sm text-[#7A869A] mt-0.5">{title} · {subject}</div>
            </div>

            <div className="flex items-center gap-6 justify-center">
              <div className="relative w-28 h-28 shrink-0">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
                  <circle cx="56" cy="56" r="48" fill="none" stroke="#F0F4FA" strokeWidth="8" />
                  <circle cx="56" cy="56" r="48" fill="none" stroke={scoreColor}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 48}`}
                    strokeDashoffset={`${2 * Math.PI * 48 * (1 - score / 100)}`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-[#1A2035]">{score}%</span>
                  <span className="text-[10px] text-[#7A869A]">{correct}/{totalQuestions}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 flex-1">
                <div className="bg-[#FFF7F4] rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-[#FF6B35]">+{xpEarned}</div>
                  <div className="text-[10px] text-[#7A869A]">XP Earned</div>
                </div>
                <div className="bg-[#ECFDF5] rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-[#10B981]">{correct}</div>
                  <div className="text-[10px] text-[#7A869A]">Correct</div>
                </div>
                <div className="bg-[#FEF2F2] rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-[#EF4444]">{totalQuestions - correct}</div>
                  <div className="text-[10px] text-[#7A869A]">Wrong</div>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-[#7A869A]">{skippedQuestions.length}</div>
                  <div className="text-[10px] text-[#7A869A]">Skipped</div>
                </div>
              </div>
            </div>
          </div>

          {weakTopics.length > 0 && (
            <div className="mx-4 sm:mx-6 mb-4 bg-[#FFF7F4] rounded-2xl p-4 border border-[#FFD4C2]">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={15} className="text-[#FF6B35] shrink-0" />
                <span className="text-sm font-bold text-[#FF6B35]">Weak Topics Detected</span>
              </div>
              <p className="text-xs text-[#7A869A] mb-2.5">
                You struggled with {weakTopics.length} topic{weakTopics.length > 1 ? "s" : ""} in this quiz. Review the AI explanations below and practice more.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {weakTopics.map(t => (
                  <span key={t} className="text-xs font-semibold bg-white border border-[#FFD4C2] text-[#FF6B35] px-2.5 py-1 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          )}

          <div className="px-4 sm:px-6 pb-4">
            <div className="text-xs font-bold text-[#7A869A] uppercase tracking-wider mb-3">Answer Review</div>
            <div className="space-y-2">
              {questions.map((q, i) => {
                const isCorrect = answers[i] === q.correct;
                const isSkipped = answers[i] === -1 || answers[i] === null;
                const isWrong = !isCorrect && !isSkipped;
                const isAiOpen = !!aiExpanded[q.id];
                const isAiGenerating = !!aiLoading[q.id];
                const currentAiText = aiText[q.id] ?? "";

                return (
                  <div key={q.id} className="rounded-2xl border overflow-hidden transition-all"
                    style={{ borderColor: isCorrect ? "#A7F3D0" : isSkipped ? "#E8EDF5" : "#FCA5A5" }}>
                    <div className="flex items-start gap-3 p-3"
                      style={{ background: isCorrect ? "#F0FDF4" : isSkipped ? "#F8FAFC" : "#FFF5F5" }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: isCorrect ? "#DCFCE7" : isSkipped ? "#F0F4FA" : "#FEE2E2" }}>
                        {isCorrect
                          ? <CheckCircle size={14} className="text-[#10B981]" />
                          : isSkipped
                            ? <Clock size={14} className="text-[#7A869A]" />
                            : <XCircle size={14} className="text-[#EF4444]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[#1A2035] leading-snug">Q{i + 1}. {q.text}</div>
                        {isWrong && (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            <span className="text-[10px] text-[#EF4444]">Your answer: {answers[i] !== null && answers[i] !== -1 ? q.options[answers[i]!] : "—"}</span>
                            <span className="text-[10px] text-[#10B981] font-semibold">✓ Correct: {q.options[q.correct]}</span>
                          </div>
                        )}
                        {isSkipped && (
                          <div className="text-[10px] text-[#7A869A] mt-0.5">Skipped · Correct: {q.options[q.correct]}</div>
                        )}
                      </div>

                      {isWrong && (
                        <button
                          onClick={() => generateAiExplanation(q.id, q.aiExplanation)}
                          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all hover:opacity-90 active:scale-95"
                          style={{ background: isAiOpen ? "#8B5CF6" : "linear-gradient(135deg, #8B5CF6, #6366F1)", color: "white" }}
                        >
                          <Sparkles size={11} />
                          {isAiOpen ? "Hide" : "AI Explain"}
                        </button>
                      )}
                    </div>

                    {isWrong && isAiOpen && (
                      <div className="border-t border-[#EDE9FE] bg-[#FAFAFF] p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] flex items-center justify-center">
                            <Sparkles size={11} className="text-white" />
                          </div>
                          <span className="text-xs font-bold text-[#8B5CF6]">AI Explanation</span>
                          {isAiGenerating && (
                            <span className="flex items-center gap-1 text-[10px] text-[#8B5CF6]">
                              <span className="w-1 h-1 rounded-full bg-[#8B5CF6] animate-bounce" style={{ animationDelay: "0ms" }} />
                              <span className="w-1 h-1 rounded-full bg-[#8B5CF6] animate-bounce" style={{ animationDelay: "150ms" }} />
                              <span className="w-1 h-1 rounded-full bg-[#8B5CF6] animate-bounce" style={{ animationDelay: "300ms" }} />
                              Generating…
                            </span>
                          )}
                        </div>
                        {isAiGenerating && currentAiText === "" ? (
                          <div className="space-y-1.5">
                            {[80, 60, 90, 40].map((w, k) => (
                              <div key={k} className="h-2.5 bg-[#EDE9FE] rounded-full animate-pulse" style={{ width: `${w}%` }} />
                            ))}
                          </div>
                        ) : (
                          <pre className="text-xs text-[#374151] whitespace-pre-wrap font-sans leading-relaxed">
                            {currentAiText}
                            {isAiGenerating && <span className="inline-block w-0.5 h-3 bg-[#8B5CF6] animate-pulse ml-0.5 align-middle" />}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {relatedResources.length > 0 && (
          <div className="bg-white rounded-3xl overflow-hidden mb-4">
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-[#ECFDF5] flex items-center justify-center">
                    <BookOpen size={14} className="text-[#10B981]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#1A2035]">Suggested Resources</div>
                    <div className="text-[10px] text-[#7A869A]">Keep levelling up in {subject}</div>
                  </div>
                </div>
                <Link href="/student/resources" className="text-xs font-semibold text-[#10B981] hover:underline">See all</Link>
              </div>
              <div className="space-y-2">
                {relatedResources.slice(0, 4).map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#E8EDF5] hover:bg-[#F8FAFC] transition-colors">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: TYPE_BG[r.type] ?? "#F8FAFC" }}>
                      {TYPE_ICON[r.type] ?? <BookOpen size={13} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#1A2035] truncate">{r.title}</div>
                      <div className="text-[10px] text-[#7A869A] mt-0.5">{r.type}</div>
                    </div>
                    <Link href="/student/resources" className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-[#3B82F6]">
                      Open <ExternalLink size={10} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Link href="/student/assignments"
            className="flex items-center justify-center gap-1.5 py-3 bg-white/10 backdrop-blur-sm rounded-2xl text-xs font-semibold text-white hover:bg-white/20 transition-colors">
            <ArrowLeft size={14} /> Back
          </Link>
          <button
            onClick={() => { setPhase("INTRO"); setQIndex(0); setAnswers(Array(totalQuestions).fill(null)); setSelected(null); setAiExpanded({}); setAiText({}); setAiLoading({}); }}
            className="flex items-center justify-center gap-1.5 py-3 bg-white/10 backdrop-blur-sm rounded-2xl text-xs font-semibold text-white hover:bg-white/20 transition-colors">
            <RotateCcw size={14} /> Retry
          </button>
          <Link href="/student/dashboard"
            className="flex items-center justify-center gap-1.5 py-3 bg-gradient-to-r from-[#FF6B35] to-[#FFB347] rounded-2xl text-xs font-bold text-white hover:opacity-90 transition-opacity">
            <Home size={14} /> Dashboard
          </Link>
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}

export default function StudentQuizPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A1628] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" /></div>}>
      <QuizContent />
    </Suspense>
  );
}
