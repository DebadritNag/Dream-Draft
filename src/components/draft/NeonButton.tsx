import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "blue" | "purple" | "green";
  size?: "sm" | "md" | "lg";
}

const NeonButton = ({ className, variant = "blue", size = "md", children, ...props }: NeonButtonProps) => {
  const variantStyles = {
    blue: "bg-primary hover:bg-primary/80 glow-blue text-primary-foreground",
    purple: "bg-secondary hover:bg-secondary/80 glow-purple text-secondary-foreground",
    green: "bg-accent hover:bg-accent/80 glow-green text-accent-foreground",
  };

  const sizeStyles = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "rounded-lg font-semibold transition-all duration-200",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
};

export default NeonButton;
