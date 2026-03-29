import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/draft/GlassCard";
import NeonButton from "@/components/draft/NeonButton";
import { Input } from "@/components/ui/input";
import { Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence, getSessionId } from "@/hooks/usePresence";
import RoomSetup from "@/pages/RoomSetup";
import { toast } from "sonner";
import teamBg from "@/data/team.png";
import waitBg from "@/data/wait.png";

const AVATARS = ["⚡", "😈", "⭐", "🦁", "🔥", "🐉", "🦅", "🌊"];

interface RoomMember {
  user_id: string;
  team_name: string;
  avatar: string;
  is_host: boolean;
}

const Lobby = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [hostId, setHostId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState(searchParams.get("code") ?? "");
  const [teamName, setTeamName] = useState("");
  const [avatar] = useState(() => AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [view, setView] = useState<"menu" | "setup" | "lobby">("menu");
  const [creatingRoom, setCreatingRoom] = useState(false);

  const [sessionId] = useState(() => getSessionId());
  const [joinedAt] = useState(() => new Date().toISOString());
  const roomIdRef = useRef<string | null>(null);

  // isHost: strictly compare auth user id with room's host_id
  const isHost = !!(user && hostId && user.id === hostId);

  const presenceUser = useMemo(() => {
    if (!user || !roomId) return null;
    return {
      user_id: user.id,
      session_id: sessionId,
      display_name: teamName,
      avatar,
      online_at: joinedAt,
    };
  }, [user?.id, roomId, sessionId, teamName, avatar, joinedAt]);

  const { onlineUsers } = usePresence(roomId, presenceUser);

  // Fetch all members for a room — any authenticated user can read (fixed by RLS migration)
  const fetchMembers = async (rid: string) => {
    const { data, error } = await supabase
      .from("room_members")
      .select("user_id, team_name, avatar, is_host")
      .eq("room_id", rid);

    if (error) {
      console.error("[fetchMembers] error:", error.message, error.code);
      return;
    }
    console.log("[fetchMembers] rows:", data?.length, data);
    setMembers(data ?? []);
  };

  // Realtime subscription — fires for all users in the room
  useEffect(() => {
    if (!roomId) return;
    roomIdRef.current = roomId;

    fetchMembers(roomId);

    const channel = supabase
      .channel(`room-lobby:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` },
        (payload) => {
          console.log("[realtime] room_members change:", payload.eventType, payload.new);
          fetchMembers(roomId);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.new.status === "trivia") navigate(`/trivia?room=${roomId}`);
        }
      )
      .subscribe((status) => {
        console.log("[realtime] channel status:", status);
      });

    return () => {
      channel.unsubscribe();
      roomIdRef.current = null;
    };
  }, [roomId, navigate]);

  // Merge DB members (source of truth) with presence (online indicator)
  const displayMembers = members.map((m) => ({
    ...m,
    isOnline: onlineUsers.some((u) => u.user_id === m.user_id),
  }));

  const createRoom = async (config?: { maxPlayers: number; picksPerUser: number; draftFormat: "snake" | "linear" }) => {
    if (!user || !teamName.trim()) { toast.error("Enter a team name"); return; }
    setCreatingRoom(true);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data: room, error } = await supabase
      .from("rooms")
      .insert({
        code,
        host_id: user.id,
        picks_per_user: config?.picksPerUser ?? 5,
        max_players: config?.maxPlayers ?? 4,
        draft_format: config?.draftFormat ?? "snake",
      })
      .select("id, code, host_id")
      .single();

    if (error || !room) { toast.error("Failed to create room"); setCreatingRoom(false); return; }

    const { error: memberErr } = await supabase.from("room_members").insert({
      room_id: room.id, user_id: user.id, team_name: teamName.trim(), avatar, is_host: true,
    });
    if (memberErr) { toast.error("Failed to create room"); setCreatingRoom(false); return; }

    console.log("[createRoom] host_id:", room.host_id, "user.id:", user.id);

    setHostId(room.host_id);
    setRoomId(room.id);
    setRoomCode(room.code);
    setCreatingRoom(false);
    setView("lobby");
  };

  const joinRoom = async () => {
    if (!user || !teamName.trim() || !joinCode.trim()) {
      toast.error("Enter team name and room code");
      return;
    }

    const { data: room, error: roomErr } = await supabase
      .from("rooms")
      .select("id, code, host_id")
      .eq("code", joinCode.trim().toUpperCase())
      .single();

    if (roomErr || !room) { toast.error("Room not found"); return; }

    console.log("[joinRoom] room.host_id:", room.host_id, "user.id:", user.id);

    // Insert member row — ignore conflict if already joined
    const { error: insertErr } = await supabase.from("room_members").insert({
      room_id: room.id, user_id: user.id, team_name: teamName.trim(), avatar, is_host: false,
    });

    if (insertErr && insertErr.code !== "23505") {
      console.error("[joinRoom] insert error:", insertErr);
      toast.error(`Join failed: ${insertErr.message}`);
      return;
    }

    // If user is already a member (409/23505), just let them back in
    console.log("[joinRoom] joined or already member, proceeding to lobby");

    setHostId(room.host_id);
    setRoomId(room.id);
    setRoomCode(room.code);
    setView("lobby");
  };

  const startTrivia = async () => {
    if (!roomId || !isHost) return;

    // 1. Create a trivia session
    const { data: session, error: sessionErr } = await supabase
      .from("trivia_sessions")
      .insert({ room_id: roomId, status: "active" })
      .select("id")
      .single();

    if (sessionErr || !session) {
      toast.error("Failed to start trivia");
      return;
    }

    // 2. Update room status
    await supabase.from("rooms").update({ status: "trivia" }).eq("id", roomId);

    // 3. Navigate host to trivia page
    navigate(`/trivia?room=${roomId}`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (view === "setup") {
    return (
      <RoomSetup
        loading={creatingRoom}
        onBack={() => setView("menu")}
        onConfirm={(config) => createRoom(config)}
      />
    );
  }

  if (view === "menu") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">

        {/* Background image with zoom */}
        <motion.div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${teamBg})`, scale: 1.05 }}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1.05 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        {/* Overlay layers */}
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/70" />

        {/* Glow behind card */}
        <div className="absolute w-[400px] h-[400px] bg-blue-500/20 blur-3xl rounded-full pointer-events-none" />

        {/* Content */}
        <motion.div className="relative z-10 w-full max-w-3xl"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as const }}>

          {/* Profile strip */}
          <motion.div className="flex items-center gap-3 mb-8"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <div className="relative cursor-pointer" onClick={() => navigate("/profile")}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-black border border-white/20 bg-white/10 backdrop-blur-sm"
                style={{ boxShadow: "0 0 16px rgba(59,130,246,0.4)" }}>
                {avatar}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#060810]" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">{user?.email?.split("@")[0] ?? "Player"}</p>
              <p className="text-emerald-400 text-xs mt-0.5">● Online</p>
            </div>
          </motion.div>

          {/* Header */}
          <motion.div className="text-center mb-10"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-2"
              style={{ background: "linear-gradient(135deg, #60a5fa, #a78bfa, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 20px rgba(99,102,241,0.4))" }}>
              ⚽ Fantasy Draft
            </h1>
            <p className="text-white/40 text-sm uppercase tracking-widest font-medium">Create or Join a Squad</p>
          </motion.div>

          {/* Team name input */}
          <motion.div className="mb-8 max-w-sm mx-auto"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2 block text-center">Your Team Name</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🏆</span>
              <input
                placeholder="FC Thunder"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/20 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold focus:outline-none focus:border-blue-500/50 transition-all duration-300 text-center"
                style={{ backdropFilter: "blur(12px)" }}
              />
              <div className="absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ boxShadow: "0 0 0 1px rgba(99,102,241,0.5), 0 0 24px rgba(99,102,241,0.15)" }} />
            </div>
          </motion.div>

          {/* Action cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Create Room */}
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 flex flex-col gap-4 cursor-pointer group"
              style={{ boxShadow: "0 0 0 0 rgba(16,185,129,0)" }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 30px rgba(16,185,129,0.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 0 0 rgba(16,185,129,0)")}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🏠</span>
                  <h2 className="text-lg font-black text-white">Create Room</h2>
                </div>
                <p className="text-white/40 text-xs">Host a new draft session and invite friends</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => { if (!teamName.trim()) { toast.error("Enter a team name first"); return; } setView("setup"); }}
                className="w-full py-3.5 rounded-xl font-black text-sm text-white relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 0 20px rgba(16,185,129,0.3)" }}>
                <motion.div className="absolute inset-0 bg-white/10 pointer-events-none"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                  style={{ skewX: "-20deg" }} />
                <span className="relative z-10">Create Room →</span>
              </motion.button>
            </motion.div>

            {/* Join Room */}
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 flex flex-col gap-4 group"
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 30px rgba(99,102,241,0.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "")}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🔗</span>
                  <h2 className="text-lg font-black text-white">Join Room</h2>
                </div>
                <p className="text-white/40 text-xs">Enter a room code to join an existing session</p>
              </div>
              <div className="relative group/input">
                <input
                  placeholder="Room code (e.g. AB12CD)"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                  maxLength={6}
                  className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 py-3 text-sm font-mono font-bold tracking-widest focus:outline-none focus:border-indigo-500/50 transition-all duration-300 uppercase"
                />
                <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ boxShadow: "0 0 0 1px rgba(99,102,241,0.5), 0 0 20px rgba(99,102,241,0.12)" }} />
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={joinRoom}
                className="w-full py-3.5 rounded-xl font-black text-sm text-white relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 0 20px rgba(99,102,241,0.3)" }}>
                <span className="relative z-10">Join Room →</span>
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#060810]">

      {/* Layer 1: Background image with zoom */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${waitBg})`, filter: "blur(1px)", transform: "scale(1.05)" }}
        initial={{ opacity: 0, scale: 1.08 }}
        animate={{ opacity: 1, scale: 1.05 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />

      {/* Layer 2: Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Layer 3: Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/40 to-black/75" />

      {/* Soft glow behind player grid */}
      <div className="absolute w-[600px] h-[300px] bg-indigo-500/10 blur-3xl rounded-full pointer-events-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10 flex flex-col min-h-screen p-4 md:p-8">

        {/* Top bar */}
        <motion.div className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <motion.button onClick={() => setView("menu")}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl text-white/50 hover:text-white text-xs font-semibold transition-colors">
            ← Back
          </motion.button>

          {/* Room code */}
          <motion.button onClick={handleCopy}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            className="flex items-center gap-3 px-5 py-2.5 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl"
            style={{ boxShadow: "0 0 20px rgba(99,102,241,0.15)" }}>
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest leading-none mb-0.5">Room Code</p>
              <p className="text-white font-black text-lg font-mono tracking-widest leading-none">{roomCode}</p>
            </div>
            <AnimatePresence mode="wait">
              {copied
                ? <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check className="w-4 h-4 text-emerald-400" /></motion.div>
                : <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Copy className="w-4 h-4 text-white/40" /></motion.div>}
            </AnimatePresence>
          </motion.button>

          {/* Share */}
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => { navigator.share?.({ title: "Join my Fantasy Draft!", text: `Use code: ${roomCode}` }).catch(() => {}); }}
            className="px-4 py-2.5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl text-white/50 hover:text-white text-xs font-semibold transition-colors">
            Share 🔗
          </motion.button>
        </motion.div>

        {/* Header */}
        <motion.div className="text-center mb-8"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2"
            style={{ background: "linear-gradient(135deg, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Waiting for Players
          </h1>
          <motion.p className="text-white/40 text-sm font-medium"
            animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2, repeat: Infinity }}>
            {members.length} / 4 players joined
          </motion.p>
        </motion.div>

        {/* Player grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto w-full flex-1">
          {displayMembers.map((member, i) => (
            <motion.div key={member.user_id}
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.1 * i, type: "spring", stiffness: 300, damping: 20 }}
              whileHover={{ scale: 1.04, y: -4 }}>
              <div className="relative rounded-2xl border bg-white/5 backdrop-blur-xl p-5 text-center h-full flex flex-col items-center justify-center gap-3"
                style={{
                  borderColor: member.is_host ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.1)",
                  boxShadow: member.is_host ? "0 0 24px rgba(139,92,246,0.2)" : member.isOnline ? "0 0 16px rgba(16,185,129,0.1)" : "none",
                }}>

                {/* Online dot */}
                <div className="absolute top-3 left-3">
                  <motion.div className={`w-2.5 h-2.5 rounded-full ${member.isOnline ? "bg-emerald-400" : "bg-white/20"}`}
                    animate={member.isOnline ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }} />
                </div>

                {/* Host badge */}
                {member.is_host && (
                  <span className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(139,92,246,0.3)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.4)" }}>
                    HOST
                  </span>
                )}

                <div className="text-5xl">{member.avatar}</div>
                <div>
                  <p className="font-black text-white text-sm">{member.team_name}</p>
                  {user?.id === member.user_id && (
                    <p className="text-emerald-400 text-xs mt-0.5 font-semibold">● You</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Empty slots */}
          {[...Array(Math.max(0, 4 - displayMembers.length))].map((_, i) => (
            <motion.div key={`empty-${i}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}>
              <motion.div
                className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-center h-full flex flex-col items-center justify-center gap-3 min-h-[140px]"
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}>
                <div className="text-4xl opacity-20">👤</div>
                <p className="text-white/25 text-xs font-medium">Waiting for Player...</p>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div className="mt-8 flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>

          {/* Status bar */}
          <div className="flex items-center gap-2 mb-2">
            {[...Array(4)].map((_, i) => (
              <motion.div key={i}
                className="w-8 h-1.5 rounded-full"
                style={{ background: i < members.length ? "linear-gradient(90deg, #10b981, #34d399)" : "rgba(255,255,255,0.1)" }}
                animate={i < members.length ? { boxShadow: ["0 0 6px rgba(16,185,129,0.4)", "0 0 12px rgba(16,185,129,0.7)", "0 0 6px rgba(16,185,129,0.4)"] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }} />
            ))}
            <span className="text-white/40 text-xs ml-1">{members.length}/4</span>
          </div>

          {isHost && (
            <>
              <motion.button
                onClick={startTrivia}
                disabled={members.length < 2}
                whileHover={members.length >= 2 ? { scale: 1.04, boxShadow: "0 0 40px rgba(16,185,129,0.6)" } : {}}
                whileTap={members.length >= 2 ? { scale: 0.97 } : {}}
                animate={members.length >= 2 ? { boxShadow: ["0 0 20px rgba(16,185,129,0.3)", "0 0 35px rgba(16,185,129,0.5)", "0 0 20px rgba(16,185,129,0.3)"] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className="px-12 py-4 rounded-2xl font-black text-base text-white relative overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                {members.length >= 2 && (
                  <motion.div className="absolute inset-0 bg-white/10 pointer-events-none"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                    style={{ skewX: "-20deg" }} />
                )}
                <span className="relative z-10">🚀 Start Trivia</span>
              </motion.button>
              {members.length < 2 && (
                <p className="text-white/30 text-xs">Need at least 2 players to start</p>
              )}
            </>
          )}

          {!isHost && (
            <motion.p className="text-white/40 text-sm font-medium"
              animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2, repeat: Infinity }}>
              Waiting for host to start the game...
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Lobby;
