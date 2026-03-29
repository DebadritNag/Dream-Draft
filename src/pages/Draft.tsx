import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Wifi, WifiOff, Zap, Search } from "lucide-react";
import { useDraft } from "@/hooks/useDraft";
import { useRoomRealtime } from "@/hooks/useRoomRealtime";
import { usePresence, getSessionId } from "@/hooks/usePresence";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { playDraftSound } from "@/lib/sounds";
import type { Tables } from "@/lib/supabase";

type Player = Tables<"players"> & { position: string };

const posColor: Record<string, string> = {
  GK: "#f59e0b", CB: "#10b981", FB: "#14b8a6",
  MID: "#38bdf8", WING: "#a78bfa", ST: "#f43f5e",
};
const posGlow: Record<string, string> = {
  GK: "rgba(245,158,11,0.6)", CB: "rgba(16,185,129,0.6)", FB: "rgba(20,184,166,0.6)",
  MID: "rgba(56,189,248,0.6)", WING: "rgba(167,139,250,0.6)", ST: "rgba(244,63,94,0.6)",
};

// FIFA-style player card
function PlayerCard({ player, onPick, disabled, revealed }: {
  player: Player; onPick: () => void; disabled: boolean; revealed: boolean;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-60, 60], [12, -12]);
  const rotateY = useTransform(x, [-60, 60], [-12, 12]);
  const color = posColor[player.position] ?? "#60a5fa";
  const glow = posGlow[player.position] ?? "rgba(96,165,250,0.6)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.7, rotateY: 180 }}
      animate={revealed ? { opacity: 1, y: 0, scale: 1, rotateY: 0 } : {}}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      style={{ perspective: 800 }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - rect.left - rect.width / 2);
        y.set(e.clientY - rect.top - rect.height / 2);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      className="relative cursor-pointer select-none"
      onClick={!disabled ? onPick : undefined}
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d",
          background: `linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)`,
          borderColor: disabled ? "rgba(255,255,255,0.08)" : color,
          boxShadow: disabled ? "none" : `0 0 20px ${glow}, 0 0 40px ${glow}40`,
        }}
        whileHover={!disabled ? { scale: 1.08, y: -8 } : {}}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative w-36 rounded-2xl overflow-hidden border">
        {/* Top accent */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

        {/* Rating + position */}
        <div className="px-3 pt-2 pb-1 flex items-start justify-between">
          <div>
            <div className="text-3xl font-black leading-none" style={{ color }}>{player.rating}</div>
            <div className="text-xs font-black mt-0.5" style={{ color }}>{player.position}</div>
          </div>
          <div className="text-3xl">⚽</div>
        </div>

        {/* Player name */}
        <div className="px-3 py-2 text-center">
          <p className="text-white font-black text-sm leading-tight truncate">{player.name.split(" ").pop()}</p>
          <p className="text-white/40 text-xs truncate">{player.club}</p>
        </div>

        {/* Mini stats */}
        <div className="px-3 pb-3 space-y-1">
          {[
            { label: "PAC", val: Math.min(99, player.rating + Math.floor(Math.random() * 6) - 3) },
            { label: "SHO", val: Math.min(99, player.rating + Math.floor(Math.random() * 6) - 3) },
            { label: "PAS", val: Math.min(99, player.rating + Math.floor(Math.random() * 6) - 3) },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className="text-white/40 text-xs w-6">{s.label}</span>
              <div className="flex-1 h-1 rounded-full bg-white/10">
                <div className="h-full rounded-full" style={{ width: `${s.val}%`, background: color }} />
              </div>
              <span className="text-white/60 text-xs w-5 text-right">{s.val}</span>
            </div>
          ))}
        </div>

        {/* Pick button */}
        {!disabled && (
          <div className="px-3 pb-3">
            <div className="w-full py-1.5 rounded-lg text-center text-xs font-black"
              style={{ background: `${color}25`, color, border: `1px solid ${color}60` }}>
              PICK
            </div>
          </div>
        )}

        {/* Shimmer */}
        {!disabled && (
          <motion.div className="absolute inset-0 pointer-events-none"
            style={{ background: `linear-gradient(105deg, transparent 40%, ${color}15 50%, transparent 60%)` }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 2 }} />
        )}
      </motion.div>
    </motion.div>
  );
}

