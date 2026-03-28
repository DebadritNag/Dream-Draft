import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/draft/GlassCard";
import NeonButton from "@/components/draft/NeonButton";
import { Input } from "@/components/ui/input";
import { Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence, getSessionId } from "@/hooks/usePresence";
import { toast } from "sonner";

const AVATARS = ["⚡", "😈", "⭐", "🦁", "🔥", "🐉", "🦅", "🌊"];

const Lobby = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState(searchParams.get("code") ?? "");
  const [teamName, setTeamName] = useState("");
  const [avatar] = useState(() => AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [view, setView] = useState<"menu" | "lobby">("menu");

  const [sessionId] = useState(() => getSessionId());
  const [joinedAt] = useState(() => new Date().toISOString());

  // Memoize so presence only re-subscribes when user_id/session actually changes
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

  // Load room members from DB (for host flag + fallback)
  useEffect(() => {
    if (!roomId) return;
    const load = async () => {
      const { data } = await supabase
        .from("room_members")
        .select("user_id, team_name, avatar, is_host")
        .eq("room_id", roomId);      if (data) setMembers(data);
    };
    load();

    const channel = supabase
      .channel(`lobby-members:${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` }, load)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, (payload) => {
        if (payload.new.status === "trivia") navigate(`/trivia?room=${roomId}`);
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [roomId, navigate]);

  // Merge DB members (source of truth) with presence (online status)
  // Fall back to DB members so players show even before presence syncs
  const displayMembers = members.map((m) => {
    const presenceMember = onlineUsers.find((u) => u.user_id === m.user_id);
    return {
      user_id: m.user_id,
      display_name: presenceMember?.display_name ?? m.team_name,
      avatar: m.avatar,
      is_host: m.is_host,
      isOnline: !!presenceMember,
    };
  });

  const createRoom = async () => {
    if (!user || !teamName) { toast.error("Enter a team name"); return; }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data: room, error } = await supabase
      .from("rooms")
      .insert({ code, host_id: user.id })
      .select()
      .single();
    if (error || !room) { toast.error("Failed to create room"); return; }

    await supabase.from("room_members").insert({
      room_id: room.id, user_id: user.id,
      team_name: teamName, avatar, is_host: true,
    });

    setRoomId(room.id);
    setRoomCode(room.code);
    setIsHost(true);
    setView("lobby");
  };

  const joinRoom = async () => {
    if (!user || !teamName || !joinCode) { toast.error("Enter team name and room code"); return; }
    
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select()
      .eq("code", joinCode.toUpperCase())
      .single();
    
    if (roomError || !room) {
      console.error("Room lookup error:", roomError);
      toast.error(`Room not found: ${roomError?.message ?? "unknown"}`);
      return;
    }

    console.log("Joining room:", room.id, "as user:", user.id);

    const { error } = await supabase.from("room_members").upsert({
      room_id: room.id, user_id: user.id,
      team_name: teamName, avatar, is_host: false,
    }, { onConflict: "room_id,user_id", ignoreDuplicates: true });
    
    if (error && error.code !== '23505') {
      console.error("Join room error:", JSON.stringify(error));
      toast.error(`Join failed: ${error.message} (${error.code})`);
      return;
    }

    setRoomId(room.id);
    setRoomCode(room.code);
    setView("lobby");
  };

  const startTrivia = async () => {
    if (!roomId) return;
    await supabase.from("rooms").update({ status: "trivia" }).eq("id", roomId);
    navigate(`/trivia?room=${roomId}`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (view === "menu") {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <GlassCard strong glow="blue" className="w-full max-w-md p-8 space-y-6"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-black text-center text-foreground neon-text-blue">⚽ Fantasy Draft</h1>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Your Team Name</label>
            <Input placeholder="FC Thunder" value={teamName} onChange={(e) => setTeamName(e.target.value)}
              className="bg-muted/50 border-border" />
          </div>
          <NeonButton variant="green" size="lg" className="w-full" onClick={createRoom}>
            🏠 Create Room
          </NeonButton>
          <div className="flex gap-2">
            <Input placeholder="Room code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)}
              className="bg-muted/50 border-border" />
            <NeonButton variant="blue" onClick={joinRoom}>Join</NeonButton>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <p className="text-sm text-muted-foreground mb-2">ROOM CODE</p>
          <GlassCard className="inline-flex items-center gap-3 px-6 py-3 cursor-pointer"
            onClick={handleCopy} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <span className="text-2xl font-mono font-bold text-foreground tracking-wider">{roomCode}</span>
            <AnimatePresence mode="wait">
              {copied
                ? <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check className="w-5 h-5 text-accent" /></motion.div>
                : <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Copy className="w-5 h-5 text-muted-foreground" /></motion.div>
              }
            </AnimatePresence>
          </GlassCard>
        </motion.div>

        <motion.h1 className="text-3xl md:text-4xl font-black text-center text-foreground neon-text-purple"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          Waiting for Players
        </motion.h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {displayMembers.map((member, i) => (
            <motion.div key={member.user_id} initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 * i, type: "spring" }}>
              <GlassCard className="p-6 text-center relative" glow={member.is_host ? "purple" : "none"}>
                {member.is_host && (
                  <span className="absolute top-2 right-2 text-xs bg-secondary/30 text-secondary px-2 py-0.5 rounded-full">HOST</span>
                )}
                <div className="absolute top-2 left-2">
                  <motion.div className={`w-3 h-3 rounded-full ${member.isOnline ? "bg-accent" : "bg-muted-foreground/40"}`}
                    animate={member.isOnline ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }} />
                </div>
                <div className="text-4xl mb-3">{member.avatar}</div>
                <p className="font-bold text-foreground">{member.display_name}</p>
              </GlassCard>
            </motion.div>
          ))}
          {[...Array(Math.max(0, 4 - members.length))].map((_, i) => (
            <motion.div key={`empty-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.1 }}>
              <GlassCard className="p-6 text-center border-dashed">
                <div className="text-4xl mb-3 opacity-20">👤</div>
                <p className="text-muted-foreground text-sm">Waiting...</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {isHost && (
          <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <NeonButton variant="green" size="lg" onClick={startTrivia} disabled={members.length < 2}>
              🚀 Start Trivia
            </NeonButton>
            {members.length < 2 && <p className="text-xs text-muted-foreground mt-2">Need at least 2 players</p>}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Lobby;
