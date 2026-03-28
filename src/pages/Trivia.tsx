import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/draft/GlassCard";
import CountdownTimer from "@/components/draft/CountdownTimer";
import PlayerStatusBadge from "@/components/draft/PlayerStatusBadge";
import { useTrivia } from "@/hooks/useTrivia";
import { useTriviaHost } from "@/hooks/useTriviaHost";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const Trivia = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("room");
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);

  // Get trivia session id
  useEffect(() => {
    if (!roomId) return;
    const load = async () => {
      const { data } = await supabase
        .from("trivia_sessions")
        .select("id")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data) setSessionId(data.id);

      const { data: m } = await supabase
        .from("room_members")
        .select("user_id, team_name, avatar, is_host")
        .eq("room_id", roomId);
      if (m) {
        setMembers(m);
        const me = m.find((x) => x.user_id === user?.id);
        setIsHost(me?.is_host ?? false);
      }
    };
    load();
  }, [roomId]);

  const { currentQuestion, submitted, respondedUsers, results, remainingSeconds, allAnswered, submitAnswer } =
    useTrivia({ roomId, userId: user?.id ?? null, sessionId });

  // Host drives the trivia engine from their browser
  useTriviaHost({ roomId, sessionId, isHost, memberCount: members.length });

  // Navigate to results when trivia engine broadcasts results
  useEffect(() => {
    if (results) {
      navigate(`/trivia-results?room=${roomId}`, { state: { results } });
    }
  }, [results, navigate, roomId]);

  const optionColors = [
    "from-blue-600/20 to-blue-500/5 hover:from-blue-600/30",
    "from-purple-600/20 to-purple-500/5 hover:from-purple-600/30",
    "from-emerald-600/20 to-emerald-500/5 hover:from-emerald-600/30",
    "from-rose-600/20 to-rose-500/5 hover:from-rose-600/30",
  ];

  if (!currentQuestion) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <p className="text-xl text-muted-foreground">Waiting for trivia to start...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg p-3 md:p-8 flex flex-col">
      {/* Player Status Bar */}
      <motion.div className="flex justify-center gap-3 md:gap-6 mb-4 md:mb-8 flex-wrap"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        {members.map((member) => (
          <PlayerStatusBadge
            key={member.user_id}
            name={member.team_name}
            avatar={member.avatar}
            submitted={respondedUsers.has(member.user_id)}
          />
        ))}
      </motion.div>

      {/* Timer */}
      <div className="flex justify-center mb-4 md:mb-6">
        <CountdownTimer
          key={currentQuestion.question_id}
          totalSeconds={15}
          serverRemainingSeconds={allAnswered ? 0 : remainingSeconds}
          size={80}
        />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.question_id}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", damping: 20 }}
            className="w-full"
          >
            <GlassCard strong className="p-5 md:p-8 mb-4 md:mb-8 text-center">
              <p className="text-xs text-muted-foreground mb-2">
                Question {currentQuestion.question_index + 1} of {currentQuestion.total_questions}
              </p>
              <h2 className="text-lg md:text-2xl lg:text-3xl font-bold text-foreground leading-snug">
                {currentQuestion.question}
              </h2>
            </GlassCard>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQuestion.options.map((option, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i }}
                  whileTap={!submitted ? { scale: 0.97 } : {}}
                  disabled={submitted}
                  onClick={() => submitAnswer(i)}
                  className={`p-4 rounded-lg text-left font-semibold text-foreground transition-all duration-200 bg-gradient-to-br border border-border/50 hover:border-border active:scale-95 ${optionColors[i]} ${submitted ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span className="text-muted-foreground mr-2 font-bold">{String.fromCharCode(65 + i)}.</span>
                  <span className="text-sm md:text-base">{option}</span>
                </motion.button>
              ))}
            </div>

            {submitted && !allAnswered && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="text-center mt-5 p-3 rounded-lg bg-accent/10 border border-accent/30">
                <p className="text-accent font-semibold text-sm">✅ Answer submitted — waiting for others...</p>
              </motion.div>
            )}

            {allAnswered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center mt-5 p-3 rounded-lg bg-primary/10 border border-primary/40"
              >
                <p className="text-primary font-bold text-sm">⚡ All players answered — next question incoming!</p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Trivia;
