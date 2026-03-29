import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Music, VolumeX, Volume2 } from "lucide-react";
import { useAudio } from "@/contexts/AudioContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/70 text-sm font-semibold">{label}</span>
      <button onClick={onToggle}
        className="relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none"
        style={{ background: on ? "linear-gradient(135deg, #3b82f6, #6366f1)" : "rgba(255,255,255,0.1)" }}>
        <motion.div
          animate={{ x: on ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md" />
      </button>
    </div>
  );
}

export function SettingsModal({ open, onClose }: Props) {
  const { isPlaying, isMuted, volume, currentTrackName, toggle, toggleMute, setVolume } = useAudio();

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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}>

          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: "rgba(11,17,32,0.95)", backdropFilter: "blur(24px)", boxShadow: "0 0 60px rgba(99,102,241,0.15)" }}>

            {/* Top accent */}
            <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)" }} />

            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-black text-lg tracking-tight">⚙️ Settings</h2>
                <button onClick={onClose}
                  className="w-7 h-7 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Music toggle */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/8 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Music className="w-4 h-4 text-indigo-400" />
                    <span className="text-white/50 text-xs uppercase tracking-widest font-semibold">Music</span>
                  </div>
                  <Toggle on={isPlaying} onToggle={toggle} label="Background Music" />
                  <Toggle on={!isMuted} onToggle={toggleMute} label="Sound Effects" />
                </div>

                {/* Volume */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/8">
                  <div className="flex items-center gap-2 mb-3">
                    {isMuted || volume === 0
                      ? <VolumeX className="w-4 h-4 text-white/30" />
                      : <Volume2 className="w-4 h-4 text-indigo-400" />}
                    <span className="text-white/50 text-xs uppercase tracking-widest font-semibold">Volume</span>
                    <span className="ml-auto text-white/60 text-sm font-black tabular-nums">{volume}%</span>
                  </div>
                  <div className="relative h-2 rounded-full bg-white/10">
                    <div className="absolute left-0 top-0 h-full rounded-full transition-all"
                      style={{ width: `${isMuted ? 0 : volume}%`, background: "linear-gradient(90deg, #3b82f6, #8b5cf6)" }} />
                    <input type="range" min={0} max={100} value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer h-2" />
                    {/* Thumb */}
                    <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-indigo-500 pointer-events-none transition-all"
                      style={{ left: `calc(${isMuted ? 0 : volume}% - 8px)`, boxShadow: "0 0 8px rgba(99,102,241,0.6)" }} />
                  </div>
                </div>

                {/* Now playing */}
                {currentTrackName && (
                  <div className="p-3 rounded-xl bg-indigo-500/8 border border-indigo-500/20 flex items-center gap-3">
                    <motion.div animate={{ rotate: isPlaying ? 360 : 0 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 text-sm">
                      🎵
                    </motion.div>
                    <div className="min-w-0">
                      <p className="text-white/30 text-xs uppercase tracking-widest">Now Playing</p>
                      <p className="text-white/80 text-sm font-semibold truncate">{currentTrackName}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isPlaying ? "bg-emerald-400" : "bg-white/20"}`} />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button onClick={onClick}
      whileHover={{ scale: 1.1, rotate: 30 }} whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className="fixed top-4 right-14 z-50 w-9 h-9 rounded-full flex items-center justify-center border border-white/15 bg-white/10 backdrop-blur-sm text-base hover:bg-white/20 transition-colors"
      title="Settings">
      ⚙️
    </motion.button>
  );
}
