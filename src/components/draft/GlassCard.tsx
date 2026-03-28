import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  glow?: "blue" | "purple" | "green" | "none";
  strong?: boolean;
}

const GlassCard = ({ className, glow = "none", strong = false, children, ...props }: GlassCardProps) => {
  const glowClass = {
    blue: "glow-blue",
    purple: "glow-purple",
    green: "glow-green",
    none: "",
  }[glow];

  return (
    <motion.div
      className={cn(
        strong ? "glass-strong" : "glass",
        "rounded-lg",
        glowClass,
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
