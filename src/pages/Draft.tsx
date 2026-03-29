import { useEffect, useRef, useState, useCallback, useDeferredValue } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import CountdownTimer from "@/components/draft/CountdownTimer";
import { Search, Wifi, WifiOff, Users, Zap } from "lucide-react";
import { useDraft } from "@/hooks/useDraft";
import { useRoomRealtime } from "@/hooks/useRoomRealtime";
import { usePresence, getSessionId } from "@/hooks/usePresence";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { playDraftSound } from "@/lib/sounds";
import type { Tables } from "@/lib/supabase";

type Player = Tables<"players"> & { position: string };
const positions = ["All", "GK", "CB", "FB", "MID", "WING", "ST"] as const;

const posBadge: Record<string, { bg: string; text: string }> = {
  GK:   { bg: "bg-amber-500/20 border-amber-500/40",   text: "text-amber-400" },
  CB:   { bg: "bg-emerald-500/20 border-emerald-500/40", text: "text-emerald-400" },
  FB:   { bg: "bg-teal-500/20 border-teal-500/40",     text: "text-teal-400" },
  MID:  { bg: "bg-sky-500/20 border-sky-500/40",       text: "text-sky-400" },
  WING: { bg: "bg-purple-500/20 border-purple-500/40", text: "text-purple-400" },
  ST:   { bg: "bg-rose-500/20 border-rose-500/40",     text: "text-rose-400" },
};

