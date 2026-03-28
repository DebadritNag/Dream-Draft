import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Edit2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import teamBg from "@/data/team.png";

const AVATARS = ["⚡", "😈", "⭐", "🦁", "🔥", "🐉", "🦅", "🌊", "🎯", "💎", "🏆", "⚔️"];

interface Stats {
  roomsCreated: number;
  draftsPlayed: number;
  triviaPlayed: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState("⚽");
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Stats>({ roomsCreated: 0, draftsPlayed: 0, triviaPlayed: 0 });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: profile } = await supabase
        .from("user_profiles").select("display_name, avatar").eq("id", user.id).single();
      if (profile) {
        setDisplayName(profile.display_name);
        setAvatar(profile.avatar ?? "⚽");
        setEditName(profile.display_name);
        setEditAvatar(profile.avatar ?? "⚽");
      }

      const [roomsRes, draftsRes, triviaRes] = await Promise.all([
        supabase.from("rooms").select("id", { count: "exact" }).eq("host_id", user.id),
        supabase.from("draft_picks").select("room_id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("trivia_responses").select("id", { count: "exact" }).eq("user_id", user.id),
      ]);
      setStats({
        roomsCreated: roomsRes.count ?? 0,
        draftsPlayed: draftsRes.count ?? 0,
        triviaPlayed: triviaRes.count ?? 0,
      });
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user || !editName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("user_profiles").update({
      display_name: editName.trim(),
      avatar: editAvatar,
    }).eq("id", user.id);
    if (error) { toast.error("Failed to save"); setSaving(false); return; }
    setDisplayName(editName.trim());
    setAvatar(editAvatar);
    setEditing(false);
    setSaving(false);
    toast.success("Profile updated!");
  };

  const statCards = [
    { label: "Rooms Created", value: stats.roomsCreated, icon: "🏠", color: "#60a5fa" },
    { label: "Draft Picks",   value: stats.draftsPlayed, icon: "⚽", color: "#34d399" },
    { label: "Trivia Answers",value: stats.triviaPlayed, icon: "🧠", color: "#a78bfa" },
    { label: "Win Rate",      value: "—",                icon: "🏆", color: "#fbbf24" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#060810]">

      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{ backgroundImage: `url(${teamBg})`, transform: "scale(1.05)" }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90" />
      <div className="absolute w-[500px] h-[500px] bg-indigo-500/10 blur-3xl rounded-full pointer-events-none left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10 max-w-xl mx-auto px-4 py-8">

        {/* Header */}
        <motion.div className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <motion.button onClick={() => navigate("/lobby")}
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl text-white/60 hover:text-white text-sm font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </motion.button>
          <span className="text-white/30 text-xs uppercase tracking-widest font-semibold">Player Profile</span>
          <motion.button onClick={() => setEditing((v) => !v)}
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl text-white/60 hover:text-white text-sm font-semibold transition-colors">
            <Edit2 className="w-4 h-4" /> Edit
          </motion.button>
        </motion.div>

        {/* Hero */}
        <motion.div className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <motion.div
            className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-5xl border-2 border-indigo-500/50 bg-white/5 backdrop-blur-xl mb-4 cursor-pointer"
            style={{ boxShadow: "0 0 30px rgba(99,102,241,0.4), 0 0 60px rgba(99,102,241,0.15)" }}
            whileHover={{ scale: 1.08, boxShadow: "0 0 40px rgba(99,102,241,0.6)" }}
            whileTap={{ scale: 0.95 }}>
            {avatar}
          </motion.div>
          <h1 className="text-2xl font-black text-white mb-1">{displayName || user?.email?.split("@")[0]}</h1>
          <p className="text-white/40 text-sm uppercase tracking-widest">Draft Manager</p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-emerald-400 text-xs font-semibold">Online</span>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div className="grid grid-cols-2 gap-3 mb-6"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {statCards.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.07 }}
              whileHover={{ scale: 1.03, y: -2 }}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 flex items-center gap-3"
              style={{ boxShadow: `0 0 0 0 ${s.color}` }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 0 20px ${s.color}25`)}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}>
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wide">{s.label}</p>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Edit Panel */}
        {editing && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 mb-6"
            style={{ boxShadow: "0 0 40px rgba(99,102,241,0.1)" }}>
            <h2 className="text-white font-bold text-sm uppercase tracking-widest mb-5">Edit Profile</h2>

            {/* Name input */}
            <div className="mb-5">
              <label className="text-xs text-white/40 uppercase tracking-widest mb-2 block">Display Name</label>
              <div className="relative group">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
                />
                <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"
                  style={{ boxShadow: "0 0 0 1px rgba(99,102,241,0.5), 0 0 16px rgba(99,102,241,0.12)" }} />
              </div>
            </div>

            {/* Avatar picker */}
            <div className="mb-6">
              <label className="text-xs text-white/40 uppercase tracking-widest mb-3 block">Choose Avatar</label>
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map((a) => (
                  <motion.button key={a} onClick={() => setEditAvatar(a)}
                    whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                    className="w-full aspect-square rounded-xl flex items-center justify-center text-2xl transition-all"
                    style={editAvatar === a ? {
                      background: "rgba(99,102,241,0.2)",
                      border: "1px solid rgba(99,102,241,0.6)",
                      boxShadow: "0 0 12px rgba(99,102,241,0.3)",
                    } : {
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                    {a}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Save */}
            <motion.button onClick={handleSave} disabled={saving}
              whileHover={{ scale: 1.03, boxShadow: "0 0 30px rgba(16,185,129,0.5)" }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 rounded-xl font-black text-sm text-white relative overflow-hidden disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 0 20px rgba(16,185,129,0.3)" }}>
              {!saving && (
                <motion.div className="absolute inset-0 bg-white/10 pointer-events-none"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                  style={{ skewX: "-20deg" }} />
              )}
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Changes"}
              </span>
            </motion.button>
          </motion.div>
        )}

        {/* Email */}
        <motion.div className="text-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <p className="text-white/20 text-xs">{user?.email}</p>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
