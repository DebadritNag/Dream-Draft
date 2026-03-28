import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import GlassCard from "@/components/draft/GlassCard";
import NeonButton from "@/components/draft/NeonButton";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import html2canvas from "html2canvas";

interface PlayerRow {
  id: string; name: string; position: string; rating: number; club: string;
}
interface TeamData {
  userId: string; teamName: string; avatar: string;
  players: PlayerRow[]; rating: number; chemistry: number;
}

const posColors: Record<string, string> = {
  GK: "bg-amber-500/80", DEF: "bg-emerald-500/80",
  MID: "bg-sky-500/80",  FWD: "bg-rose-500/80",
};

function calcChemistry(players: PlayerRow[]): number {
  if (!players.length) return 0;
  const clubs = players.map((p) => p.club);
  let bonus = 0;
  for (let i = 0; i < clubs.length; i++)
    for (let j = i + 1; j < clubs.length; j++)
      if (clubs[i] === clubs[j]) bonus += 8;
  return Math.min(99, 60 + bonus);
}

export default function Results() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomId = searchParams.get("room");
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const shareCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) return;
    const load = async () => {
      const [membersRes, picksRes, playersRes] = await Promise.all([
        supabase.from("room_members").select("user_id, team_name, avatar").eq("room_id", roomId),
        supabase.from("draft_picks").select("user_id, player_id, pick_number").eq("room_id", roomId).order("pick_number"),
        supabase.from("players").select("id, name, position, rating, club"),
      ]);
      const playerMap = Object.fromEntries((playersRes.data ?? []).map((p) => [p.id, p]));
      const picksByUser: Record<string, PlayerRow[]> = {};
      (picksRes.data ?? []).forEach((pick) => {
        if (!picksByUser[pick.user_id]) picksByUser[pick.user_id] = [];
        const p = playerMap[pick.player_id];
        if (p) picksByUser[pick.user_id].push(p);
      });
      const teamData: TeamData[] = (membersRes.data ?? []).map((m) => {
        const players = picksByUser[m.user_id] ?? [];
        const rating = players.length ? Math.round(players.reduce((s, p) => s + p.rating, 0) / players.length) : 0;
        return { userId: m.user_id, teamName: m.team_name, avatar: m.avatar, players, rating, chemistry: calcChemistry(players) };
      });
      teamData.sort((a, b) => (a.userId === user?.id ? -1 : b.userId === user?.id ? 1 : 0));
      setTeams(teamData);
      setLoading(false);
    };
    load();
  }, [roomId, user?.id]);

  const captureCard = async () => {
    if (!shareCardRef.current) return null;
    try {
      return await html2canvas(shareCardRef.current, { backgroundColor: "#0f1117", scale: 2, useCORS: true });
    } catch { toast.error("Failed to capture image"); return null; }
  };

  const handleDownload = async () => {
    const canvas = await captureCard();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "my-fantasy-team.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Image saved!");
  };

  const handleWhatsApp = async () => {
    const canvas = await captureCard();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "my-fantasy-team.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    const myTeam = teams.find((t) => t.userId === user?.id);
    const text = encodeURIComponent(`Check out my Fantasy Draft squad — ${myTeam?.teamName ?? "My Team"} ⚽🔥 Avg rating: ${myTeam?.rating ?? ""}`);
    setTimeout(() => window.open(`https://wa.me/?text=${text}`, "_blank"), 300);
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <p className="text-muted-foreground">Loading results...</p>
        </motion.div>
      </div>
    );
  }

  const myTeam = teams.find((t) => t.userId === user?.id);
  const otherTeams = teams.filter((t) => t.userId !== user?.id);

  return (
    <div className="min-h-screen gradient-bg p-3 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.h1 className="text-2xl md:text-4xl font-black text-center text-foreground neon-text-blue mb-6"
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          📊 Final Squads
        </motion.h1>

        {myTeam && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 max-w-md mx-auto">
            <div ref={shareCardRef} className="rounded-xl overflow-hidden">
              <GlassCard strong className="p-4 md:p-6 space-y-4">
                <div className="text-center">
                  <span className="text-4xl">{myTeam.avatar}</span>
                  <h2 className="text-xl font-black text-foreground mt-2">{myTeam.teamName}</h2>
                  <p className="text-xs text-muted-foreground">Your Squad</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">AVG RATING</p>
                    <p className="text-3xl font-black text-foreground">{myTeam.rating}</p>
                  </div>
                  <div className="glass rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">CHEMISTRY</p>
                    <p className="text-xl font-black text-foreground mb-1">{myTeam.chemistry}</p>
                    <Progress value={myTeam.chemistry} className="h-1.5" />
                  </div>
                </div>
                <div className="space-y-2">
                  {myTeam.players.map((player, i) => (
                    <motion.div key={player.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="glass rounded-lg p-2.5 flex items-center gap-2.5">
                      <span className="text-lg font-black text-foreground w-8 shrink-0">{player.rating}</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${posColors[player.position]}`}>{player.position}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{player.name}</p>
                        <p className="text-xs text-muted-foreground">{player.club}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </div>
            <div className="flex gap-3 mt-4">
              <NeonButton variant="blue" className="flex-1" onClick={handleDownload}>📥 Download</NeonButton>
              <NeonButton variant="green" className="flex-1" onClick={handleWhatsApp}>📤 WhatsApp</NeonButton>
            </div>
          </motion.div>
        )}

        {otherTeams.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-foreground mb-3 mt-4">Other Squads</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherTeams.map((team, i) => (
                <motion.div key={team.userId} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.15 }}>
                  <GlassCard className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{team.avatar}</span>
                      <div>
                        <p className="font-bold text-foreground text-sm">{team.teamName}</p>
                        <p className="text-xs text-muted-foreground">Rating {team.rating} · Chem {team.chemistry}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {team.players.map((player) => (
                        <div key={player.id} className="flex items-center gap-2 text-xs">
                          <span className={`font-bold px-1 py-0.5 rounded ${posColors[player.position]}`}>{player.position}</span>
                          <span className="text-foreground font-semibold truncate flex-1">{player.name}</span>
                          <span className="text-muted-foreground shrink-0">{player.rating}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </>
        )}

        <motion.div className="text-center mt-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <NeonButton variant="blue" size="lg" onClick={() => navigate("/lobby")}>
            🏠 Play Again
          </NeonButton>
        </motion.div>
      </div>
    </div>
  );
}
