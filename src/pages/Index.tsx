import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import NeonButton from "@/components/draft/NeonButton";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full opacity-10 blur-3xl"
          style={{
            width: 200 + i * 100,
            height: 200 + i * 100,
            background: i % 3 === 0
              ? "hsl(217, 91%, 60%)"
              : i % 3 === 1
              ? "hsl(263, 70%, 58%)"
              : "hsl(160, 84%, 39%)",
            left: `${5 + i * 22}%`,
            top: `${20 + i * 10}%`,
          }}
          animate={{ y: [0, -40, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 5 + i * 2, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      <motion.div
        className="text-center z-10 space-y-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="text-7xl md:text-8xl"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          ⚽
        </motion.div>
        <h1 className="text-5xl md:text-7xl font-black text-foreground neon-text-blue">
          Fantasy Draft
        </h1>
        <p className="text-xl text-muted-foreground max-w-md mx-auto">
          Real-time multiplayer fantasy soccer drafting with trivia-based draft order
        </p>
        <div className="flex flex-wrap gap-4 justify-center pt-4">
          <NeonButton variant="blue" size="lg" onClick={() => navigate("/auth")}>
            Get Started
          </NeonButton>
          <NeonButton variant="purple" size="lg" onClick={() => navigate("/lobby")}>
            Join Room
          </NeonButton>
        </div>
      </motion.div>
    </div>
  );
};

export default Index;
