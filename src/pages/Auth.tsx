import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import GlassCard from "@/components/draft/GlassCard";
import NeonButton from "@/components/draft/NeonButton";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return;
    setLoading(true);

    if (isSignUp) {
      if (!displayName) { toast.error("Enter a display name"); setLoading(false); return; }
      const { error } = await signUp(email, password, displayName);
      if (error) { toast.error(error); setLoading(false); return; }
      toast.success("Account created! Check your email to confirm.");
    } else {
      const { error } = await signIn(email, password);
      if (error) { toast.error(error); setLoading(false); return; }
      navigate("/lobby");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4 relative overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full opacity-20 blur-3xl"
          style={{
            width: 100 + i * 60, height: 100 + i * 60,
            background: i % 2 === 0 ? "hsl(217, 91%, 60%)" : "hsl(263, 70%, 58%)",
            left: `${10 + i * 18}%`, top: `${15 + i * 12}%`,
          }}
          animate={{ y: [0, -30, 0], x: [0, 15, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      <GlassCard
        strong glow="purple"
        className="w-full max-w-md p-8 z-10"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="text-center mb-8">
          <motion.h1
            className="text-4xl font-black text-foreground neon-text-blue mb-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            ⚽ Fantasy Draft
          </motion.h1>
          <p className="text-muted-foreground">{isSignUp ? "Create your account" : "Enter the arena"}</p>
        </div>

        <div className="space-y-4">
          {isSignUp && (
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Display Name</label>
              <Input
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-muted/50 border-border"
              />
            </div>
          )}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Email</label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-muted/50 border-border"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="bg-muted/50 border-border"
            />
          </div>

          <NeonButton
            variant="blue" size="lg"
            className="w-full mt-6"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "..." : isSignUp ? "Create Account" : "Sign In"}
          </NeonButton>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <span
              className="text-primary cursor-pointer hover:underline"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </span>
          </p>
        </div>
      </GlassCard>
    </div>
  );
};

export default Auth;
