import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, SkipForward, RotateCcw } from "lucide-react";
import introVideo from "@/data/video/intro.mp4";

const Index = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showButton, setShowButton] = useState(false);

  // Show button with slight delay after video ends
  useEffect(() => {
    if (videoEnded) {
      const t = setTimeout(() => setShowButton(true), 400);
      return () => clearTimeout(t);
    }
  }, [videoEnded]);

  const handleSkip = () => {
    if (videoRef.current) videoRef.current.pause();
    setVideoEnded(true);
  };

  const handleReplay = () => {
    setVideoEnded(false);
    setShowButton(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  const toggleMute = () => {
    setMuted((m) => {
      if (videoRef.current) videoRef.current.muted = !m;
      return !m;
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">

      {/* Video */}
      <video
        ref={videoRef}
        src={introVideo}
        autoPlay
        muted
        playsInline
        onEnded={() => setVideoEnded(true)}
        className="absolute inset-0 w-full h-full object-cover scale-105"
        style={{ animation: "slowZoom 20s ease-in-out infinite alternate" }}
      />

      {/* Dark + gradient overlay */}
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

      {/* Top-right controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
        <button onClick={toggleMute}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all text-white">
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        {!videoEnded && (
          <button onClick={handleSkip}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all text-white text-xs font-semibold">
            <SkipForward className="w-3.5 h-3.5" />
            Skip
          </button>
        )}
        {videoEnded && (
          <button onClick={handleReplay}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all text-white text-xs font-semibold">
            <RotateCcw className="w-3.5 h-3.5" />
            Replay
          </button>
        )}
      </div>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4">

        {/* Get Started button — appears after video ends */}
        <AnimatePresence>
          {showButton && (
            <motion.div className="flex flex-col sm:flex-row gap-4 items-center"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5, type: "spring", damping: 15 }}>
              <motion.button
                onClick={() => navigate("/auth?mode=signup")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="px-10 py-4 rounded-full font-black text-lg text-white relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                  boxShadow: "0 0 30px rgba(59,130,246,0.6), 0 0 60px rgba(139,92,246,0.3)",
                }}>
                <span className="relative z-10">🚀 Get Started</span>
                <motion.div className="absolute inset-0 bg-white/10"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  style={{ skewX: "-20deg" }} />
              </motion.button>

              <motion.button
                onClick={() => navigate("/auth?mode=signin")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-4 rounded-full font-bold text-base text-white border border-white/30 backdrop-blur-sm bg-white/10 hover:bg-white/20 transition-colors">
                Sign In
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Slow zoom keyframe */}
      <style>{`
        @keyframes slowZoom {
          from { transform: scale(1.05); }
          to   { transform: scale(1.12); }
        }
      `}</style>
    </div>
  );
};

export default Index;
