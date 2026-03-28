import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Shield, Shuffle, ArrowRight, ArrowLeft, Clock } from "lucide-react";
import teamBg from "@/data/team.png";

interface RoomConfig {
  maxPlayers: number;
  picksPerUser: number;
  draftFormat: "snake" | "linear";
}

interface RoomSetupProps {
  onConfirm: (config: RoomConfig) => void;
  onBack: () => void;
  loading?: boolean;
}

const MAX_PLAYER_OPTIONS = [2, 3, 4, 6, 8];

const DRAFT_FORMATS = [
  {
    id: "snake" as const,
    icon: "🐍",
    title: "Snake Draft",
    desc: "Order reverses each round. Fairer for all positions.",
  },
  {
    id: "linear" as const,
    icon: "➡️",
    title: "Linear Draft",
    desc: "Same order every round. First pick always picks first.",
  },
];

function AnimatedNumber({ value }: { value: number }) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={value}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="inline-block tabular-nums">
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

const RoomSetup = ({ onConfirm, onBack, loading }: RoomSetupProps) => {
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [picksPerUser, setPicksPerUser] = useState(11);
  const [draftFormat, setDraftFormat] = useState<"snake" | "linear">("snake");

  const totalPicks = maxPlayers * picksPerUser;
  const estimatedMinutes = Math.round((totalPicks * 30) / 60);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${teamBg})`, transform: "scale(1.05)" }} />
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/70" />
      <div className="absolute w-[500px] h-[500px] bg-indigo-500/10 blur-3xl rounded-full pointer-events-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />

      <motion.div className="relative z-10 w-full max-w-5xl"
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ background: "linear-gradient(135deg, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Room Setup
          </h1>
          <p className="text-white/40 text-sm uppercase tracking-widest mt-1">Configure your draft session</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT: Config panels (2/3) ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Max Players */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <Users className="w-4 h-4 text-blue-400" />
                <h2 className="font-bold text-white text-sm uppercase tracking-widest">Max Players</h2>
              </div>
              <div className="flex gap-3 flex-wrap">
                {MAX_PLAYER_OPTIONS.map((n) => (
                  <motion.button key={n} onClick={() => setMaxPlayers(n)}
                    whileHover={{ scale: 1.08, y: -2 }} whileTap={{ scale: 0.95 }}
                    className="relative px-5 py-2.5 rounded-xl font-black text-sm transition-all duration-200"
                    style={maxPlayers === n ? {
                      background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                      boxShadow: "0 0 20px rgba(99,102,241,0.5)",
                      color: "white",
                    } : {
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.5)",
                    }}>
                    {n}
                    {maxPlayers === n && (
                      <motion.div className="absolute inset-0 rounded-xl"
                        layoutId="playerPill"
                        style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)", zIndex: -1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Players Per Squad */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <h2 className="font-bold text-white text-sm uppercase tracking-widest">Players Per Squad</h2>
                </div>
                <motion.div
                  className="text-3xl font-black text-white tabular-nums"
                  style={{ textShadow: "0 0 20px rgba(16,185,129,0.6)" }}>
                  <AnimatedNumber value={picksPerUser} />
                </motion.div>
              </div>
              <div className="relative px-2">
                {/* Track */}
                <div className="relative h-2 rounded-full bg-white/10">
                  <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-150"
                    style={{
                      width: `${((picksPerUser - 11) / (25 - 11)) * 100}%`,
                      background: "linear-gradient(90deg, #10b981, #34d399)",
                      boxShadow: "0 0 10px rgba(16,185,129,0.5)",
                    }} />
                </div>
                <input type="range" min={11} max={25} value={picksPerUser}
                  onChange={(e) => setPicksPerUser(Number(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
                  style={{ top: 0 }} />
                {/* Custom thumb */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-emerald-400 bg-[#060810] pointer-events-none"
                  style={{
                    left: `calc(${((picksPerUser - 11) / (25 - 11)) * 100}% - 10px)`,
                    boxShadow: "0 0 12px rgba(16,185,129,0.7)",
                  }}
                  layout transition={{ type: "spring", stiffness: 300, damping: 30 }} />
              </div>
              <div className="flex justify-between text-xs text-white/30 mt-4 px-1">
                <span>11</span><span>18</span><span>25</span>
              </div>
            </div>

            {/* Draft Format */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <Shuffle className="w-4 h-4 text-purple-400" />
                <h2 className="font-bold text-white text-sm uppercase tracking-widest">Draft Format</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {DRAFT_FORMATS.map((f) => (
                  <motion.button key={f.id} onClick={() => setDraftFormat(f.id)}
                    whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                    className="p-4 rounded-xl text-left transition-all duration-200 relative overflow-hidden"
                    style={draftFormat === f.id ? {
                      border: "1px solid rgba(99,102,241,0.6)",
                      background: "rgba(99,102,241,0.12)",
                      boxShadow: "0 0 20px rgba(99,102,241,0.2)",
                    } : {
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
                    }}>
                    {draftFormat === f.id && (
                      <motion.div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-400"
                        animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }} />
                    )}
                    <span className="text-2xl block mb-2">{f.icon}</span>
                    <p className="font-bold text-white text-sm mb-1">{f.title}</p>
                    <p className="text-white/40 text-xs leading-relaxed">{f.desc}</p>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Live Summary (1/3) ── */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 flex-1"
              style={{ boxShadow: "0 0 40px rgba(99,102,241,0.08)" }}>
              <h2 className="font-bold text-white text-sm uppercase tracking-widest mb-6">Room Summary</h2>

              <div className="space-y-5">
                {[
                  { label: "Players", value: maxPlayers, icon: "👥", color: "#60a5fa" },
                  { label: "Squad Size", value: picksPerUser, icon: "🏆", color: "#34d399" },
                  { label: "Total Picks", value: totalPicks, icon: "⚽", color: "#a78bfa" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-white/50 text-sm">{item.label}</span>
                    </div>
                    <span className="font-black text-xl" style={{ color: item.color, textShadow: `0 0 12px ${item.color}60` }}>
                      <AnimatedNumber value={item.value} />
                    </span>
                  </div>
                ))}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shuffle className="w-4 h-4 text-white/30" />
                    <span className="text-white/50 text-sm">Format</span>
                  </div>
                  <span className="font-bold text-white text-sm">
                    {draftFormat === "snake" ? "🐍 Snake" : "➡️ Linear"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-white/30" />
                    <span className="text-white/50 text-sm">Est. Time</span>
                  </div>
                  <span className="font-bold text-amber-400 text-sm">
                    ~<AnimatedNumber value={estimatedMinutes} /> min
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="my-6 h-px bg-white/10" />

              {/* Actions */}
              <div className="space-y-3">
                <motion.button
                  onClick={() => onConfirm({ maxPlayers, picksPerUser, draftFormat })}
                  disabled={loading}
                  whileHover={{ scale: 1.03, boxShadow: "0 0 30px rgba(16,185,129,0.5)" }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-3.5 rounded-xl font-black text-sm text-white relative overflow-hidden disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 0 20px rgba(16,185,129,0.3)" }}>
                  {!loading && (
                    <motion.div className="absolute inset-0 bg-white/10 pointer-events-none"
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
                      style={{ skewX: "-20deg" }} />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? "Creating..." : <><span>Create Room</span><ArrowRight className="w-4 h-4" /></>}
                  </span>
                </motion.button>

                <motion.button onClick={onBack} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white/50 hover:text-white/80 flex items-center justify-center gap-2 transition-colors border border-white/10 hover:border-white/20">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RoomSetup;
