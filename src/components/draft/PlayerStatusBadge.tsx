import { motion, AnimatePresence } from "framer-motion";

interface PlayerStatusBadgeProps {
  name: string;
  submitted: boolean;
  avatar: string;
}

const PlayerStatusBadge = ({ name, submitted, avatar }: PlayerStatusBadgeProps) => {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <div className="w-10 h-10 rounded-full glass flex items-center justify-center text-lg">
          {avatar}
        </div>
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="check"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center text-xs"
            >
              ✓
            </motion.div>
          ) : (
            <motion.div
              key="pending"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-muted flex items-center justify-center"
            >
              <motion.div
                className="w-2 h-2 rounded-full bg-muted-foreground"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <span className="text-xs text-muted-foreground">{name}</span>
    </div>
  );
};

export default PlayerStatusBadge;
