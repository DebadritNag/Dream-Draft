import { motion, AnimatePresence } from "framer-motion";
import { useAudio } from "@/contexts/AudioContext";

export default function NowPlayingToast() {
  const { nowPlayingToast } = useAudio();

  return (
    <AnimatePresence>
      {nowPlayingToast && (
        <motion.div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/15 backdrop-blur-xl"
          style={{ background: "rgba(11,17,32,0.9)", boxShadow: "0 0 20px rgba(99,102,241,0.3)" }}
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}>
          <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 0.5, repeat: 2 }}>🎵</motion.span>
          <span className="text-white text-xs font-semibold">Now Playing: <span className="text-blue-300">{nowPlayingToast}</span></span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
