import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/draft/GlassCard";
import NeonButton from "@/components/draft/NeonButton";
import PlayerCard from "@/components/draft/PlayerCard";
import CountdownTimer from "@/components/draft/CountdownTimer";
import { Input } from "@/components/ui/input";
import { Search, Wifi, WifiOff, Users } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
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

const posColors: Record<string, string> = {
  GK: "bg-amber-500/80",
  CB: "bg-emerald-500/80",
  FB: "bg-teal-500/80",
  MID: "bg-sky-500/80",
  WING: "bg-purple-500/80",
  ST: "bg-rose-500/80",
};

export default function Draft() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("room");
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<string>("All");
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

  // Presence — duplicate session detection
  const sessionId = getSessionId();
  const presenceUser = user && roomId ? {
    user_id: user.id,
    session_id: sessionId,
    display_name: user.email ?? "",
    avatar: members.find((m) => m.user_id === user.id)?.avatar ?? "⚽",
    online_at: new Date().toISOString(),
  } : null;
  const { onlineUsers, isDuplicateSession } = usePresence(roomId, presenceUser);

  // Load room members
  useEffect(() => {
    if (!roomId) return;
    supabase.from("room_members")
      .select("user_id, team_name, avatar, draft_position")
      .eq("room_id", roomId)
      .then(({ data }) => { if (data) setMembers(data); });
  }, [roomId]);

  // Sync server timer — recompute every 500ms based on turn_expires_at
  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const update = () => setRemainingSeconds(getRemainingSeconds());
    update();
    timerIntervalRef.current = setInterval(update, 500);
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [room?.turn_expires_at, getRemainingSeconds]);

  // Realtime — single channel
  const { connected, reconnecting } = useRoomRealtime({
    roomId,
    onRoomUpdate: useCallback((update: any) => {
      applyRoomUpdate(update);
      if (update.status === "complete") navigate(`/results?room=${roomId}`);
    }, [applyRoomUpdate, navigate, roomId]),
    onDraftPick: useCallback((pick: any) => {
      applyPick(pick);
      playDraftSound();
      const member = members.find((m) => m.user_id === pick.user_id);
      if (member && pick.user_id !== user?.id) {
        toast(`${member.team_name} drafted a player! ⚽`);
      }
      // Reload full room state to ensure turn/timer sync for all users
      loadFromDB();
    }, [applyPick, members, user?.id, loadFromDB]),
  });

  // Reconnect: reload full state from DB when connection restores
  const wasReconnecting = useRef(false);
  useEffect(() => {
    if (wasReconnecting.current && connected) {
      loadFromDB();
      toast("Reconnected — state restored");
    }
    wasReconnecting.current = reconnecting;
  }, [connected, reconnecting, loadFromDB]);

  // Navigate when draft completes
  useEffect(() => {
    if (isDraftComplete) navigate(`/results?room=${roomId}`);
  }, [isDraftComplete, navigate, roomId]);

  const filteredPlayers = availablePlayers.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.club.toLowerCase().includes(search.toLowerCase());
    const matchPos = posFilter === "All" || p.position === posFilter;
    return matchSearch && matchPos;
  });

  const handleDraft = async (player: Player) => {
    if (!isMyTurn || drafting || isDuplicateSession) return;
    setDrafting(true);
    setPreviewPlayer(null);
    const { error } = await draftPlayer(player.id);
    if (error) {
      toast.error(error === 'Player already drafted' ? '⚠️ That player was just taken!' : error);
      loadFromDB(); // restore correct state on conflict
    }
    setDrafting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <p className="text-muted-foreground text-lg">Loading draft...</p>
        </motion.div>
      </div>
    );
  }

  const totalPicks = members.length * (room?.picks_per_user ?? 5);

  return (
    <div className="min-h-screen gradient-bg flex flex-col">

      {/* ── Top Bar ── */}
      <div className="px-3 py-2 md:px-4 md:py-3 flex items-center justify-between border-b border-border/30 gap-2">
        <h1 className="text-base md:text-xl font-black text-foreground neon-text-blue shrink-0">⚽ DRAFT</h1>

        <div className="flex items-center gap-2 md:gap-4 flex-1 justify-center">
          {/* Connection indicator */}
          <AnimatePresence>
            {reconnecting && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full">
                <WifiOff className="w-3 h-3" />
                <span className="hidden sm:inline">Reconnecting...</span>
              </motion.div>
            )}
            {isDuplicateSession && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-1 text-xs text-rose-400 bg-rose-400/10 px-2 py-1 rounded-full">
                <Users className="w-3 h-3" />
                <span className="hidden sm:inline">Another tab active</span>
              </motion.div>
            )}
          </AnimatePresence>

          <span className="text-xs md:text-sm text-muted-foreground">
            {picks.length}/{totalPicks} picks
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {connected
            ? <Wifi className="w-3 h-3 text-accent" />
            : <WifiOff className="w-3 h-3 text-muted-foreground" />}
          <CountdownTimer
            key={room?.turn_expires_at ?? "timer"}
            totalSeconds={30}
            serverRemainingSeconds={remainingSeconds}
            size={44}
          />
        </div>
      </div>

      {/* ── Mobile Tab Bar ── */}
      <div className="flex lg:hidden border-b border-border/30">
        {(["pool", "board", "team"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
              activeTab === tab
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}>
            {tab === "pool" ? "Players" : tab === "board" ? "Board" : `My Team (${myPicks.length})`}
          </button>
        ))}
      </div>

      {/* ── Main Layout ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

        {/* ── Left: Player Pool ── */}
        <div className={`${activeTab === "pool" ? "flex" : "hidden"} lg:flex w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border/30 p-3 flex-col`}>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search players..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted/50 border-border h-9 text-sm" />
          </div>
          <div className="flex gap-1 mb-2 flex-wrap">
            {positions.map((pos) => (
              <button key={pos} onClick={() => setPosFilter(pos)}
                className={`px-2.5 py-1 text-xs rounded-full font-semibold transition-colors ${
                  posFilter === pos ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}>
                {pos}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            <AnimatePresence initial={false}>
              {filteredPlayers.map((player, idx) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40, scale: 0.85 }}
                  transition={{ duration: 0.25, delay: idx < 10 ? idx * 0.03 : 0 }}
                >
                  {/* Flash effect on newly picked player */}
                  <motion.div
                    animate={lastPickedPlayerId === player.id ? { backgroundColor: ["rgba(59,130,246,0.4)", "rgba(0,0,0,0)"] } : {}}
                    transition={{ duration: 0.6 }}
                    className="rounded-lg"
                  >
                    <PlayerCard player={player} compact onClick={() => setPreviewPlayer(player)} />
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredPlayers.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">No players found</p>
            )}
          </div>
        </div>

        {/* ── Center: Draft Board ── */}
        <div className={`${activeTab === "board" ? "flex" : "hidden"} lg:flex flex-1 p-3 md:p-5 flex-col overflow-y-auto`}>
          <h2 className="text-base font-bold text-foreground mb-3">Draft Order</h2>

          {isMyTurn && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-3 p-3 rounded-lg bg-primary/10 border border-primary/30 text-center"
            >
              <p className="text-primary font-bold text-sm">🎯 Your turn! Pick a player.</p>
            </motion.div>
          )}

          <div className="space-y-2">
            {draftOrder.map((uid, i) => {
              const member = members.find((m) => m.user_id === uid);
              const isCurrent = room?.current_turn === i;
              const userPicks = picks.filter((p) => p.user_id === uid).length;
              return (
                <motion.div key={uid} layout>
                  <GlassCard
                    className={`p-3 flex items-center gap-3 transition-all ${isCurrent ? "ring-2 ring-primary glow-blue" : ""}`}
                    animate={isCurrent ? { scale: [1, 1.015, 1] } : {}}
                    transition={isCurrent ? { repeat: Infinity, duration: 2 } : {}}
                  >
                    <span className="text-xl shrink-0">{member?.avatar ?? "👤"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground text-sm truncate">{member?.team_name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{userPicks} picks</p>
                    </div>
                    {isCurrent && (
                      <motion.span
                        className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                          uid === user?.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary/20 text-primary"
                        }`}
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        {uid === user?.id ? "YOUR TURN" : "PICKING..."}
                      </motion.span>
                    )}
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>

          {!isMyTurn && currentTurnUserId && (
            <motion.p
              className="text-center text-muted-foreground text-sm mt-6"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              Waiting for {members.find((m) => m.user_id === currentTurnUserId)?.team_name ?? "..."} to pick...
            </motion.p>
          )}
        </div>

        {/* ── Right: My Team ── */}
        <div className={`${activeTab === "team" ? "flex" : "hidden"} lg:flex w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-border/30 p-3 flex-col`}>
          <h2 className="text-base font-bold text-foreground mb-3">
            My Team <span className="text-muted-foreground font-normal text-sm">({myPicks.length}/{room?.picks_per_user ?? 5})</span>
          </h2>
          <div className="space-y-2 flex-1 overflow-y-auto">
            <AnimatePresence>
              {myPicks.map((pick) => {
                const player = getPlayer(pick.player_id);
                return (
                  <motion.div
                    key={pick.id}
                    initial={{ opacity: 0, x: 60, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ type: "spring", damping: 14, stiffness: 200 }}
                  >
                    <GlassCard className="p-2.5 flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">#{pick.pick_number}</span>
                      {player ? (
                        <>
                          <span className="text-base font-black text-foreground shrink-0">{player.rating}</span>
                          <span className={`text-xs font-bold px-1 py-0.5 rounded shrink-0 ${posColors[player.position as string]}`}>
                            {player.position}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{player.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{player.club}</p>
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">{pick.player_id}</span>
                      )}
                    </GlassCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {[...Array(Math.max(0, (room?.picks_per_user ?? 5) - myPicks.length))].map((_, i) => (
              <GlassCard key={`empty-${i}`} className="p-2.5 text-center border-dashed opacity-40">
                <span className="text-xs text-muted-foreground">Empty Slot</span>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>

      {/* ── Player Preview Modal ── */}
      <Dialog open={!!previewPlayer} onOpenChange={() => setPreviewPlayer(null)}>
        <DialogContent className="glass-strong border-border max-w-sm mx-auto">
          {previewPlayer && (
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
              <DialogHeader>
                <DialogTitle className="text-foreground text-xl">{previewPlayer.name}</DialogTitle>
                <DialogDescription>{previewPlayer.club} · {previewPlayer.position}</DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-between py-4">
                <div className="text-center">
                  <div className="text-5xl font-black text-foreground">{previewPlayer.rating}</div>
                  <div className="text-xs text-muted-foreground mt-1">OVERALL</div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${posColors[previewPlayer.position]}`}>
                    {previewPlayer.position}
                  </span>
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-3xl">⚽</div>
                </div>
              </div>

              {isDuplicateSession && (
                <p className="text-xs text-rose-400 text-center mb-3">
                  ⚠️ Another session is active — actions blocked
                </p>
              )}

              <NeonButton
                variant={isMyTurn && !isDuplicateSession ? "green" : "purple"}
                size="lg"
                className="w-full"
                onClick={() => handleDraft(previewPlayer)}
                disabled={!isMyTurn || drafting || isDuplicateSession}
              >
                {drafting ? "Drafting..." : isMyTurn && !isDuplicateSession ? "🎯 Draft Player" : "Not your turn"}
              </NeonButton>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
