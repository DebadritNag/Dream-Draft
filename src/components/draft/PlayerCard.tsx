import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PlayerCardProps {
  player: { id: string; name: string; position: string; rating: number; club: string; image?: string | null };
  onClick?: () => void;
  compact?: boolean;
  selected?: boolean;
}

const positionColors: Record<string, string> = {
  GK: "bg-amber-500/80",
  DEF: "bg-emerald-500/80",
  MID: "bg-sky-500/80",
  FWD: "bg-rose-500/80",
};

const PlayerCard = ({ player, onClick, compact = false, selected = false }: PlayerCardProps) => {
  return (
    <motion.div
      layout
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "glass rounded-lg cursor-pointer transition-all duration-200 group",
        selected && "ring-2 ring-primary glow-blue",
        compact ? "p-3" : "p-4"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Rating */}
        <div className="flex flex-col items-center">
          <span className={cn("font-black text-foreground", compact ? "text-xl" : "text-2xl")}>
            {player.rating}
          </span>
          <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded", positionColors[player.position])}>
            {player.position}
          </span>
        </div>

        {/* Avatar placeholder */}
        <div className={cn(
          "rounded-lg bg-muted flex items-center justify-center text-muted-foreground",
          compact ? "w-10 h-10 text-lg" : "w-14 h-14 text-2xl"
        )}>
          ⚽
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={cn("font-bold text-foreground truncate", compact ? "text-sm" : "text-base")}>
            {player.name}
          </p>
          <p className="text-xs text-muted-foreground">{player.club}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default PlayerCard;
