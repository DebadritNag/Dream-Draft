import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Music, VolumeX, Volume2 } from "lucide-react";
import { useAudio } from "@/contexts/AudioContext";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { isMusicOn, isMuted, volume, currentTrackName, setMusicOn, setMuted, setVolume } = useAudio();

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: "#0B1120", boxShadow: "0 0 60px rgba(99,102,241,0.2)" }}>

            {/* Accent bar */}
            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6)" }} />

            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-black text-lg">⚙️ Settings</h2>
                <button onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Music toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-blue-400" />
                    <span className="text-white text-sm font-semibold">Background Music</span>
                  </div>
                  <Toggle value={isMusicOn} onChange={setMusicOn} color="#3b82f6" />
                </div>

                {/* Mute toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <VolumeX className="w-4 h-4 text-rose-400" />
                    <span className="text-white text-sm font-semibold">Mute All</span>
                  </div>
                  <Toggle value={isMuted} onChange={setMuted} color="#ef4444" />
                </div>

                {/* Volume slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-white text-sm font-semibold">Volume</span>
                    </div>
                    <span className="text-white/40 text-xs font-mono">{volume}%</span>
                  </div>
                  <div className="relative h-2 rounded-full bg-white/10">
                    <div className="absolute left-0 top-0 h-full rounded-full transition-all"
                      style={{ width: `${isMuted ? 0 : volume}%`, background: "linear-gradient(90deg, #10b981, #34d399)" }} />
                    <input type="range" min={0} max={100} value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      disabled={isMuted}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed h-2" />
                  </div>
                </div>

                {/* Now playing */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/8">
                  <p className="text-white/30 text-xs uppercase tracking-widest mb-1">Now Playing</p>
                  <p className="text-white font-bold text-sm truncate">🎵 {currentTrackName}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Toggle({ value, onChange, color }: { value: boolean; onChange: (v: boolean) => void; color: string }) {
  return (
    <button onClick={() => onChange(!value)}
      className="relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none"
      style={{ background: value ? color : "rgba(255,255,255,0.1)" }}>
      <motion.div
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
        animate={{ left: value ? "calc(100% - 22px)" : "2px" }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }} />
    </button>
  );
}