// Formation slot
function FormationSlot({ player, index, getPlayer }: {
  player?: Tables<"draft_picks">; index: number; getPlayer: (id: string) => Player | undefined;
}) {
  const p = player ? getPlayer(player.player_id) : undefined;
  const color = p ? (posColor[p.position] ?? "#60a5fa") : "rgba(255,255,255,0.1)";
  return (
    <motion.div
      initial={player ? { scale: 0, opacity: 0 } : {}}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="flex flex-col items-center gap-1">
      <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg"
        style={{ borderColor: color, background: p ? `${color}20` : "rgba(255,255,255,0.03)", boxShadow: p ? `0 0 12px ${color}60` : "none" }}>
        {p ? "⚽" : <span className="text-white/20 text-xs">+</span>}
      </div>
      {p && <p className="text-white/60 text-xs font-bold truncate max-w-[52px] text-center">{p.name.split(" ").pop()}</p>}
      {!p && <p className="text-white/15 text-xs">{index + 1}</p>}
    </motion.div>
  );
}

export default function Draft() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("room");
  const { user } = useAuth();

  const [members, setMembers] = useState<any[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(30);
  const [drafting, setDrafting] = useState(false);
  const [revealedCards, setRevealedCards] = useState(false);
  const [autoPickBanner, setAutoPickBanner] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState("");
  const [pickedCardId, setPickedCardId] = useState<string | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    room, picks, availablePlayers, myPicks, loading,
    isMyTurn, currentTurnUserId, draftOrder, isDraftComplete,
    lastPickedPlayerId, getRemainingSeconds, draftPlayer,
    applyPick, applyRoomUpdate, loadFromDB, getPlayer,
  } = useDraft({ roomId, userId: user?.id ?? null });

  const sessionId = getSessionId();
  const presenceUser = user && roomId ? {
    user_id: user.id, session_id: sessionId,
    display_name: user.email ?? "",
    avatar: members.find((m) => m.user_id === user.id)?.avatar ?? "⚽",
    online_at: new Date().toISOString(),
  } : null;
  const { isDuplicateSession } = usePresence(roomId, presenceUser);

  useEffect(() => {
    if (!roomId) return;
    supabase.from("room_members").select("user_id, team_name, avatar")
      .eq("room_id", roomId).then(({ data }) => { if (data) setMembers(data); });
  }, [roomId]);

  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const update = () => setRemainingSeconds(getRemainingSeconds());
    update();
    timerIntervalRef.current = setInterval(update, 500);
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [room?.turn_expires_at, getRemainingSeconds]);

  const membersRef = useRef(members);
  useEffect(() => { membersRef.current = members; }, [members]);

  const { connected, reconnecting } = useRoomRealtime({
    roomId,
    onRoomUpdate: useCallback((update: any) => {
      applyRoomUpdate(update);
      if (update.status === "complete") navigate(`/results?room=${roomId}`);
    }, [applyRoomUpdate, navigate, roomId]),
    onDraftPick: useCallback((pick: any) => {
      applyPick(pick); playDraftSound();
      const member = membersRef.current.find((m: any) => m.user_id === pick.user_id);
      if (member && pick.user_id !== user?.id) toast(`${member.team_name} drafted! ⚽`);
    }, [applyPick, user?.id]),
  });

  const wasReconnecting = useRef(false);
  useEffect(() => {
    if (wasReconnecting.current && connected) { loadFromDB(false); toast("Reconnected"); }
    wasReconnecting.current = reconnecting;
  }, [connected, reconnecting, loadFromDB]);

  useEffect(() => {
    if (isDraftComplete) navigate(`/results?room=${roomId}`);
  }, [isDraftComplete, navigate, roomId]);

  // Reveal cards when turn changes
  useEffect(() => {
    setRevealedCards(false);
    setPickedCardId(null);
    const t = setTimeout(() => setRevealedCards(true), 300);
    return () => clearTimeout(t);
  }, [room?.current_turn]);

  // Auto-pick banner
  useEffect(() => {
    if (isMyTurn && remainingSeconds === 0) {
      setAutoPickBanner(true);
      const t = setTimeout(() => setAutoPickBanner(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isMyTurn, remainingSeconds]);

  // 5 random draft cards from available players (reshuffled each turn)
  const draftCards = useMemo(() => {
    if (availablePlayers.length === 0) return [];
    const shuffled = [...availablePlayers].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.current_turn, availablePlayers.length]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    return availablePlayers
      .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.club.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 8);
  }, [search, availablePlayers]);

  const handleDraft = async (player: Player) => {
    if (!isMyTurn || drafting || isDuplicateSession) return;
    setDrafting(true);
    setPickedCardId(player.id);
    setShowSearch(false);
    await new Promise((r) => setTimeout(r, 600)); // card fly animation
    const { error } = await draftPlayer(player.id);
    if (error) {
      toast.error(error === "Player already drafted" ? "⚠️ Just taken!" : error);
      loadFromDB(true);
      setPickedCardId(null);
    }
    setDrafting(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <motion.p className="text-blue-400 text-xl font-black tracking-widest"
        animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>
        LOADING DRAFT...
      </motion.p>
    </div>
  );

  const totalPicks = members.length * (room?.picks_per_user ?? 5);
  const currentMember = members.find((m) => m.user_id === currentTurnUserId);
  const myMember = members.find((m) => m.user_id === user?.id);
  const picksPerUser = room?.picks_per_user ?? 5;

  return (
    <div className="h-screen bg-[#020617] flex flex-col overflow-hidden select-none"
      style={{ backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(139,92,246,0.06) 0%, transparent 60%)" }}>

      {/* Pitch lines background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(255,255,255,0.5) 60px, rgba(255,255,255,0.5) 61px), repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(255,255,255,0.5) 60px, rgba(255,255,255,0.5) 61px)" }} />

      {/* My turn glow */}
      {isMyTurn && (
        <motion.div className="fixed inset-0 pointer-events-none"
          animate={{ boxShadow: ["inset 0 0 80px rgba(59,130,246,0.05)", "inset 0 0 120px rgba(59,130,246,0.12)", "inset 0 0 80px rgba(59,130,246,0.05)"] }}
          transition={{ duration: 2, repeat: Infinity }} />
      )}

      {/* Auto-pick banner */}
      <AnimatePresence>
        {autoPickBanner && (
          <motion.div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl border border-amber-500/50 bg-amber-500/15 backdrop-blur-xl flex items-center gap-3"
            initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }}
            style={{ boxShadow: "0 0 30px rgba(245,158,11,0.4)" }}>
            <motion.span className="text-xl" animate={{ rotate: [-10, 10, -10] }} transition={{ duration: 0.3, repeat: 5 }}>⏱</motion.span>
            <span className="text-amber-300 font-black text-sm tracking-wide">TIME EXPIRED — AUTO PICK</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOP STATUS BAR ── */}
      <div className="relative z-20 flex items-center justify-between px-4 py-2 border-b border-white/5"
        style={{ background: "rgba(2,6,23,0.95)", backdropFilter: "blur(20px)" }}>

        {/* Left: Live + round */}
        <div className="flex items-center gap-3 min-w-[140px]">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30">
            <motion.div className="w-1.5 h-1.5 rounded-full bg-red-400" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} />
            <span className="text-red-400 text-xs font-black tracking-widest">LIVE</span>
          </div>
          <span className="text-white/30 text-xs font-semibold hidden sm:block">
            {picks.length}/{totalPicks} picks
          </span>
        </div>

        {/* Center: Turn status */}
        <AnimatePresence mode="wait">
          {isMyTurn ? (
            <motion.div key="my" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
              className="flex items-center gap-2 px-5 py-1.5 rounded-full border"
              style={{ background: "rgba(59,130,246,0.15)", borderColor: "rgba(59,130,246,0.5)", boxShadow: "0 0 24px rgba(59,130,246,0.4)" }}>
              <motion.div animate={{ rotate: [0, 20, -20, 0] }} transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1 }}>
                <Zap className="w-3.5 h-3.5 text-blue-400" />
              </motion.div>
              <span className="text-blue-200 text-xs font-black tracking-widest">YOUR PICK</span>
            </motion.div>
          ) : (
            <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-white/30 text-xs font-semibold tracking-wide">
              {currentMember ? `${currentMember.team_name} is picking...` : "Draft in progress"}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right: Timer + connection */}
        <div className="flex items-center gap-3 min-w-[140px] justify-end">
          {reconnecting && <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
          {connected && !reconnecting && <Wifi className="w-3.5 h-3.5 text-emerald-400/60" />}
          {/* Countdown */}
          <motion.div
            animate={remainingSeconds <= 5 && remainingSeconds > 0 ? { x: [-2, 2, -2, 2, 0] } : {}}
            transition={{ duration: 0.3, repeat: remainingSeconds <= 5 ? Infinity : 0 }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border"
            style={{
              borderColor: remainingSeconds <= 5 ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.1)",
              background: remainingSeconds <= 5 ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.03)",
              boxShadow: remainingSeconds <= 5 ? "0 0 16px rgba(239,68,68,0.4)" : "none",
            }}>
            <span className="font-black text-sm tabular-nums"
              style={{ color: remainingSeconds <= 5 ? "#ef4444" : remainingSeconds <= 10 ? "#f59e0b" : "rgba(255,255,255,0.7)" }}>
              {remainingSeconds}s
            </span>
          </motion.div>
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm border border-white/10">
            {myMember?.avatar ?? "⚽"}
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ── CENTER: Draft Arena ── */}
        <div className="flex-1 flex flex-col items-center justify-between py-4 px-4 overflow-hidden">

          {/* Team vs Team */}
          <motion.div className="flex items-center gap-6 mb-4"
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
            {members.slice(0, 2).map((m, i) => {
              const isCurrent = m.user_id === currentTurnUserId;
              const isMe = m.user_id === user?.id;
              return (
                <div key={m.user_id} className={`flex items-center gap-2 ${i === 1 ? "flex-row-reverse" : ""}`}>
                  <motion.div
                    animate={isCurrent ? { boxShadow: ["0 0 12px rgba(59,130,246,0.4)", "0 0 24px rgba(59,130,246,0.7)", "0 0 12px rgba(59,130,246,0.4)"] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-lg border"
                    style={{ borderColor: isCurrent ? "rgba(59,130,246,0.7)" : "rgba(255,255,255,0.1)", background: isCurrent ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)" }}>
                    {m.avatar}
                  </motion.div>
                  <div className={i === 1 ? "text-right" : ""}>
                    <p className="text-white font-black text-sm">{m.team_name}</p>
                    <p className="text-white/30 text-xs">{isMe ? "You · " : ""}{picks.filter((p) => p.user_id === m.user_id).length} picks</p>
                  </div>
                </div>
              );
            })}
            <div className="text-white/20 font-black text-base px-2">VS</div>
          </motion.div>

          {/* Draft cards */}
          <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full">
            {isMyTurn ? (
              <>
                <motion.p className="text-white/50 text-xs uppercase tracking-widest font-semibold"
                  animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2, repeat: Infinity }}>
                  Choose your player
                </motion.p>
                <div className="flex gap-3 flex-wrap justify-center">
                  {draftCards.map((player, i) => (
                    <motion.div key={player.id}
                      animate={pickedCardId === player.id ? { scale: 1.2, y: -40, opacity: 0 } : {}}
                      transition={{ duration: 0.5, ease: "easeInOut" }}>
                      <PlayerCard
                        player={player as Player}
                        onPick={() => handleDraft(player as Player)}
                        disabled={drafting || isDuplicateSession}
                        revealed={revealedCards}
                      />
                    </motion.div>
                  ))}
                </div>
                {/* Search fallback */}
                <button onClick={() => setShowSearch((v) => !v)}
                  className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs font-semibold transition-colors">
                  <Search className="w-3 h-3" />
                  {showSearch ? "Hide search" : "Search all players"}
                </button>
                <AnimatePresence>
                  {showSearch && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                      className="w-full max-w-sm">
                      <input value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search players..."
                        className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/40 mb-2" />
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {searchResults.map((p) => (
                          <motion.button key={p.id} whileHover={{ x: 4 }} onClick={() => handleDraft(p as Player)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-all">
                            <span className="font-black text-sm" style={{ color: posColor[p.position] ?? "#60a5fa" }}>{p.rating}</span>
                            <span className="text-xs font-bold" style={{ color: posColor[p.position] ?? "#60a5fa" }}>{p.position}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs font-bold truncate">{p.name}</p>
                              <p className="text-white/30 text-xs truncate">{p.club}</p>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4">
                {/* Waiting cards (face down) */}
                <div className="flex gap-3">
                  {[...Array(5)].map((_, i) => (
                    <motion.div key={i}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                      className="w-36 h-48 rounded-2xl border border-white/8 bg-gradient-to-b from-white/5 to-white/[0.02] flex items-center justify-center">
                      <span className="text-4xl opacity-20">⚽</span>
                    </motion.div>
                  ))}
                </div>
                <motion.p className="text-white/30 text-sm font-semibold"
                  animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
                  {currentMember?.team_name ?? "Opponent"} is choosing...
                </motion.p>
              </div>
            )}
          </div>

          {/* Recent picks bar */}
          {picks.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
              {[...picks].reverse().slice(0, 8).map((pick) => {
                const p = getPlayer(pick.player_id);
                const color = posColor[p?.position ?? "MID"] ?? "#60a5fa";
                return (
                  <div key={pick.id} className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/8 bg-white/[0.03]">
                    <span className="text-xs font-black" style={{ color }}>{p?.position}</span>
                    <span className="text-white/60 text-xs font-semibold">{p?.name?.split(" ").pop()}</span>
                    <span className="text-white/30 text-xs">{p?.rating}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: Squad Formation ── */}
        <div className="hidden lg:flex w-56 flex-col border-l border-white/5 bg-[#0B1120]/60 backdrop-blur-xl">
          <div className="p-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <p className="text-white font-black text-xs uppercase tracking-widest">My Squad</p>
              <span className="text-white/30 text-xs">{myPicks.length}/{picksPerUser}</span>
            </div>
            {/* Strength bar */}
            <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
              <motion.div className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #22c55e)" }}
                animate={{ width: `${(myPicks.length / picksPerUser) * 100}%` }}
                transition={{ type: "spring", stiffness: 80 }} />
            </div>
          </div>

          {/* Formation grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="relative rounded-xl overflow-hidden"
              style={{ background: "linear-gradient(180deg, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0.03) 100%)", border: "1px solid rgba(16,185,129,0.1)" }}>
              {/* Pitch lines */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/50" />
                <div className="absolute top-1/4 left-1/4 right-1/4 h-px bg-white/30" />
                <div className="absolute bottom-1/4 left-1/4 right-1/4 h-px bg-white/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border border-white/30" />
                </div>
              </div>

              <div className="relative p-3 space-y-3">
                {/* ST row */}
                <div className="flex justify-center gap-3">
                  {[0].map((i) => <FormationSlot key={i} player={myPicks[i]} index={i} getPlayer={getPlayer} />)}
                </div>
                {/* WING row */}
                <div className="flex justify-between px-2">
                  {[1, 2].map((i) => <FormationSlot key={i} player={myPicks[i]} index={i} getPlayer={getPlayer} />)}
                </div>
                {/* MID row */}
                <div className="flex justify-center gap-3">
                  {[3, 4, 5].map((i) => <FormationSlot key={i} player={myPicks[i]} index={i} getPlayer={getPlayer} />)}
                </div>
                {/* DEF row */}
                <div className="flex justify-between px-1">
                  {[6, 7, 8, 9].map((i) => <FormationSlot key={i} player={myPicks[i]} index={i} getPlayer={getPlayer} />)}
                </div>
                {/* GK */}
                <div className="flex justify-center">
                  {[10].map((i) => <FormationSlot key={i} player={myPicks[i]} index={i} getPlayer={getPlayer} />)}
                </div>
                {/* Extra slots */}
                {picksPerUser > 11 && (
                  <div className="flex flex-wrap justify-center gap-2 pt-1 border-t border-white/5">
                    {Array.from({ length: picksPerUser - 11 }, (_, i) => i + 11).map((i) => (
                      <FormationSlot key={i} player={myPicks[i]} index={i} getPlayer={getPlayer} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
