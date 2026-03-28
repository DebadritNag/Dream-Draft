import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/draft/GlassCard";
import NeonButton from "@/components/draft/NeonButton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { TriviaResults } from "@/hooks/useTrivia";

const TriviaResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuth();
  const roomId = searchParams.get("room");
  const results: TriviaResults | null = location.state?.results ?? null;

  const [showDraftOrder, setShowDraftOrder] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowDraftOrder(true), 2500);
    const t2 = setTimeout(() => setShowAnswers(true), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (!roomId) return;
    supabase.from("room_members").select("user_id, team_name, avatar, is_host").eq("room_id", roomId)
      .then(({ data }) => {
        if (data) {
          setMembers(data);
          setIsHost(data.find((m) => m.user_id === user?.id)?.is_host ?? false);
        }
      });

    // Listen for room status → drafting to redirect non-hosts
    const channel = supabase
      .channel(`trivia-results:${roomId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, (payload) => {
        if (payload.new.status === "drafting") navigate(`/draft?room=${roomId}`);
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [roomId, user?.id, navigate]);

  useEffect(() => {
    if (!results?.correct_answers) return;
    // correct_answers is already { question_id: correct_index } from the broadcast
    // We don't need to re-fetch from DB — just display what we have
  }, [results]);

  const leaderboard = results
    ? Object.entries(results.scores)
        .map(([userId, score]) => ({
          userId,
          score,
          member: members.find((m) => m.user_id === userId),
        }))
        .sort((a, b) => b.score - a.score)
    : [];

  const draftOrderMembers = results?.draft_order.map((uid) =>
    members.find((m) => m.user_id === uid)
  ).filter(Boolean) ?? [];

  return (
    <div className="min-h-screen gradient-bg p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <motion.h1
          className="text-3xl md:text-4xl font-black text-center text-foreground neon-text-purple"
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          🏆 Trivia Results
        </motion.h1>

        {/* Leaderboard */}
        <div className="space-y-3">
          {leaderboard.map(({ userId, score, member }, i) => (
            <motion.div key={userId}
              initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.2, type: "spring" }}>
              <GlassCard className="p-4 flex items-center gap-4" glow={i === 0 ? "green" : "none"}>
                <span className={`text-2xl font-black ${i === 0 ? "text-accent neon-text-blue" : "text-muted-foreground"}`}>
                  #{i + 1}
                </span>
                <span className="text-2xl">{member?.avatar ?? "👤"}</span>
                <div className="flex-1">
                  <p className="font-bold text-foreground">{member?.team_name ?? userId}</p>
                  <p className="text-xs text-muted-foreground">{score} pts</p>
                </div>
                <span className="text-xl font-bold text-foreground">
                  {results?.correct_answers?.[userId] ?? 0}/5 ✓
                </span>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Draft Order Reveal */}
        <AnimatePresence>
          {showDraftOrder && draftOrderMembers.length > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <h2 className="text-2xl font-black text-center text-foreground neon-text-blue">📋 Draft Order</h2>
              <div className="space-y-2">
                {draftOrderMembers.map((member, i) => (
                  <motion.div key={member.user_id}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.4, type: "spring" }}>
                    <GlassCard className="p-4 flex items-center gap-4">
                      <span className="text-xl">{["1️⃣","2️⃣","3️⃣","4️⃣"][i]}</span>
                      <span className="text-xl">{member.avatar}</span>
                      <span className="font-bold text-foreground">{member.team_name}</span>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Correct Answers */}
        <AnimatePresence>
          {showAnswers && questions.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <h2 className="text-xl font-bold text-foreground text-center">Correct Answers</h2>
              {questions.map((q, i) => (
                <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15 }}>
                  <GlassCard className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Q{i + 1}: {q.question}</p>
                    <p className="font-semibold text-accent">✅ {q.options[q.correct_answer]}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div className="text-center pt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 5.5 }}>
          {isHost && (
            <NeonButton variant="blue" size="lg" onClick={async () => {
              // Set initial turn timer when starting draft
              await supabase.from("rooms").update({
                status: "drafting",
                current_turn: 0,
                turn_expires_at: new Date(Date.now() + 30000).toISOString(),
              }).eq("id", roomId);
              navigate(`/draft?room=${roomId}`);
            }}>
              🎯 Start Draft
            </NeonButton>
          )}
          {!isHost && (
            <p className="text-muted-foreground text-sm animate-pulse">Waiting for host to start the draft...</p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TriviaResults;