export default function Draft() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("room");
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<string>("All");
  const deferredSearch = useDeferredValue(search);
  const deferredPosFilter = useDeferredValue(posFilter);
  const [previewPlayer, setPreviewPlayer] = useState<Player | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(30);
  const [drafting, setDrafting] = useState(false);
  const [activeTab, setActiveTab] = useState<"pool" | "board" | "team">("pool");
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
  const { onlineUsers, isDuplicateSession } = usePresence(roomId, presenceUser);

  useEffect(() => {
    if (!roomId) return;
    supabase.from("room_members").select("user_id, team_name, avatar, draft_position")
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
      applyPick(pick);
      playDraftSound();
      const member = membersRef.current.find((m: any) => m.user_id === pick.user_id);
      if (member && pick.user_id !== user?.id) {
        toast(`${member.team_name} drafted a player! ⚽`);
      }
      // Don't call loadFromDB here — onRoomUpdate handles turn advancement
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

  const filteredPlayers = availablePlayers.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      p.club.toLowerCase().includes(deferredSearch.toLowerCase());
    const matchPos = deferredPosFilter === "All" || p.position === deferredPosFilter;
    return matchSearch && matchPos;
  });

  const [autoPickBanner, setAutoPickBanner] = useState(false);

  // Show auto-pick banner when timer hits 0 on our turn
  useEffect(() => {
    if (isMyTurn && remainingSeconds === 0) {
      setAutoPickBanner(true);
      const t = setTimeout(() => setAutoPickBanner(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isMyTurn, remainingSeconds]);

  const handleDraft = async (player: Player) => {
    if (!isMyTurn || drafting || isDuplicateSession) return;
    setDrafting(true);
    setPreviewPlayer(null);
    const { error } = await draftPlayer(player.id);
    if (error) { toast.error(error === "Player already drafted" ? "⚠️ That player was just taken!" : error); loadFromDB(true); }
    setDrafting(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <motion.p className="text-blue-400 text-lg font-bold"
        animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}>
        Loading Draft...
      </motion.p>
    </div>
  );

  const totalPicks = members.length * (room?.picks_per_user ?? 5);
  const currentMember = members.find((m) => m.user_id === currentTurnUserId);
  const myMember = members.find((m) => m.user_id === user?.id);

  return (
    <div className="h-screen bg-[#020617] flex flex-col overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/8 blur-3xl rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/8 blur-3xl rounded-full" />
        {isMyTurn && <motion.div className="absolute inset-0 border-2 border-blue-500/20 rounded-none"
          animate={{ opacity: [0, 0.5, 0] }} transition={{ duration: 2, repeat: Infinity }} />}
      </div>

      {/* Auto-pick banner */}
      <AnimatePresence>
        {autoPickBanner && (
          <motion.div
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl border border-amber-500/40 bg-amber-500/15 backdrop-blur-xl"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            style={{ boxShadow: "0 0 30px rgba(245,158,11,0.3)" }}>
            <motion.span animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 0.4, repeat: 3 }}>⏱</motion.span>
            <span className="text-amber-300 font-black text-sm">Time Expired — Auto Pick Activated</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOP NAVBAR ── */}
      <div className="relative z-20 flex items-center justify-between px-4 py-2.5 border-b border-white/5"
        style={{ background: "rgba(11,17,32,0.95)", backdropFilter: "blur(20px)" }}>

        {/* Left: Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30">
            <motion.div className="w-1.5 h-1.5 rounded-full bg-red-400"
              animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
            <span className="text-red-400 text-xs font-black tracking-widest">LIVE</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-white/40 text-xs">
            <span>Round {Math.floor(picks.length / Math.max(members.length, 1)) + 1}</span>
            <span className="text-white/20">·</span>
            <span className="text-white/60 font-semibold">{picks.length}/{totalPicks} picks</span>
          </div>
        </div>

        {/* Center: Turn status */}
        <AnimatePresence mode="wait">
          {isMyTurn ? (
            <motion.div key="myturn"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full border"
              style={{ background: "rgba(59,130,246,0.15)", borderColor: "rgba(59,130,246,0.5)", boxShadow: "0 0 20px rgba(59,130,246,0.3)" }}>
              <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}>
                <Zap className="w-3.5 h-3.5 text-blue-400" />
              </motion.div>
              <span className="text-blue-300 text-xs font-black tracking-wide">YOUR TURN — PICK NOW</span>
            </motion.div>
          ) : (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-white/30 text-xs font-semibold">
              {currentMember ? `${currentMember.team_name} is picking...` : "Draft in progress"}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right: Timer + profile */}
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {reconnecting && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-amber-400 text-xs">
                <WifiOff className="w-3 h-3" /><span className="hidden sm:inline">Reconnecting</span>
              </motion.div>
            )}
          </AnimatePresence>
          {connected ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-white/20" />}
          <motion.div
            animate={remainingSeconds === 0 ? { x: [-4, 4, -4, 4, 0] } : {}}
            transition={{ duration: 0.4 }}>
            <CountdownTimer key={room?.turn_expires_at ?? "t"} totalSeconds={30} serverRemainingSeconds={remainingSeconds} size={40} />
          </motion.div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm border border-white/10">
            {myMember?.avatar ?? "⚽"}
          </div>
        </div>
      </div>

      {/* ── Mobile tabs ── */}
      <div className="flex lg:hidden border-b border-white/5 bg-[#0B1120]">
        {(["pool", "board", "team"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
              activeTab === tab ? "text-blue-400 border-b-2 border-blue-500" : "text-white/30"}`}>
            {tab === "pool" ? "Scout" : tab === "board" ? "Arena" : `Squad (${myPicks.length})`}
          </button>
        ))}
      </div>

      {/* ── MAIN 3-COLUMN LAYOUT ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* LEFT: Player Scout Panel */}
        <div className={`${activeTab === "pool" ? "flex" : "hidden"} lg:flex flex-col w-full lg:w-72 border-r border-white/5 bg-[#0B1120]/80`}>
          {/* Search */}
          <div className="p-3 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input placeholder="Search players..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/8 text-white placeholder:text-white/20 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-blue-500/40 transition-all" />
            </div>
          </div>
          {/* Position filters */}
          <div className="flex gap-1 p-2 border-b border-white/5 flex-wrap">
            {positions.map((pos) => (
              <button key={pos} onClick={() => setPosFilter(pos)}
                className={`px-2 py-0.5 text-xs rounded-md font-bold transition-all ${
                  posFilter === pos
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                    : "text-white/30 hover:text-white/60"}`}>
                {pos}
              </button>
            ))}
          </div>
          {/* Player list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <AnimatePresence initial={false}>
              {filteredPlayers.map((player) => {
                const badge = posBadge[player.position] ?? posBadge.MID;
                return (
                  <motion.button key={player.id}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                    whileHover={{ x: 4, backgroundColor: "rgba(59,130,246,0.08)" }}
                    onClick={() => setPreviewPlayer(player)}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left ${
                      lastPickedPlayerId === player.id ? "border-blue-500/40 bg-blue-500/10" : "border-transparent hover:border-white/10"
                    }`}>
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-lg shrink-0">⚽</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold truncate">{player.name}</p>
                      <p className="text-white/30 text-xs truncate">{player.club}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-white font-black text-sm">{player.rating}</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${badge.bg} ${badge.text}`}>{player.position}</span>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
            {filteredPlayers.length === 0 && (
              <p className="text-center text-white/20 text-xs py-8">No players found</p>
            )}
          </div>
        </div>

        {/* CENTER: Draft Arena */}
        <div className={`${activeTab === "board" ? "flex" : "hidden"} lg:flex flex-1 flex-col overflow-hidden relative`}>
          {/* My turn glow border */}
          {isMyTurn && (
            <motion.div className="absolute inset-0 pointer-events-none z-10"
              animate={{ boxShadow: ["inset 0 0 30px rgba(59,130,246,0.1)", "inset 0 0 60px rgba(59,130,246,0.2)", "inset 0 0 30px rgba(59,130,246,0.1)"] }}
              transition={{ duration: 2, repeat: Infinity }} />
          )}

          {/* Teams header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            {members.slice(0, 2).map((m, i) => (
              <div key={m.user_id} className={`flex items-center gap-2 ${i === 1 ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg border ${
                  m.user_id === currentTurnUserId ? "border-blue-500/60 bg-blue-500/10" : "border-white/10 bg-white/5"}`}>
                  {m.avatar}
                </div>
                <div className={i === 1 ? "text-right" : ""}>
                  <p className="text-white font-black text-sm">{m.team_name}</p>
                  <p className="text-white/30 text-xs">{picks.filter((p) => p.user_id === m.user_id).length} picks</p>
                </div>
              </div>
            ))}
            <div className="text-white/20 font-black text-lg">VS</div>
          </div>

          {/* Draft order */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {draftOrder.map((uid, i) => {
              const member = members.find((m) => m.user_id === uid);
              const isCurrent = room?.current_turn === i;
              const isMe = uid === user?.id;
              const userPicks = picks.filter((p) => p.user_id === uid).length;
              return (
                <motion.div key={uid} layout
                  animate={isCurrent ? { scale: [1, 1.01, 1] } : {}}
                  transition={isCurrent ? { repeat: Infinity, duration: 2 } : {}}>
                  <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? "border-blue-500/50 bg-blue-500/8"
                      : "border-white/5 bg-white/[0.02]"
                  }`}
                    style={isCurrent ? { boxShadow: "0 0 20px rgba(59,130,246,0.15)" } : {}}>
                    <span className="text-white/30 text-xs font-bold w-4">{i + 1}</span>
                    <span className="text-xl">{member?.avatar ?? "👤"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{member?.team_name ?? "Unknown"}</p>
                      <p className="text-white/30 text-xs">{userPicks} picks</p>
                    </div>
                    {isCurrent && (
                      <motion.span
                        animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
                        className={`text-xs font-black px-3 py-1 rounded-full ${
                          isMe ? "bg-blue-500/20 text-blue-300 border border-blue-500/40" : "bg-white/5 text-white/40 border border-white/10"
                        }`}>
                        {isMe ? "YOUR TURN" : "PICKING..."}
                      </motion.span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Recent picks */}
          {picks.length > 0 && (
            <div className="border-t border-white/5 p-3">
              <p className="text-white/30 text-xs uppercase tracking-widest mb-2">Recent Picks</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[...picks].reverse().slice(0, 6).map((pick) => {
                  const player = getPlayer(pick.player_id);
                  const badge = posBadge[player?.position ?? "MID"] ?? posBadge.MID;
                  return (
                    <div key={pick.id} className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/8">
                      <span className={`text-xs font-bold ${badge.text}`}>{player?.position}</span>
                      <span className="text-white text-xs font-semibold truncate max-w-[80px]">{player?.name ?? "?"}</span>
                      <span className="text-white/30 text-xs">{player?.rating}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: My Squad */}
        <div className={`${activeTab === "team" ? "flex" : "hidden"} lg:flex flex-col w-full lg:w-64 border-l border-white/5 bg-[#0B1120]/80`}>
          <div className="p-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <p className="text-white font-black text-sm">My Squad</p>
              <span className="text-white/40 text-xs">{myPicks.length}/{room?.picks_per_user ?? 5}</span>
            </div>
            {/* Strength bar */}
            <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
              <motion.div className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6)" }}
                animate={{ width: `${(myPicks.length / (room?.picks_per_user ?? 5)) * 100}%` }}
                transition={{ type: "spring", stiffness: 100 }} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            <AnimatePresence>
              {myPicks.map((pick) => {
                const player = getPlayer(pick.player_id);
                const badge = posBadge[player?.position ?? "MID"] ?? posBadge.MID;
                return (
                  <motion.div key={pick.id}
                    initial={{ opacity: 0, x: 40, scale: 0.85 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-white/30 text-xs font-bold w-4 shrink-0">#{pick.pick_number}</span>
                    {player ? (
                      <>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded border shrink-0 ${badge.bg} ${badge.text}`}>{player.position}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-bold truncate">{player.name}</p>
                          <p className="text-white/30 text-xs truncate">{player.club}</p>
                        </div>
                        <span className="text-white font-black text-sm shrink-0">{player.rating}</span>
                      </>
                    ) : <span className="text-white/20 text-xs">Loading...</span>}
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {[...Array(Math.max(0, (room?.picks_per_user ?? 5) - myPicks.length))].map((_, i) => (
              <motion.div key={`e-${i}`} animate={{ opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-white/8">
                <div className="w-6 h-6 rounded-full border border-dashed border-white/15 flex items-center justify-center">
                  <span className="text-white/20 text-xs">+</span>
                </div>
                <span className="text-white/20 text-xs">Empty Slot</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PLAYER PREVIEW MODAL ── */}
      <AnimatePresence>
        {previewPlayer && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPreviewPlayer(null)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 overflow-hidden"
              style={{ background: "#0B1120", boxShadow: "0 0 60px rgba(59,130,246,0.2)" }}>
              {/* Top accent */}
              <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6)" }} />
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-white font-black text-xl">{previewPlayer.name}</h2>
                    <p className="text-white/40 text-sm">{previewPlayer.club}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black text-white">{previewPlayer.rating}</div>
                    <div className="text-white/30 text-xs">OVR</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-6">
                  {(() => { const b = posBadge[previewPlayer.position] ?? posBadge.MID; return (
                    <span className={`text-sm font-black px-3 py-1.5 rounded-xl border ${b.bg} ${b.text}`}>{previewPlayer.position}</span>
                  ); })()}
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-3xl">⚽</div>
                </div>
                {isDuplicateSession && (
                  <p className="text-rose-400 text-xs text-center mb-3 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                    ⚠️ Another session active — blocked
                  </p>
                )}
                <motion.button
                  onClick={() => handleDraft(previewPlayer)}
                  disabled={!isMyTurn || drafting || isDuplicateSession}
                  whileHover={isMyTurn ? { scale: 1.03, boxShadow: "0 0 30px rgba(34,197,94,0.5)" } : {}}
                  whileTap={isMyTurn ? { scale: 0.97 } : {}}
                  className="w-full py-3.5 rounded-xl font-black text-sm text-white relative overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: isMyTurn && !isDuplicateSession ? "linear-gradient(135deg, #22c55e, #16a34a)" : "rgba(255,255,255,0.05)", boxShadow: isMyTurn ? "0 0 20px rgba(34,197,94,0.3)" : "none" }}>
                  {isMyTurn && !isDuplicateSession && !drafting && (
                    <motion.div className="absolute inset-0 bg-white/10 pointer-events-none"
                      animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      style={{ skewX: "-20deg" }} />
                  )}
                  <span className="relative z-10">
                    {drafting ? "Drafting..." : isMyTurn && !isDuplicateSession ? "🎯 Draft Player" : "Not Your Turn"}
                  </span>
                </motion.button>
                <button onClick={() => setPreviewPlayer(null)}
                  className="w-full mt-2 py-2 text-white/30 hover:text-white/60 text-xs font-semibold transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
