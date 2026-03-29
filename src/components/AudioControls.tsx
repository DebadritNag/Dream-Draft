import { motion, AnimatePresence } from "framer-motion";
import { useAudio } from "@/contexts/AudioContext";

export function AudioToggleButton() {
  const { isPlaying, toggle } = useAudio();
  return (
    <motion.button
      onClick={toggle}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed top-4 right-4 z-50 w-9 h-9 rounded-full flex items-center justify-center border border-white/15 bg-white/10 backdrop-blur-sm text-base transition-colors hover:bg-white/20"
      title={isPlaying ? "Mute music" : "Play music"}>
      {isPlaying ? "🔊" : "🔇"}
    </motion.button>
  );
}

export function NowPlayingToast() {
  const { nowPlayingToast } = useAudio();
  return (
    <AnimatePresence>
      {nowPlayingToast && (
        <motion.div
          key={nowPlayingToast}
          initial={{ opacity: 0, y: -12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-black/70 backdrop-blur-xl text-white/80 text-xs font-semibold shadow-lg pointer-events-none">
          <span className="animate-pulse">🎵</span>
          <span>Now Playing: {nowPlayingToast}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
