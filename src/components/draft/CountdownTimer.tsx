import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface CountdownTimerProps {
  totalSeconds: number;
  onComplete?: () => void;
  size?: number;
  /** If provided, overrides local countdown with server-synced value */
  serverRemainingSeconds?: number;
}

const CountdownTimer = ({ totalSeconds, onComplete, size = 80, serverRemainingSeconds }: CountdownTimerProps) => {
  const [seconds, setSeconds] = useState(serverRemainingSeconds ?? totalSeconds);

  // Sync to server time when provided
  useEffect(() => {
    if (serverRemainingSeconds !== undefined) {
      setSeconds(serverRemainingSeconds);
    }
  }, [serverRemainingSeconds]);

  // Local countdown (used when no server sync)
  useEffect(() => {
    if (serverRemainingSeconds !== undefined) return; // server controls it
    setSeconds(totalSeconds);
  }, [totalSeconds, serverRemainingSeconds]);

  useEffect(() => {
    if (serverRemainingSeconds !== undefined) return;
    if (seconds <= 0) { onComplete?.(); return; }
    const timer = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [seconds, onComplete, serverRemainingSeconds]);

  useEffect(() => {
    if (serverRemainingSeconds === 0) onComplete?.();
  }, [serverRemainingSeconds, onComplete]);

  const progress = seconds / totalSeconds;
  const circumference = 2 * Math.PI * 35;
  const strokeDashoffset = circumference * (1 - Math.max(0, Math.min(1, progress)));

  const getColor = () => {
    if (progress > 0.6) return "hsl(160, 84%, 39%)";
    if (progress > 0.33) return "hsl(45, 93%, 47%)";
    return "hsl(0, 84%, 60%)";
  };

  const isUrgent = seconds <= 5;

  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      animate={isUrgent ? { scale: [1, 1.1, 1] } : {}}
      transition={isUrgent ? { repeat: Infinity, duration: 0.5 } : {}}
    >
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="35" fill="none" stroke="hsl(230, 15%, 20%)" strokeWidth="4" />
        <circle
          cx="40" cy="40" r="35"
          fill="none"
          stroke={getColor()}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 40 40)"
          style={{ transition: "stroke-dashoffset 0.5s linear, stroke 0.3s ease" }}
        />
      </svg>
      <span className="absolute text-xl font-bold" style={{ color: getColor() }}>
        {seconds}
      </span>
    </motion.div>
  );
};

export default CountdownTimer;
