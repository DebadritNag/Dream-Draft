import { useState } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/draft/GlassCard";
import NeonButton from "@/components/draft/NeonButton";
import { Users, Trophy, Shuffle, ArrowRight } from "lucide-react";

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

const RoomSetup = ({ onConfirm, onBack, loading }: RoomSetupProps) => {
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [picksPerUser, setPicksPerUser] = useState(11);
  const [draftFormat, setDraftFormat] = useState<"snake" | "linear">("snake");

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <motion.div className="w-full max-w-lg space-y-6"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        <div className="text-center">
          <h1 className="text-3xl font-black text-foreground neon-text-blue mb-1">Room Setup</h1>
          <p className="text-muted-foreground text-sm">Configure your draft room</p>
        </div>

        {/* Max Players */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Max Players</h2>
          </div>
          <div className="flex gap-3">
            {[2, 3, 4, 6, 8].map((n) => (
              <button key={n} onClick={() => setMaxPlayers(n)}
                className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${
                  maxPlayers === n
                    ? "bg-primary text-primary-foreground shadow-lg scale-105"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}>
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Up to {maxPlayers} players can join this room</p>
        </GlassCard>

        {/* Picks Per Squad */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-5 h-5 text-accent" />
            <h2 className="font-bold text-foreground">Players Per Squad</h2>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range" min={11} max={25} value={picksPerUser}
              onChange={(e) => setPicksPerUser(Number(e.target.value))}
              className="flex-1 accent-accent h-2 cursor-pointer"
            />
            <span className="text-2xl font-black text-foreground w-8 text-center">{picksPerUser}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>11</span>
            <span>18</span>
            <span>25</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Each manager picks {picksPerUser} players · {maxPlayers * picksPerUser} total picks
          </p>
        </GlassCard>

        {/* Draft Format */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Shuffle className="w-5 h-5 text-secondary" />
            <h2 className="font-bold text-foreground">Draft Format</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setDraftFormat("snake")}
              className={`p-4 rounded-lg text-left transition-all border-2 ${
                draftFormat === "snake"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted/30 hover:bg-muted/50"
              }`}>
              <p className="font-bold text-foreground text-sm mb-1">🐍 Snake</p>
              <p className="text-xs text-muted-foreground">Order reverses each round. Fairer for all positions.</p>
            </button>
            <button onClick={() => setDraftFormat("linear")}
              className={`p-4 rounded-lg text-left transition-all border-2 ${
                draftFormat === "linear"
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted/30 hover:bg-muted/50"
              }`}>
              <p className="font-bold text-foreground text-sm mb-1">➡️ Linear</p>
              <p className="text-xs text-muted-foreground">Same order every round. First pick always picks first.</p>
            </button>
          </div>
        </GlassCard>

        {/* Summary */}
        <GlassCard className="p-4 bg-muted/20">
          <p className="text-sm text-center text-muted-foreground">
            <span className="text-foreground font-semibold">{maxPlayers} players</span> ·{" "}
            <span className="text-foreground font-semibold">{picksPerUser} picks each</span> ·{" "}
            <span className="text-foreground font-semibold">{draftFormat === "snake" ? "🐍 Snake" : "➡️ Linear"} draft</span>
          </p>
        </GlassCard>

        <div className="flex gap-3">
          <NeonButton variant="purple" className="flex-1" onClick={onBack} disabled={loading}>
            ← Back
          </NeonButton>
          <NeonButton variant="green" className="flex-1" onClick={() => onConfirm({ maxPlayers, picksPerUser, draftFormat })} disabled={loading}>
            {loading ? "Creating..." : <>Create Room <ArrowRight className="w-4 h-4 ml-1 inline" /></>}
          </NeonButton>
        </div>
      </motion.div>
    </div>
  );
};

export default RoomSetup;
